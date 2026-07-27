'use client';

import { ArrowRight, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { QUESTIONS } from '@/lib/method';
import { useProfile } from '@/lib/useProfile';

/**
 * The entry decision, in one control.
 *
 * There are no accounts here, so "returning user" is not something the server
 * knows — it is whatever is in this browser's localStorage. That is still the
 * fork every welcome screen has to handle: someone arriving for the first time
 * needs a start, and someone coming back needs their place, not a start.
 * Showing both to everyone would make the page ask a question a new visitor
 * cannot answer.
 *
 * Renders the same markup on the server and on first paint (the "Begin" state),
 * then swaps once localStorage has been read — so there is no hydration
 * mismatch and no flash of the wrong call to action.
 */
export default function BeginCta({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const { profile, hydrated } = useProfile();

  const answered = Object.values(profile.answers).filter((a) => a?.trim()).length;
  const started = hydrated && (answered > 0 || profile.coreValues.length > 0);
  const cls = size === 'lg' ? 'btn btn-primary btn-lg' : 'btn btn-primary';

  if (!started) {
    return (
      <div className="cta-row">
        <Link className={cls} href="/begin">
          Begin — free for 30 days <ArrowRight aria-hidden="true" />
        </Link>
        <a className="textlink" href="#how">
          See what the four parts are
        </a>
      </div>
    );
  }

  const percent = Math.round((answered / QUESTIONS.length) * 100);

  return (
    <div className="cta-row">
      <Link className={cls} href="/journey">
        Continue where you left off <ArrowRight aria-hidden="true" />
      </Link>
      <Link className="textlink" href="/review">
        <RotateCcw aria-hidden="true" />
        {percent}% answered — review it
      </Link>
    </div>
  );
}
