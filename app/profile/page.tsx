"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import CarePrompt from "@/components/CarePrompt";
import { Footer, Nav } from "@/components/Chrome";
import VoiceInput from "@/components/VoiceInput";
import {
  LEGAL_DISCLOSURE,
  MIRROR_FRAMING,
  QUESTIONS,
  VALUE_CARDS,
  allValueCards,
  isQuestionVisible,
} from "@/lib/method";
import { type Synthesis } from "@/lib/store";
import { useProfile } from "@/lib/useProfile";

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
  const [correction, setCorrection] = useState("");

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const answers = QUESTIONS.filter(
        (q) =>
          isQuestionVisible(q, profile.answers) &&
          profile.answers[q.id]?.trim(),
      ).map((q) => ({ question: q.prompt, answer: profile.answers[q.id] }));

      const coreValues = allValueCards(profile.customValues)
        .filter((c) => profile.coreValues.includes(c.id))
        .map((c) => c.label);

      const operationalized: Record<
        string,
        { definition: string; dos: string; donts: string }
      > = {};
      for (const id of profile.coreValues) {
        const label =
          allValueCards(profile.customValues).find((c) => c.id === id)?.label ??
          id;
        const v = profile.operationalized[id];
        if (v) operationalized[label] = v;
      }

      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coreValues, operationalized, answers }),
      });

      /* The route answers with newline-delimited text: heartbeats first (they
         keep Heroku's router from killing a long reflection — see the H12 note
         in app/api/synthesize/route.ts), then the real payload on the last
         line. Early validation errors are plain JSON, which is also a single
         line, so one code path reads both.

         Deliberately NOT res.json(). That was the bug the CEO hit on
         2026-08-02: when the router timed out it returned an HTML error page,
         res.json() threw on the HTML, and the catch below told him we couldn't
         reach a server that was in fact still working. Anything unparseable
         now says so honestly instead of blaming the network. */
      const raw = await res.text();
      const lastLine = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .pop();

      let data: {
        error?: string;
        synthesis?: unknown;
        provider?: string;
        model?: string;
      } | null = null;
      if (lastLine) {
        try {
          data = JSON.parse(lastLine);
        } catch {
          data = null;
        }
      }

      if (!data) {
        setError(
          "The reflection didn’t come back in one piece — the server may have taken too long. Please try again. Your answers are safe on this device.",
        );
        return;
      }
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Your answers are safe.");
        return;
      }
      update((p) => ({
        ...p,
        synthesis: {
          ...(data.synthesis as Synthesis),
          provider: data.provider,
          model: data.model,
        },
        resonance: null,
      }));
    } catch {
      setError(
        "We couldn’t reach the server. Your answers are safe on this device.",
      );
    } finally {
      setLoading(false);
    }
  }, [profile, update]);

  if (!hydrated) return null;

  const s = profile.synthesis;

  return (
    <>
      <Nav />
      <main className="journey">
        <div className="wrap">
          <div className="module-open">
            <span className="eyebrow">Your living profile</span>
            <h1>
              {s ? "Here is the Love Values analysis…" : "Ready when you are"}
            </h1>
            {!s && (
              <p>
                When you generate this, your answers are sent once to produce
                your reflection — and are not stored on our servers.
              </p>
            )}
          </div>

          {error && <div className="notice">{error}</div>}

          {loading && (
            <div className="loading">
              <p style={{ marginBottom: 18 }}>
                Reading everything you wrote, carefully.
              </p>
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          )}

          {!s && !loading && (
            <div className="controls" style={{ border: 0 }}>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={generate}
              >
                Generate my profile
              </button>
              <Link className="btn btn-ghost btn-lg" href="/review">
                Review my answers first
              </Link>
            </div>
          )}

          {s && !loading && (
            <>
              {/* Duty of care comes before the analysis, never after it. */}
              {s.careFlag && s.careFlag !== "none" && (
                <CarePrompt
                  level={s.careFlag}
                  onDismiss={() => {}}
                  persistent
                />
              )}

              <div className="framing">{MIRROR_FRAMING}</div>

              {/* /privacy promises a reflection written by the fallback engine
                  is marked. This is that mark — a claim on the privacy page
                  that the UI does not honour is worse than no claim. */}
              {s.provider === "openrouter" && (
                <p className="save-note" style={{ margin: "-24px auto 40px" }}>
                  Our usual engine was unavailable, so this reflection was
                  written by an open-source model
                  {s.model ? ` (${s.model})` : ""} instead. It may read
                  differently. You can regenerate below to try the usual one
                  again.
                </p>
              )}

              <section className="syn-section">
                <span className="eyebrow">Your core values</span>
                <h2>What you actually build a life around</h2>
                {s.coreValues?.map((v, i) => (
                  <div className="syn-value" key={`${v.value}-${i}`}>
                    <h3>
                      <span className="rank">
                        {String(i + 1).padStart(2, "0")}
                      </span>
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
                  This is a mirror, not a verdict. If it&apos;s wrong, tell us
                  what to correct — and the reflection changes with you.
                </p>
                <div className="resonance-choices">
                  {(["yes", "partly", "no"] as const).map((verdict) => (
                    <button
                      key={verdict}
                      type="button"
                      className={`chip ${profile.resonance?.verdict === verdict ? "sel" : ""}`}
                      onClick={() =>
                        update((p) => ({
                          ...p,
                          resonance: {
                            verdict,
                            correction: p.resonance?.correction ?? "",
                          },
                        }))
                      }
                    >
                      {verdict === "yes"
                        ? "Yes"
                        : verdict === "partly"
                          ? "Partly"
                          : "No"}
                    </button>
                  ))}
                </div>

                {profile.resonance && profile.resonance.verdict !== "yes" && (
                  <div style={{ textAlign: "left", marginTop: 8 }}>
                    <p className="q-helper">
                      What did we get wrong? Say it in your own words — then
                      update the answers it came from and regenerate.
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
                          resonance: {
                            verdict: p.resonance?.verdict ?? "partly",
                            correction: next,
                          },
                        }));
                      }}
                    />
                  </div>
                )}
              </div>

              {/* "Download my profile" is gone, and what replaced it is not the
                  same thing wearing a new label. That button saved a JSON file
                  of every answer plus the reflection — a data-portability
                  export, useful for not losing your work and useless to read.
                  The thing a person actually wants to keep is the analysis, in
                  a form they can hand to someone or put in a drawer. Print does
                  that, and every browser's print dialog offers "Save as PDF",
                  so one control covers both words the CEO used.

                  The raw export still exists on the dashboard, where it belongs:
                  it is the safety net for local-first storage, not a feature. */}
              <div className="controls">
                <Link className="btn btn-ghost btn-lg" href="/review">
                  Edit my answers
                </Link>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={generate}
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-lg"
                  onClick={() => window.print()}
                >
                  <Printer aria-hidden="true" /> Print or save my analysis
                </button>
              </div>

              <p
                className="save-note"
                style={{ maxWidth: 720, margin: "28px auto 0" }}
              >
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

function SynProse({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  if (!body) return null;
  return (
    <section className="syn-section">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {body
        .split("\n")
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </section>
  );
}
