import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { TRIAL_DAYS } from '@/lib/plan';
import { STRIPE_API_VERSION } from '@/lib/stripe';
import { stripeCustomerFor } from '@/lib/subscriptions';

/**
 * Creates a Stripe Checkout Session and hands back its URL.
 *
 * Two decisions worth keeping:
 *
 * 1. **Stripe-hosted Checkout, not a card form on our page.** A card field we
 *    render is a card field we are responsible for, and it drags this app into
 *    PCI scope for no benefit. Stripe collects the card on Stripe's domain; we
 *    never see a number. Do not "improve" this by building an inline form.
 *
 * 2. **Inert until configured, and honest about it.** With no key, or no price
 *    id, this returns 503 with a reason rather than a vague failure — the same
 *    shape /api/synthesize uses. The client turns that into a working trial
 *    rather than a dead end, because a broken pay screen in front of an
 *    unvalidated method is the worst of both worlds.
 *
 * Set up before this can work (see skills/deploy-and-payments/SKILL.md):
 *   STRIPE_SECRET_KEY            sk_live_… or sk_test_…
 *   STRIPE_PRICE_MONTHLY         price_… recurring $9.99/mo
 *   STRIPE_PRICE_ONCE            price_… one-time $29.99 — the first report
 *   STRIPE_PRICE_REPORT_UPDATE   price_… one-time $9.99 — every report after
 * And note the www. trap in that skill file before touching the webhook.
 *
 * WHERE THE CUSTOMER COMES BACK TO is chosen here, from the plan name, and is
 * never taken from the request. A success_url posted by the client is an open
 * redirect with a Stripe logo on it.
 */

type Plan = 'monthly' | 'once' | 'report' | 'report-update';

/** Plan → the price to charge, the Stripe mode, and where to land afterward.
    'once' is the old name for 'report' and is kept so an older client that
    is still open in someone's tab does not break. */
const PLANS: Record<Plan, { env: string; mode: 'payment' | 'subscription'; back: string }> = {
  monthly: { env: 'STRIPE_PRICE_MONTHLY', mode: 'subscription', back: '/begin?paid=1' },
  once: { env: 'STRIPE_PRICE_ONCE', mode: 'payment', back: '/unlock?paid=1' },
  report: { env: 'STRIPE_PRICE_ONCE', mode: 'payment', back: '/unlock?paid=1' },
  'report-update': {
    env: 'STRIPE_PRICE_REPORT_UPDATE',
    mode: 'payment',
    back: '/unlock?paid=1',
  },
};



export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const { plan, email } = (await req.json().catch(() => ({}))) as {
    plan?: Plan;
    email?: string;
  };

  const spec = PLANS[plan ?? 'monthly'] ?? PLANS.monthly;
  const priceId = process.env[spec.env];

  if (!key || !priceId) {
    return NextResponse.json(
      {
        error: 'not_configured',
        /* The caller decides what to say — /checkout talks about the trial,
           /unlock talks about the report — so this stays generic. */
        message: 'Payments are not switched on yet. Nothing is charged.',
      },
      { status: 503 },
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get('origin') ?? 'https://www.lovevalues.com';

  const body = new URLSearchParams({
    mode: spec.mode,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${origin}${spec.back}`,
    cancel_url: `${origin}${spec.back.split('?')[0]}?cancelled=1`,
  });

  /**
   * WHO IS PAYING — taken from the SESSION, never from the request body.
   *
   * This is the only link between a Stripe payment and an account in this
   * database. The webhook reads it back on checkout.session.completed and
   * every later subscription event is matched through it.
   *
   * It was missing entirely until the webhook was built, which meant a
   * successful payment carried nothing to attach it to. Email is not a
   * substitute: a payer can type any address into Stripe Checkout, and
   * matching on it would attach their subscription to someone else's account.
   *
   * Read server-side because a client-supplied id is a request to upgrade
   * whichever account the caller names.
   */
  const session = await auth();
  const userId = Number((session?.user as { id?: string } | undefined)?.id);
  if (Number.isInteger(userId) && userId > 0) {
    body.set('client_reference_id', String(userId));
    /* Also on the subscription, so an event that arrives without the
       Checkout Session still carries it. */
    if (spec.mode === 'subscription') {
      body.set('subscription_data[metadata][userId]', String(userId));
    }
  } else {
    /* No session. Stripe would still take the money and the webhook would
       have nothing to credit, so refuse rather than collect. */
    return NextResponse.json(
      {
        error: 'not_signed_in',
        message: 'Please sign in again before paying — we need to know whose account this is.',
      },
      { status: 401 },
    );
  }

  /**
   * REUSE THE STRIPE CUSTOMER IF THERE IS ONE.
   *
   * Passing customer_email a second time makes Stripe create a SECOND
   * customer for the same person. Stripe allows that, and once it happens
   * their subscriptions, invoices and saved cards are split across two
   * records that nothing joins back together — and the billing portal, which
   * takes one customer id, shows only half their history. EZAITASK guards the
   * same thing with _ensure_customer(): stored id first, create only once.
   *
   * customer and customer_email are mutually exclusive at Stripe, so this is
   * one or the other, never both.
   */
  const existingCustomer = await stripeCustomerFor(userId);
  if (existingCustomer) {
    body.set('customer', existingCustomer);
  } else {
    const payerEmail = session?.user?.email ?? email;
    if (payerEmail) body.set('customer_email', payerEmail);
  }
  // A trial only exists on a subscription. A report is charged now.
  if (spec.mode === 'subscription') {
    body.set('subscription_data[trial_period_days]', String(TRIAL_DAYS));
  }

  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        /* Pinned — see lib/stripe.ts. */
        'Stripe-Version': STRIPE_API_VERSION,
      },
      body,
    });

    const data = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !data.url) {
      return NextResponse.json(
        { error: 'stripe_error', message: data.error?.message ?? 'Stripe rejected the request.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: data.url });
  } catch {
    return NextResponse.json(
      { error: 'unreachable', message: 'We could not reach the payment provider.' },
      { status: 502 },
    );
  }
}
