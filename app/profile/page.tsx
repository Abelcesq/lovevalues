"use client";

import { Check, Printer } from "lucide-react";
import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CarePrompt from "@/components/CarePrompt";
import { Footer, Nav } from "@/components/Chrome";
import VoiceInput from "@/components/VoiceInput";
import {
  LEGAL_DISCLOSURE,
  MIRROR_FRAMING,
  QUESTIONS,
  allValueCards,
  isQuestionVisible,
} from "@/lib/method";
import { splitLabel } from "@/lib/prose";
import { type Synthesis } from "@/lib/store";
import { useProfile } from "@/lib/useProfile";

/**
 * The reflection, as an ordered list of sections.
 *
 * `id` is persisted in profile.sectionResonance and sent to the engine as the
 * label of a correction, so renaming one silently discards a person's saved
 * verdict. Treat these as stable keys, not display strings.
 */
type Section = {
  id: string;
  /** Shown in the confirm prompt, so the question names what it is about. */
  label: string;
  /** Whether this reflection actually has content for the section. Reflections
      generated before a field existed, and anything the open-model fallback
      omits, would otherwise render an empty heading with a confirm prompt
      underneath it and stall the reader on nothing. */
  has: (s: Synthesis) => boolean;
  render: (s: Synthesis) => React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: "coreValues",
    label: "your core values",
    has: (s) => (s.coreValues?.length ?? 0) > 0,
    render: (s) => (
      <section className="syn-section">
        <span className="eyebrow">Your core values</span>
        <h2>What you actually build a life around</h2>
        {s.coreValues?.map((v, i) => (
          <div className="syn-value" key={`${v.value}-${i}`}>
            <h3>
              <span className="rank">{String(i + 1).padStart(2, "0")}</span>
              {v.value}
            </h3>
            <p>{v.whyItMatters}</p>
          </div>
        ))}
      </section>
    ),
  },
  {
    id: "operatingSystem",
    label: "how you run underneath",
    has: (s) => Boolean(s.operatingSystem?.trim()),
    render: (s) => (
      <SynProse
        eyebrow="Your operating system"
        title="How you run underneath"
        body={s.operatingSystem}
      />
    ),
  },
  {
    id: "howYouPresent",
    label: "how you show up in relationship",
    has: (s) => Boolean(s.howYouPresent?.trim()),
    render: (s) => (
      <SynProse
        eyebrow="In relationship"
        title="How you actually show up"
        body={s.howYouPresent}
      />
    ),
  },
  {
    id: "lovingFeedback",
    label: "what works, and why the rest is there",
    has: (s) => Boolean(s.lovingFeedback?.trim()),
    render: (s) => (
      <SynProse
        eyebrow="With love"
        title="What works, and why the rest is there"
        body={s.lovingFeedback}
      />
    ),
  },
  {
    id: "specialAttribute",
    label: "the quality that is uniquely yours",
    has: (s) => Boolean(s.specialAttribute?.trim()),
    render: (s) => (
      <SynProse
        eyebrow="Your special attribute"
        title="The one quality that is uniquely yours"
        body={s.specialAttribute}
      />
    ),
  },
  {
    id: "growthPractices",
    label: "the practices suggested for you",
    has: (s) => (s.growthPractices?.length ?? 0) > 0,
    render: (s) => (
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
    ),
  },
];

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
  /* Local mirror of the correction boxes so typing stays responsive; the
     authoritative copy is written straight through to the profile. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const openRef = useRef<HTMLDivElement | null>(null);
  const [reveals, setReveals] = useState(0);

  /* How far the reading has opened. Sections unlock strictly in order: a
     section appears only once every one before it has been confirmed, so
     nobody reads the growth practices before agreeing what their values are.
     Deriving this from stored verdicts rather than holding it in state means a
     returning visitor picks up exactly where they stopped. */
  const sections = useMemo(
    () =>
      profile.synthesis
        ? SECTIONS.filter((x) => x.has(profile.synthesis!))
        : [],
    [profile.synthesis],
  );

  const openIndex = useMemo(() => {
    let i = 0;
    while (
      i < sections.length &&
      profile.sectionResonance[sections[i].id]?.verdict === "yes"
    ) {
      i += 1;
    }
    return i;
  }, [sections, profile.sectionResonance]);

  const allConfirmed = sections.length > 0 && openIndex >= sections.length;

  /* Bring a newly opened section into view. Without this the page silently
     grows below the fold and "Yes" looks like it did nothing — the exact
     complaint that prompted this rebuild. Skipped on first paint so returning
     to a finished reading does not yank the page around. */
  useEffect(() => {
    if (reveals === 0) return;
    openRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [reveals]);

  const setVerdict = useCallback(
    (id: string, verdict: "yes" | "partly" | "no") => {
      update((p) => ({
        ...p,
        sectionResonance: {
          ...p.sectionResonance,
          [id]: {
            correction: p.sectionResonance[id]?.correction ?? "",
            verdict,
          },
        },
      }));
      if (verdict === "yes") setReveals((n) => n + 1);
    },
    [update],
  );

  const setDraft = useCallback(
    (id: string, text: string) => {
      setDrafts((d) => ({ ...d, [id]: text }));
      update((p) => ({
        ...p,
        sectionResonance: {
          ...p.sectionResonance,
          [id]: {
            verdict: p.sectionResonance[id]?.verdict ?? "partly",
            correction: text,
          },
        },
      }));
    },
    [update],
  );

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

      /* What they said was wrong last time, in their own words. Sending this
         is what makes "Regenerate" honest: without it the engine reproduces
         the reading they just rejected, and being asked what is wrong and then
         handed the same document back is worse than never being asked. */
      const corrections = SECTIONS.filter((sec) => {
        const r = profile.sectionResonance[sec.id];
        return r && r.verdict !== "yes" && r.correction.trim();
      }).map((sec) => ({
        section: sec.label,
        verdict: profile.sectionResonance[sec.id].verdict,
        note: profile.sectionResonance[sec.id].correction,
      }));

      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coreValues,
          operationalized,
          answers,
          corrections,
        }),
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
      /* A fresh reading is unconfirmed by definition: clearing the verdicts
         closes it back to the first section so the person reads what actually
         changed rather than scrolling past it to the end. */
      update((p) => ({
        ...p,
        synthesis: {
          ...(data.synthesis as Synthesis),
          provider: data.provider,
          model: data.model,
        },
        sectionResonance: {},
      }));
      setDrafts({});
      window.scrollTo({ top: 0, behavior: "smooth" });
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

              {/* ── THE READING, ONE SECTION AT A TIME ──────────────────────
                  Everything used to arrive at once with a single "Does this
                  resonate?" underneath, which asked someone to compress five
                  distinct readings into one verdict and gave them nowhere to
                  say WHICH part was wrong. Worse, answering it did nothing —
                  the page sat there unchanged.

                  Now each section is confirmed before the next appears. Yes
                  opens the next one. Partly or No opens a box for their own
                  words, and only there does regenerating make sense, because
                  only there is there something new to regenerate FROM. */}
              {sections.map((section, i) => {
                if (i > openIndex) return null;
                const verdict = profile.sectionResonance[section.id]?.verdict;
                const isOpen = i === openIndex;
                return (
                  <div
                    key={section.id}
                    ref={isOpen ? openRef : undefined}
                    className="syn-step"
                  >
                    {section.render(s)}
                    <SectionResonance
                      section={section}
                      verdict={verdict}
                      draft={drafts[section.id] ?? ""}
                      busy={loading}
                      onVerdict={(v) => setVerdict(section.id, v)}
                      onDraft={(text) => setDraft(section.id, text)}
                      onRegenerate={generate}
                    />
                  </div>
                );
              })}

              {/* Only once every section has been confirmed. Until then these
                  are three ways to leave a job half-finished, and "Print" in
                  particular offers to save a reading the person has not agreed
                  is true. */}
              {allConfirmed && (
                <>
                  <div className="syn-done">
                    <h2>That is the full picture.</h2>
                    <p>
                      You have read every part of this and said it lands. Keep a
                      copy if you would like one — and come back and update it
                      whenever something in your life changes, because it is
                      meant to move with you.
                    </p>
                  </div>

                  <div className="controls">
                    <button
                      type="button"
                      className="btn btn-primary btn-lg"
                      onClick={() => window.print()}
                    >
                      <Printer aria-hidden="true" /> Print or save my analysis
                    </button>
                    <Link className="btn btn-ghost btn-lg" href="/review">
                      Edit my answers
                    </Link>
                    <Link className="btn btn-ghost btn-lg" href="/dashboard">
                      Return to dashboard
                    </Link>
                  </div>
                </>
              )}

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

/**
 * The confirm step that sits under each section.
 *
 * Three states, and the third is the point of the whole rebuild:
 *   · unanswered — Yes / Partly / No.
 *   · yes        — a quiet acknowledgement; the next section has opened.
 *   · partly/no  — the question "what did we get wrong?", a box for their own
 *                  words, and only here a Regenerate button, because only here
 *                  is there something new to regenerate from.
 *
 * The button stays disabled until they have actually written something. A
 * regenerate with no correction attached would re-run the same inputs and
 * return the same reading, which is precisely the dead end this replaced.
 */
function SectionResonance({
  section,
  verdict,
  draft,
  busy,
  onVerdict,
  onDraft,
  onRegenerate,
}: {
  section: Section;
  verdict?: "yes" | "partly" | "no";
  draft: string;
  busy: boolean;
  onVerdict: (v: "yes" | "partly" | "no") => void;
  onDraft: (text: string) => void;
  onRegenerate: () => void;
}) {
  if (verdict === "yes") {
    return (
      <p className="syn-agreed">
        <Check aria-hidden="true" /> You said this one lands.
      </p>
    );
  }

  return (
    <div className="resonance">
      <h2>Does this resonate?</h2>
      <p>
        This is a mirror, not a verdict. Tell us whether{" "}
        <strong>{section.label}</strong> is true of you — and if it is not, what
        we got wrong.
      </p>
      <div className="resonance-choices">
        {(["yes", "partly", "no"] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={`chip ${verdict === v ? "sel" : ""}`}
            onClick={() => onVerdict(v)}
            disabled={busy}
          >
            {v === "yes" ? "Yes" : v === "partly" ? "Partly" : "No"}
          </button>
        ))}
      </div>

      {verdict && (
        <div style={{ textAlign: "left", marginTop: 8 }}>
          <p className="q-helper">
            {verdict === "no"
              ? "Say what this got wrong, and what would be closer to the truth. Your words go to the engine — it will not hand you the same reading back."
              : "Which part fits and which part doesn’t? The more specific you are, the better the next attempt will be."}
          </p>
          <VoiceInput
            id={`correction-${section.id}`}
            value={draft}
            rows={4}
            placeholder="In your own words…"
            onChange={onDraft}
          />
          <div className="controls" style={{ border: 0, marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={onRegenerate}
              disabled={busy || !draft.trim()}
            >
              {busy ? "Rewriting…" : "Regenerate with this in mind"}
            </button>
          </div>
          {!draft.trim() && (
            <p className="q-helper" style={{ marginTop: 8 }}>
              Add a note above and the button will wake up — regenerating
              without one would simply repeat this.
            </p>
          )}
        </div>
      )}
    </div>
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
        .map((p, i) => {
          const point = splitLabel(p.trim());
          return point ? (
            <p key={i}>
              <strong className="syn-point">{point.label}</strong>
              {point.rest}
            </p>
          ) : (
            <p key={i}>{p}</p>
          );
        })}
    </section>
  );
}
