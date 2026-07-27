'use client';

import { ArrowRight, Check, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Footer, Nav } from '@/components/Chrome';
import Steps from '@/components/Steps';
import { TRIAL_DAYS, loadAccount, startTrial, type Plan } from '@/lib/account';

/**
 * Step 2 of 3 — choose a plan and start the 7 days.
 *
 * The card itself is collected by Stripe, on Stripe's domain — see the header
 * of app/api/checkout/route.ts for why there is no card form here and why you
 * should not add one.
 *
 * When Stripe is not configured the route answers 503, and this page turns
 * that into a working trial instead of a dead end. That is deliberate: the
 * thing this product needs next is a stranger going through the method, and a
 * pay wall that cannot take payment would block exactly that.
 */
export default function Checkout() {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>('monthly');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const account = loadAccount();
    if (!account) {
      router.replace('/signup');
      return;
    }
    setEmail(account.email);
    setChecked(true);
  }, [router]);

  async function start() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email }),
      });
      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url as string;
        return;
      }

      // Payments not live yet — start the trial and let them into the method.
      startTrial(plan);
      setNotice(data.message ?? 'Payments are not switched on yet. Your 7 days start now.');
      setTimeout(() => router.push('/begin'), 1400);
    } catch {
      startTrial(plan);
      router.push('/begin');
    }
  }

  if (!checked) return null;

  const ends = new Date();
  ends.setDate(ends.getDate() + TRIAL_DAYS);

  return (
    <>
      <Nav variant="flow" />
      <main className="journey">
        <div className="auth auth-wide">
          <Steps current={2} />

          <div className="auth-head">
            <h1>Start your {TRIAL_DAYS} days free</h1>
            <p>
              Nothing is charged today. Cancel any time before{' '}
              <strong>
                {ends.toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                })}
              </strong>{' '}
              and you pay nothing at all.
            </p>
          </div>

          <div className="plans">
            <PlanCard
              id="monthly"
              selected={plan === 'monthly'}
              onSelect={setPlan}
              tag="Most people choose this"
              name="Living profile"
              price="$9.99"
              cadence="per month, after your free week"
              features={[
                'The full four-part method',
                'Your profile stays living — edit and regenerate any time',
                'Match analysis included when it ships',
                'Cancel in one click',
              ]}
            />
            <PlanCard
              id="once"
              selected={plan === 'once'}
              onSelect={setPlan}
              name="One profile"
              price="$29.99"
              cadence="once, yours to keep"
              features={[
                'The full four-part method',
                'Your complete values profile, exported and yours',
                'No recurring charge',
                'Upgrade later if you want the living version',
              ]}
            />
          </div>

          <div className="pay-box">
            <p className="pay-head">
              <CreditCard aria-hidden="true" />
              Payment details
            </p>
            <p className="pay-body">
              We hand you to Stripe to enter your card — it never touches our servers. You will
              come straight back here afterwards.
            </p>

            {notice && <p className="pay-notice">{notice}</p>}

            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              onClick={start}
              disabled={busy}
            >
              {busy ? 'One moment…' : `Start my ${TRIAL_DAYS} days free`}
              {!busy && <ArrowRight aria-hidden="true" />}
            </button>

            <ul className="pay-assurances">
              <li>
                <Lock aria-hidden="true" /> Card handled by Stripe, never by us
              </li>
              <li>
                <ShieldCheck aria-hidden="true" /> Cancel any time, in one click
              </li>
            </ul>
          </div>

          <p className="auth-alt">
            <Link href="/how-it-works">What am I actually getting?</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

function PlanCard({
  id,
  name,
  price,
  cadence,
  features,
  tag,
  selected,
  onSelect,
}: {
  id: Plan;
  name: string;
  price: string;
  cadence: string;
  features: string[];
  tag?: string;
  selected: boolean;
  onSelect: (p: Plan) => void;
}) {
  return (
    <button
      type="button"
      className={`plan${selected ? ' sel' : ''}`}
      onClick={() => onSelect(id)}
      aria-pressed={selected}
    >
      {tag && <span className="tag">{tag}</span>}
      <span className="plan-name">{name}</span>
      <span className="price-n">{price}</span>
      <span className="price-sub">{cadence}</span>
      <ul>
        {features.map((f) => (
          <li key={f}>
            <Check aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>
    </button>
  );
}
