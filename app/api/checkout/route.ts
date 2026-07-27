import { NextResponse } from 'next/server';

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
 *   STRIPE_SECRET_KEY          sk_live_… or sk_test_…
 *   STRIPE_PRICE_MONTHLY       price_… recurring $9.99/mo
 *   STRIPE_PRICE_ONCE          price_… one-time $29.99
 * And note the www. trap in that skill file before touching the webhook.
 */

const TRIAL_DAYS = 7;

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const { plan, email } = (await req.json().catch(() => ({}))) as {
    plan?: 'monthly' | 'once';
    email?: string;
  };

  const priceId =
    plan === 'once' ? process.env.STRIPE_PRICE_ONCE : process.env.STRIPE_PRICE_MONTHLY;

  if (!key || !priceId) {
    return NextResponse.json(
      {
        error: 'not_configured',
        message:
          'Payments are not switched on yet. Your 7 days start now and nothing is charged.',
      },
      { status: 503 },
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get('origin') ?? 'https://www.lovevalues.com';

  const body = new URLSearchParams({
    mode: plan === 'once' ? 'payment' : 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/begin?paid=1`,
    cancel_url: `${origin}/checkout?cancelled=1`,
  });

  if (email) body.set('customer_email', email);
  // A trial only exists on a subscription. The one-time profile is charged now.
  if (plan !== 'once') {
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
