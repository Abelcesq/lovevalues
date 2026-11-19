/**
 * Subscription state, written by the Stripe webhook and read by the app.
 *
 * STRIPE IS THE SOURCE OF TRUTH, NOT THIS TABLE. Everything here is a local
 * cache of what Stripe already decided, so that a page can answer "is this
 * person a member" without a network call. When the two disagree, Stripe is
 * right and this is stale — which is why every write is an upsert keyed on
 * the user, and why nothing in the app may change a status except by way of
 * an event that arrived from Stripe.
 */

import { pool } from "./db.ts";

/** Stripe's subscription statuses, mapped onto the five this app stores.
    Anything unrecognised becomes 'none', which grants nothing — the safe
    direction for a value we do not understand. */
export function mapStatus(stripeStatus: string | undefined): string {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "none";
  }
}

type SubscriptionPatch = {
  userId: number;
  plan?: string;
  status?: string;
  currentPeriodEnd?: Date | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  /** Mirrored from Stripe. See db/004. */
  cancelAtPeriodEnd?: boolean | null;
};

/**
 * Write what Stripe told us.
 *
 * COALESCE on every optional column: an event that carries only a status must
 * not blank out the customer id written by an earlier one. Stripe sends
 * partial pictures in a deliberate order, and a naive upsert loses whichever
 * fields the latest event happened not to mention.
 */
export async function upsertSubscription(p: SubscriptionPatch): Promise<void> {
  await pool.query(
    `INSERT INTO subscriptions
       ("userId", plan, status, current_period_end,
        stripe_customer_id, stripe_subscription_id, cancel_at_period_end, updated_at)
     VALUES ($1, COALESCE($2,'none'), COALESCE($3,'none'), $4, $5, $6, COALESCE($7,FALSE), NOW())
     ON CONFLICT ("userId") DO UPDATE SET
       /* THE PARAMETERS, NOT EXCLUDED, and the difference is a real bug that
          an end-to-end run caught. EXCLUDED holds what the INSERT would have
          written — and the INSERT coerces null to 'none' so the NOT NULL
          column is satisfied. So EXCLUDED.plan is never null, the COALESCE
          never falls through, and an event carrying only a status reset the
          plan to 'none'. An invoice.payment_failed wiped a live monthly
          subscription down to no plan at all.
          Referring to $2/$3 directly keeps the null a null, which is what
          "the event did not mention this field" actually means. */
       plan                   = COALESCE($2, subscriptions.plan),
       status                 = COALESCE($3, subscriptions.status),
       current_period_end     = COALESCE(EXCLUDED.current_period_end,     subscriptions.current_period_end),
       stripe_customer_id     = COALESCE(EXCLUDED.stripe_customer_id,     subscriptions.stripe_customer_id),
       stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
       cancel_at_period_end   = COALESCE($7, subscriptions.cancel_at_period_end),
       updated_at             = NOW()`,
    [
      p.userId,
      p.plan ?? null,
      p.status ?? null,
      p.currentPeriodEnd ?? null,
      p.stripeCustomerId ?? null,
      p.stripeSubscriptionId ?? null,
      p.cancelAtPeriodEnd ?? null,
    ],
  );
}

/**
 * Which of our users does this Stripe object belong to?
 *
 * Subscription events do not carry our user id — only Stripe's own ids. The
 * link is made once, at checkout, from `client_reference_id`, and every later
 * event is matched back through it. Email is deliberately NOT used as a
 * fallback: the payer can type a different address into Stripe Checkout, and
 * matching on it would attach someone's subscription to another account.
 */
export async function userIdForStripe(
  subscriptionId: string | null,
  customerId: string | null,
): Promise<number | null> {
  if (subscriptionId) {
    const { rows } = await pool.query<{ userId: number }>(
      `SELECT "userId" FROM subscriptions WHERE stripe_subscription_id = $1`,
      [subscriptionId],
    );
    if (rows[0]) return rows[0].userId;
  }
  if (customerId) {
    const { rows } = await pool.query<{ userId: number }>(
      `SELECT "userId" FROM subscriptions WHERE stripe_customer_id = $1`,
      [customerId],
    );
    if (rows[0]) return rows[0].userId;
  }
  return null;
}

/**
 * The Stripe customer this user already has, if any.
 *
 * Passing it to Checkout instead of an email is what stops a second payment
 * creating a SECOND customer for the same person. Stripe will happily hold
 * two customers with one email address, and once that has happened their
 * subscriptions, invoices and payment methods are split across two records
 * that nothing joins back together — the EZAITASK build guards the same thing
 * with _ensure_customer(), reusing the stored id before ever creating one.
 */
export async function stripeCustomerFor(userId: number): Promise<string | null> {
  const { rows } = await pool.query<{ id: string | null }>(
    `SELECT stripe_customer_id AS id FROM subscriptions WHERE "userId" = $1`,
    [userId],
  );
  return rows[0]?.id ?? null;
}

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/**
 * When does this subscription next renew?
 *
 * STRIPE MOVED THIS FIELD. As of API version 2026-04-22.dahlia,
 * `current_period_end` is no longer on the Subscription root — it lives on
 * each subscription item. Code that reads only the root gets null on any
 * current API version and silently stores no renewal date at all, which is
 * the kind of bug that shows up weeks later as "the billing page says
 * nothing about when I am charged".
 *
 * Learned from the EZAITASK build, which hit it in production and documented
 * it. Their handler reads the item first and falls back to the root, and so
 * does this: the fallback is not redundant, because a REPLAYED event from an
 * older API version still carries the legacy shape.
 */
export function periodEndFrom(object: Record<string, unknown>): Date | null {
  const items = (object.items as { data?: unknown[] } | undefined)?.data;
  const first = Array.isArray(items)
    ? (items[0] as Record<string, unknown> | undefined)
    : undefined;
  const seconds = num(first?.current_period_end) ?? num(object.current_period_end);
  return seconds ? new Date(seconds * 1000) : null;
}
const str = (v: unknown): string | null =>
  typeof v === "string" && v ? v : null;
