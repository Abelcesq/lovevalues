'use client';

/**
 * Review & Edit — every question, every answer, all in one place.
 *
 * Modeled on the EZAITASK editable-responses pattern and the "living document"
 * principle: a user can change any answer at any time and regenerate the
 * profile. Nothing is locked once submitted.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Footer, Nav } from '@/components/Chrome';
import QuestionField from '@/components/QuestionField';
import {
  MODULES,
  QUESTIONS,
  VALUE_CARDS,
  isQuestionVisible,
  type ModuleId,
} from '@/lib/method';
import { clearProfile, downloadProfile } from '@/lib/store';
import { useProfile } from '@/lib/useProfile';

export default function ReviewPage() {
  const router = useRouter();
  const { profile, hydrated, setAnswer } = useProfile();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!hydrated) {
    return (
      <>
        <Nav />
        <main className="journey">
          <div className="loading">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const answeredCount = QUESTIONS.filter(
    (q) => isQuestionVisible(q, profile.answers) && profile.answers[q.id]?.trim(),
  ).length;
  const visibleCount = QUESTIONS.filter((q) => isQuestionVisible(q, profile.answers)).length;

  const coreLabels = VALUE_CARDS.filter((c) => profile.coreValues.includes(c.id)).map((c) => c.label);

  return (
    <>
      <Nav />
      <main className="journey">
        <div className="wrap">
          <div className="module-open">
            <span className="eyebrow">Your answers</span>
            <h1>Everything you&apos;ve said, in one place</h1>
            <p>
              Change anything here, whenever you want, then regenerate your profile. This is a
              living document — your clarity is allowed to grow as you do.
            </p>
            <p className="pass-progress">
              {answeredCount} of {visibleCount} answered
              {coreLabels.length > 0 && ` · Core values: ${coreLabels.join(', ')}`}
            </p>
          </div>

          {/* Where you actually are, at a glance.
              Without this, a returning person has to scroll the whole page to
              work out which module they abandoned — which is the single most
              likely reason they came back. */}
          <div className="progress-grid">
            {MODULES.map((module) => {
              const qs = QUESTIONS.filter(
                (q) => q.moduleId === module.id && isQuestionVisible(q, profile.answers),
              );
              const done = qs.filter((q) => profile.answers[q.id]?.trim()).length;
              const pct = qs.length ? Math.round((done / qs.length) * 100) : 0;
              return (
                <Link
                  key={module.id}
                  className={`progress-tile${pct === 100 ? ' full' : ''}`}
                  href={`/journey?m=${module.id}`}
                >
                  <span className="n">{module.number}</span>
                  <span className="t">{module.title}</span>
                  <span className="bar">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span className="c">
                    {done} of {qs.length}
                  </span>
                </Link>
              );
            })}
          </div>

          {MODULES.map((module) => {
            const qs = QUESTIONS.filter(
              (q) => q.moduleId === module.id && isQuestionVisible(q, profile.answers),
            );
            return (
              <section key={module.id}>
                <div className="pass-head">
                  <span className="eyebrow">Module {module.number}</span>
                  <h2>{module.title}</h2>
                </div>

                {module.id === 'values' && <ValuesSummary profile={profile} />}

                {qs.map((q) => {
                  const answer = profile.answers[q.id] ?? '';
                  const isEditing = editing === q.id;
                  return (
                    <div className="review-row" key={q.id}>
                      {isEditing ? (
                        <>
                          <QuestionField
                            question={q}
                            value={answer}
                            onChange={(v) => setAnswer(q.id, v)}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setEditing(null)}
                          >
                            Done
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="mod">{module.title}</span>
                          <p className="q">{q.prompt}</p>
                          {answer.trim() ? (
                            <p style={{ whiteSpace: 'pre-wrap' }}>{answer}</p>
                          ) : (
                            <p className="a-empty">Not answered yet.</p>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ marginTop: 14 }}
                            onClick={() => setEditing(q.id)}
                          >
                            {answer.trim() ? 'Edit this answer' : 'Answer this'}
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })}

          <div className="controls">
            <Link className="btn btn-primary btn-lg" href="/profile?regenerate=1">
              Regenerate my profile
            </Link>
            <Link className="btn btn-ghost btn-lg" href="/journey?m=values&s=0">
              Back to the journey
            </Link>
            <button
              type="button"
              className="btn btn-ghost btn-lg"
              onClick={() => downloadProfile(profile)}
            >
              Download my data
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 28 }}>
            {confirmingDelete ? (
              <div className="notice" style={{ maxWidth: 520 }}>
                <p style={{ marginBottom: 14 }}>
                  This permanently erases every answer on this device. It cannot be undone.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    clearProfile();
                    router.push('/');
                  }}
                >
                  Yes, delete everything
                </button>{' '}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Keep my answers
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete everything
              </button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function ValuesSummary({ profile }: { profile: ReturnType<typeof useProfile>['profile'] }) {
  const core = VALUE_CARDS.filter((c) => profile.coreValues.includes(c.id));
  if (core.length === 0) {
    return (
      <div className="review-row">
        <p className="a-empty">You haven&apos;t chosen your core values yet.</p>
        <Link className="btn btn-ghost" style={{ marginTop: 14 }} href="/journey?m=values&s=0">
          Do the card sort
        </Link>
      </div>
    );
  }
  return (
    <div className="review-row">
      <span className="mod">Core values</span>
      {core.map((c) => {
        const v = profile.operationalized[c.id];
        return (
          <div key={c.id} style={{ marginBottom: 18 }}>
            <p className="q">{c.label}</p>
            {v?.definition && <p style={{ whiteSpace: 'pre-wrap' }}>{v.definition}</p>}
            {v?.dos && (
              <p style={{ marginTop: 6 }}>
                <strong className="op-inline">Do&apos;s: </strong>
                {v.dos}
              </p>
            )}
            {v?.donts && (
              <p style={{ marginTop: 6 }}>
                <strong className="op-inline">Don&apos;ts: </strong>
                {v.donts}
              </p>
            )}
          </div>
        );
      })}
      <Link className="btn btn-ghost" style={{ marginTop: 6 }} href="/journey?m=values&s=2">
        Edit my values
      </Link>
    </div>
  );
}
