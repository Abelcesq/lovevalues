'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { loadAccount } from '@/lib/account';
import { useEffect, useState } from 'react';

/**
 * The splash's primary action.
 *
 * Three states, because a returning person and a first-time visitor need
 * different things and showing both makes the page ask a question a newcomer
 * cannot answer:
 *
 *   · no account        → Create my account
 *   · account, no plan  → Finish setting up
 *   · account + plan    → Continue
 *
 * Renders the first-visit state on the server and swaps after hydration, so
 * there is no mismatch and no flash of the wrong call to action.
 */
export default function SplashCta() {
  const [state, setState] = useState<'new' | 'unpaid' | 'ready'>('new');

  useEffect(() => {
    const account = loadAccount();
    if (!account) return setState('new');
    setState(account.plan ? 'ready' : 'unpaid');
  }, []);

  if (state === 'ready') {
    return (
      <div className="cta-row splash-cta">
        <Link className="btn btn-primary btn-lg" href="/journey">
          Continue where you left off <ArrowRight aria-hidden="true" />
        </Link>
        <Link className="textlink" href="/review">
          See my answers
        </Link>
      </div>
    );
  }

  if (state === 'unpaid') {
    return (
      <div className="cta-row splash-cta">
        <Link className="btn btn-primary btn-lg" href="/checkout">
          Finish setting up <ArrowRight aria-hidden="true" />
        </Link>
        <Link className="textlink" href="/how-it-works">
          Read how it works first
        </Link>
      </div>
    );
  }

  return (
    <div className="cta-row splash-cta">
      <Link className="btn btn-primary btn-lg" href="/signup">
        Create my account <ArrowRight aria-hidden="true" />
      </Link>
      <Link className="textlink" href="/login">
        I already have one
      </Link>
    </div>
  );
}
