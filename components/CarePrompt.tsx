'use client';

/**
 * The quiet card that appears beneath a field when screening detects a signal.
 *
 * Deliberately NOT a modal. It does not block, does not steal focus, does not
 * touch what the user wrote, and can be dismissed with one click that is
 * respected for the rest of the session. Someone writing about the worst night
 * of their life should not have a dialog thrown in front of them.
 */

import Link from 'next/link';
import { CARE_COPY, type CareLevel } from '@/lib/care';

type Props = {
  level: Exclude<CareLevel, 'none'>;
  onDismiss: () => void;
  /** On the finished profile the card stays put — there is no "not now" there. */
  persistent?: boolean;
};

export default function CarePrompt({ level, onDismiss, persistent = false }: Props) {
  const copy = CARE_COPY[level];

  return (
    <aside className={`care care-${level}`} role="note" aria-live="polite">
      <div className="care-body">
        <h4>{copy.title}</h4>
        <p>{copy.body}</p>
        <div className="care-actions">
          <Link className="btn btn-primary" href="/support" target="_blank" rel="noopener">
            {copy.cta}
          </Link>
          {!persistent && (
            <button type="button" className="care-dismiss" onClick={onDismiss}>
              Not now
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
