import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConfigured } from "@/lib/db";
import { STRIPE_API_VERSION, stripeConfigured } from "@/lib/stripe";
import { stripeCustomerFor } from "@/lib/subscriptions";

/**
 * Stripe's Customer Portal — the real "manage my membership".
 *
 * WHY A PORTAL AND NOT OUR OWN SCREENS. Cancel, reactivate, change card,
 * download invoices, see what is coming: all of it is regulated-ish billing
 * UI that has to be right, and Stripe hosts a version that already is. The
 * EZAITASK build ships both — its own cancel/reactivate pages AND the portal
 * — and the portal is the part that needs no maintenance.
 *
 * WHAT THIS REPLACES, AND WHY IT MATTERED. The dashboard's Cancel button
 * called cancelPlan() in lib/account.ts, which edits localStorage and nothing
 * else. It cleared the plan on one device, told the person they had
 * cancelled, and left the Stripe subscription billing them every month. This
 * project's own notes call a cancel button that looks like it worked but does
 * not stop a charge the worst bug it could ship. It had shipped.
 *
 * No subscription, no portal: Stripe refuses a portal session for a customer
 * it has never billed, with an error that reads like a configuration fault.
 * Answer that here, in words, rather than passing it on.
 */

export const runtime = "nodejs";

export async function POST() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !stripeConfigured || !dbConfigured) {
    return NextResponse.json(
      {
        error: "not_configured",
        message: "Billing isn’t switched on yet, so there is nothing to manage.",
      },
      { status: 503 },
    );
  }

  const session = await auth();
  const userId = Number((session?.user as { id?: string } | undefined)?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const customerId = await stripeCustomerFor(userId);
  if (!customerId) {
    return NextResponse.json(
      {
        error: "no_customer",
        message:
          "You don’t have a paid membership yet, so there is nothing to manage. Nothing is being charged.",
      },
      { status: 400 },
    );
  }

  /* Back to the dashboard, on the host they are actually using. Derived from
     the request rather than a constant: www and the apex have swapped roles
     once already on this project, and a hard-coded return URL would strand
     whoever is on the other one. */
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://lovevalues.com";

  const body = new URLSearchParams({
    customer: customerId,
    return_url: `${origin}/dashboard`,
  });

  try {
    const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": STRIPE_API_VERSION,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json()) as {
      url?: string;
      error?: { message?: string };
    };
    if (!res.ok || !data.url) {
      console.error("stripe portal rejected", data.error?.message);
      return NextResponse.json(
        {
          error: "stripe_error",
          /* Stripe's own message is usually actionable here — the commonest
             is that the portal has never been configured in the dashboard. */
          message:
            data.error?.message ??
            "We couldn’t open the billing portal. Please try again.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ url: data.url });
  } catch {
    return NextResponse.json(
      {
        error: "unreachable",
        message: "We couldn’t reach the payment provider. Nothing has changed.",
      },
      { status: 502 },
    );
  }
}
