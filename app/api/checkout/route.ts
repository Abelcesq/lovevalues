import { NextResponse } from 'next/server';
import { TRIAL_DAYS } from '@/lib/plan';

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

  if (email) body.set('customer_email', email);
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
