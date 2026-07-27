'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { QUESTIONS } from '@/lib/method';
import { useProfile } from '@/lib/useProfile';

/**
 * Shown at the top of /begin when this browser already has answers in it.
 *
 * The intro gate exists for a legal reason and has to stay, but a person who
 * has already read it and written half their profile should not have to scroll
 * past it again to get back to work. Renders nothing until localStorage has
 * been read, so first paint matches the server.
 */
export default function ResumeNotice() {
  const { profile, hydrated } = useProfile();
  if (!hydrated) return null;

  const answered = Object.values(profile.answers).filter((a) => a?.trim()).length;
  if (answered === 0 && profile.coreValues.length === 0) return null;

  const percent = Math.round((answered / QUESTIONS.length) * 100);

  return (
    <div className="resume">
      <p>
        You&apos;ve been here before.
        <span>
          {percent}% of the questions answered, saved on this device.
        </span>
      </p>
      <Link className="btn btn-primary" href="/journey">
        Pick up where you left off <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  );
}
