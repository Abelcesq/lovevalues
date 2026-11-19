import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { verifyStripeSignature } from "@/lib/stripe";
import {
  grantReportCredit,
  mapStatus,
  periodEndFrom,
  upsertSubscription,
  userIdForStripe,
} from "@/lib/subscriptions";

/**
 * Stripe's webhook. This is how the app learns that anybody paid.
 *
 * Until this existed, a payment succeeded at Stripe and the app never heard
 * about it: /checkout redirected the browser back with ?paid=1 and the client
 * granted itself access. That is a URL anyone can type.
 *
 * FOUR RULES, AND EACH ONE IS LOAD-BEARING.
 *
 * 1. VERIFY FIRST, PARSE SECOND. The raw body text is what the signature
 *    covers. Parsing and re-serialising changes whitespace and key order and
 *    breaks the HMAC — the symptom is every event failing as if the secret
 *    were wrong. See lib/stripe.ts.
 *
 * 2. AN UNVERIFIED REQUEST IS NOT AN ERROR TO LOG AND CONTINUE. It is someone
 *    attempting to grant themselves a subscription for free. 400, nothing
 *    read, nothing written.
 *
 * 3. ANSWER 200 TO ANYTHING WE DO NOT HANDLE. Stripe retries non-2xx with
 *    backoff for days and eventually disables the endpoint. An event type we
 *    ignore is not a failure, and saying so keeps the endpoint healthy.
 *
 * 4. A FAILED WRITE MUST RETURN 500. That is the one case where a retry is
 *    exactly what we want — Stripe will send it again, and the subscription
 *    state catches up by itself.
 *
 * THE USER LINK comes from `client_reference_id`, set on the Checkout Session
 * from the server session. Never from the email: a payer can type a different
 * address into Stripe Checkout, and matching on it would attach their
 * subscription to someone else's account.
 */

export const runtime = "nodejs";
/* Never prerender or cache: this is a POST target with side effects. */
export const dynamic = "force-dynamic";

const str = (v: unknown): string | null =>
  typeof v === "string" && v ? v : null;

type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
};

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!secret) {
    /* Not configured. 503 rather than 200: this is our fault and Stripe
       retrying later is the correct behaviour once the secret is set. */
    console.error("stripe webhook: STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const raw = await request.text();
  const verified = verifyStripeSignature(
    raw,
    request.headers.get("stripe-signature"),
    secret,
  );
  if (!verified.ok) {
    console.warn("stripe webhook: rejected —", verified.reason);
    return NextResponse.json({ error: verified.reason }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  if (!dbConfigured) {
    console.error("stripe webhook: no database, cannot record", event.type);
    return NextResponse.json({ error: "no_database" }, { status: 503 });
  }

  const object = event.data?.object ?? {};

  try {
    switch (event.type) {
      /* The one event that establishes the link between a Stripe customer and
         one of our users. Everything afterwards is matched through it. */
      case "checkout.session.completed": {
        const userId = Number(str(object.client_reference_id));
        const customerId = str(object.customer);
        const subscriptionId = str(object.subscription);

        if (!Number.isInteger(userId) || userId <= 0) {
          /* Nothing to attach it to. Logged loudly because it means a
             Checkout Session was created without the reference — a bug in
             /api/checkout, not something a retry will fix. */
          console.error(
            "stripe webhook: checkout.session.completed with no usable client_reference_id",
            { customerId, subscriptionId },
          );
          break;
        }

        if (object.mode === "subscription") {
          await upsertSubscription({
            userId,
            plan: "monthly",
            /* Deliberately not 'active' yet. The subscription events that
               follow carry the real status, including a trial that has not
               converted. Guessing here would grant access Stripe has not. */
            status: "trialing",
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
          });
        } else {
          /* A one-off payment — the values report, or an update to it. THIS
             is where the entitlement is created, because this is the first
             moment anything can prove money changed hands. It used to be
             granted in the browser, where anyone could grant it to
             themselves.

             The kind is taken from the amount rather than guessed: a $29.99
             first report and a $9.99 update are different products and the
             row has to say which was bought, or it cannot be reconciled
             against Stripe later. */
          const total = num(object.amount_total);
          const kind = total !== null && total < 2000 ? "update" : "first";
          await upsertSubscription({ userId, stripeCustomerId: customerId });
          await grantReportCredit(userId, kind, str(object.id));
          console.info("stripe webhook: report credit granted", {
            userId,
            kind,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscriptionId = str(object.id);
        const customerId = str(object.customer);
        const userId = await userIdForStripe(subscriptionId, customerId);
        if (!userId) {
          /* Unknown subscription. Not an error worth retrying — it belongs to
             a Stripe object this app has never seen, e.g. one created by hand
             in the dashboard. */
          console.warn("stripe webhook: no user for subscription", {
            subscriptionId,
            customerId,
          });
          break;
        }

        await upsertSubscription({
          userId,
          plan: "monthly",
          status:
            event.type === "customer.subscription.deleted"
              ? "canceled"
              : mapStatus(str(object.status) ?? undefined),
          currentPeriodEnd: periodEndFrom(object),
          /* Mirrored from Stripe rather than inferred from our own cancel
             action, so the billing page can say "ends on the 14th, reactivate
             before then" even when the cancellation happened in Stripe's
             portal and this app never saw it. */
          cancelAtPeriodEnd: object.cancel_at_period_end === true,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        });
        break;
      }

      case "invoice.payment_failed": {
        const customerId = str(object.customer);
        const subscriptionId = str(object.subscription);
        const userId = await userIdForStripe(subscriptionId, customerId);
        if (userId) await upsertSubscription({ userId, status: "past_due" });
        break;
      }

      default:
        /* Rule 3. Not handled is not failed. */
        break;
    }
  } catch (error) {
    /* Rule 4. Stripe will send it again, and the state catches up. */
    console.error("stripe webhook: write failed", event.type, error);
    return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
