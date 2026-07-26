'use client';

import Link from 'next/link';
import { Suspense, useCallback, useState } from 'react';
import { Footer, Nav } from '@/components/Chrome';
import VoiceInput from '@/components/VoiceInput';
import {
  LEGAL_DISCLOSURE,
  MIRROR_FRAMING,
  QUESTIONS,
  VALUE_CARDS,
  isQuestionVisible,
} from '@/lib/method';
import { downloadProfile, type Synthesis } from '@/lib/store';
import { useProfile } from '@/lib/useProfile';

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <Profile />
    </Suspense>
  );
}

function Profile() {
  const { profile, hydrated, update } = useProfile();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correction, setCorrection] = useState('');

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const answers = QUESTIONS.filter(
        (q) => isQuestionVisible(q, profile.answers) && profile.answers[q.id]?.trim(),
      ).map((q) => ({ question: q.prompt, answer: profile.answers[q.id] }));

      const coreValues = VALUE_CARDS.filter((c) => profile.coreValues.includes(c.id)).map(
        (c) => c.label,
      );

      const operationalized: Record<string, { definition: string; dos: string; donts: string }> = {};
      for (const id of profile.coreValues) {
        const label = VALUE_CARDS.find((c) => c.id === id)?.label ?? id;
        const v = profile.operationalized[id];
        if (v) operationalized[label] = v;
      }

      const res = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreValues, operationalized, answers }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Your answers are safe.');
        return;
      }
      update((p) => ({ ...p, synthesis: data.synthesis as Synthesis, resonance: null }));
    } catch {
      setError('We couldn’t reach the server. Your answers are safe on this device.');
    } finally {
      setLoading(false);
    }
  }, [profile, update]);

  if (!hydrated) return null;

  const s = profile.synthesis;

  return (
    <>
      <Nav cta={false} />
      <main className="journey">
        <div className="wrap">
          <div className="module-open">
            <span className="eyebrow">Your living profile</span>
            <h1>{s ? 'Here is what the method sees' : 'Ready when you are'}</h1>
            {!s && (
              <p>
                When you generate this, your answers are sent once to produce your reflection — and
                are not stored on our servers.
              </p>
            )}
          </div>

          {error && <div className="notice">{error}</div>}

          {loading && (
            <div className="loading">
              <p style={{ marginBottom: 18 }}>Reading everything you wrote, carefully.</p>
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          )}

          {!s && !loading && (
            <div className="controls" style={{ border: 0 }}>
              <button type="button" className="btn btn-primary btn-lg" onClick={generate}>
                Generate my profile
              </button>
              <Link className="btn btn-ghost btn-lg" href="/review">
                Review my answers first
              </Link>
            </div>
          )}

          {s && !loading && (
            <>
              <div className="framing">{MIRROR_FRAMING}</div>

              <section className="syn-section">
                <span className="eyebrow">Your core values</span>
                <h2>What you actually build a life around</h2>
                {s.coreValues?.map((v, i) => (
                  <div className="syn-value" key={`${v.value}-${i}`}>
                    <h3>
                      <span className="rank">{String(i + 1).padStart(2, '0')}</span>
                      {v.value}
                    </h3>
                    <p>{v.whyItMatters}</p>
                  </div>
                ))}
              </section>

              <SynProse
                eyebrow="Your operating system"
                title="How you run underneath"
                body={s.operatingSystem}
              />
              <SynProse
                eyebrow="In relationship"
                title="How you actually show up"
                body={s.howYouPresent}
              />
              <SynProse
                eyebrow="With love"
                title="What works, and why the rest is there"
                body={s.lovingFeedback}
              />

              <section className="syn-section">
                <span className="eyebrow">Growth practices</span>
                <h2>Small things, starting this week</h2>
                {s.growthPractices?.map((p, i) => (
                  <div className="syn-practice" key={`${p.practice}-${i}`}>
                    <h4>{p.practice}</h4>
                    <p>{p.why}</p>
                  </div>
                ))}
              </section>

              {/* Does this resonate? */}
              <div className="resonance">
                <h2>Does this resonate?</h2>
                <p>
                  This is a mirror, not a verdict. If it&apos;s wrong, tell us what to correct — and
                  the reflection changes with you.
                </p>
                <div className="resonance-choices">
                  {(['yes', 'partly', 'no'] as const).map((verdict) => (
                    <button
                      key={verdict}
                      type="button"
                      className={`chip ${profile.resonance?.verdict === verdict ? 'sel' : ''}`}
                      onClick={() =>
                        update((p) => ({
                          ...p,
                          resonance: { verdict, correction: p.resonance?.correction ?? '' },
                        }))
                      }
                    >
                      {verdict === 'yes' ? 'Yes' : verdict === 'partly' ? 'Partly' : 'No'}
                    </button>
                  ))}
                </div>

                {profile.resonance && profile.resonance.verdict !== 'yes' && (
                  <div style={{ textAlign: 'left', marginTop: 8 }}>
                    <p className="q-helper">
                      What did we get wrong? Say it in your own words — then update the answers it
                      came from and regenerate.
                    </p>
                    <VoiceInput
                      id="resonance-correction"
                      value={correction}
                      rows={4}
                      placeholder="What doesn’t fit…"
                      onChange={(next) => {
                        setCorrection(next);
                        update((p) => ({
                          ...p,
                          resonance: { verdict: p.resonance?.verdict ?? 'partly', correction: next },
                        }));
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="controls">
                <Link className="btn btn-ghost btn-lg" href="/review">
                  Edit my answers
                </Link>
                <button type="button" className="btn btn-primary btn-lg" onClick={generate}>
                  Regenerate
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-lg"
                  onClick={() => downloadProfile(profile)}
                >
                  Download my profile
                </button>
              </div>

              <p className="save-note" style={{ maxWidth: 720, margin: '28px auto 0' }}>
                {LEGAL_DISCLOSURE}
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function SynProse({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  if (!body) return null;
  return (
    <section className="syn-section">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {body
        .split('\n')
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </section>
  );
}
