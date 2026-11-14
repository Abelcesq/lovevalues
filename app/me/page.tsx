"use client";

import { ArrowRight, Check, FileText, Pencil, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Footer, Nav } from "@/components/Chrome";
import {
  ACTIVITY_GROUPS,
  EMPTY_MEMBER_PROFILE,
  GENDERS,
  MAX_ABOUT_ME,
  MAX_ACTIVITIES,
  type MemberProfile,
  type Option,
  RELATIONSHIP_TYPES,
  RELIGIONS,
  SEEKING,
  WANTS_CHILDREN,
  ageOn,
  labelFor,
  missingFields,
} from "@/lib/memberProfile";

/**
 * MY PROFILE — the member portal's front door.
 *
 * WHAT THIS IS FOR. Love Values is becoming a product where members are
 * matched on their values (CEO, 2026-11-13), and matching needs facts a
 * stranger could be told across a table: who you are, where you are, what you
 * are looking for. This page is where a member states them, and it is the one
 * page that gathers the three things they own:
 *
 *   · this profile — on the server, because matching cannot work otherwise;
 *   · their answers — in their browser, and staying there;
 *   · their reflection — written from the answers, also in their browser.
 *
 * The last two are LINKED from here, never embedded. The moment a page shows
 * both a matchable profile and the contents of someone's Roots module, the
 * wall between them is a habit rather than an architecture. Hard rule 8 is
 * about the matching engine, and this is the page where the two kinds of data
 * would most naturally be allowed to meet.
 *
 * VIEW AND EDIT ARE THE SAME PAGE, one `editing` flag apart. The alternative
 * — /me and /me/edit — doubles the field list and guarantees the two drift.
 */
export default function MePage() {
  const [profile, setProfile] = useState<MemberProfile>(EMPTY_MEMBER_PROFILE);
  const [draft, setDraft] = useState<MemberProfile>(EMPTY_MEMBER_PROFILE);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.profile) {
          setProfile(data.profile);
          setDraft(data.profile);
          /* A member arriving with nothing filled in should land in the form,
             not on an empty page they have to find a button on. */
          if (missingFields(data.profile) >= 9) setEditing(true);
        } else if (data.code === "no_database") {
          setError(
            "Profiles aren’t connected to a server yet. Nothing here is saved.",
          );
        } else if (res.status === 401) {
          window.location.href = "/login?next=/me";
          return;
        }
      })
      .catch(() => {
        if (!cancelled) setError("We couldn’t load your profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = useCallback(
    <K extends keyof MemberProfile>(key: K, value: MemberProfile[K]) => {
      setDraft((d) => ({ ...d, [key]: value }));
      setSaved(false);
    },
    [],
  );

  const toggleActivity = useCallback((id: string) => {
    setSaved(false);
    setDraft((d) => {
      const has = d.activities.includes(id);
      if (has) {
        return { ...d, activities: d.activities.filter((a) => a !== id) };
      }
      if (d.activities.length >= MAX_ACTIVITIES) return d;
      return { ...d, activities: [...d.activities, id] };
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "We couldn’t save your profile.");
        return;
      }
      setProfile(data.profile);
      setDraft(data.profile);
      setEditing(false);
      setSaved(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("We couldn’t reach the server. Your changes weren’t saved.");
    } finally {
      setBusy(false);
    }
  }

  const age = profile.dateOfBirth ? ageOn(profile.dateOfBirth) : null;
  const incomplete = missingFields(profile);

  return (
    <>
      <Nav />
      <main className="journey">
        <div className="wrap wrap-narrow">
          <div className="module-open">
            <span className="eyebrow">My profile</span>
            <h1>{profile.displayName || "Your profile"}</h1>
            <p>
              This is the part of Love Values that other members could one day
              see. Your answers and your reflection are not part of it — they
              stay on your own device.
            </p>
          </div>

          {error && <div className="notice">{error}</div>}
          {saved && (
            <div className="notice notice-ok">
              <Check aria-hidden="true" /> Your profile has been updated.
            </div>
          )}

          {loading ? (
            <div className="loading">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          ) : editing ? (
            <form onSubmit={save} className="profile-form" noValidate>
              <Text
                id="displayName"
                label="Name"
                hint="What other members would see. A first name is plenty."
                value={draft.displayName}
                onChange={(v) => set("displayName", v)}
              />

              <div className="field">
                <label htmlFor="aboutMe">
                  About me{" "}
                  <span className="field-count">
                    {draft.aboutMe.length} / {MAX_ABOUT_ME}
                  </span>
                </label>
                <textarea
                  id="aboutMe"
                  rows={4}
                  maxLength={MAX_ABOUT_ME}
                  value={draft.aboutMe}
                  onChange={(e) => set("aboutMe", e.target.value)}
                  placeholder="A few sentences about who you are and what matters to you…"
                />
                {/* The limit is the schema's, and it is deliberately small —
                    see db/003. Saying so here stops it reading as an
                    arbitrary restriction. */}
                <p className="field-hint">
                  A short paragraph. This is the only free text on your
                  profile — what you wrote in the method stays on your device
                  and never appears here.
                </p>
              </div>

              <Choice
                label="My gender"
                options={GENDERS}
                value={draft.gender}
                onChange={(v) => set("gender", v)}
              />
              <Choice
                label="The gender I'm seeking"
                options={SEEKING}
                value={draft.seeking}
                onChange={(v) => set("seeking", v)}
              />

              <div className="field-row">
                <Text
                  id="city"
                  label="City"
                  value={draft.city}
                  onChange={(v) => set("city", v)}
                />
                <Text
                  id="country"
                  label="Country"
                  value={draft.country}
                  onChange={(v) => set("country", v)}
                />
              </div>

              <div className="field">
                <label htmlFor="dob">Date of birth</label>
                <input
                  id="dob"
                  type="date"
                  value={draft.dateOfBirth}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                />
                <p className="field-hint">
                  Other members see your age, never your date of birth. You
                  need to be 18 or over.
                </p>
              </div>

              <Choice
                label="Religion"
                options={RELIGIONS}
                value={draft.religion}
                onChange={(v) => set("religion", v)}
              />
              <Choice
                label="What I'm looking for"
                options={RELATIONSHIP_TYPES}
                value={draft.relationshipType}
                onChange={(v) => set("relationshipType", v)}
              />
              <Choice
                label="Children"
                options={WANTS_CHILDREN}
                value={draft.wantsChildren}
                onChange={(v) => set("wantsChildren", v)}
              />

              <div className="field">
                <label>
                  Activities I enjoy{" "}
                  <span className="field-count">
                    {draft.activities.length} of {MAX_ACTIVITIES}
                  </span>
                </label>
                {ACTIVITY_GROUPS.map((g) => (
                  <div key={g.group} className="activity-group">
                    <p className="activity-head">{g.group}</p>
                    <div className="chips">
                      {g.items.map((a) => {
                        const on = draft.activities.includes(a.id);
                        const full =
                          !on && draft.activities.length >= MAX_ACTIVITIES;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            className={`chip${on ? " on" : ""}`}
                            aria-pressed={on}
                            disabled={full}
                            onClick={() => toggleActivity(a.id)}
                          >
                            {a.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Opt-in, never a default. Filling in a profile and agreeing to
                  be shown to strangers are two different decisions, and the
                  database defaults this to false for the same reason. */}
              <label className="switch-row">
                <input
                  type="checkbox"
                  checked={draft.visibleInMatching}
                  onChange={(e) => set("visibleInMatching", e.target.checked)}
                />
                <span>
                  <strong>Include me when matching opens.</strong> Matching
                  isn’t built yet. Until it is, nobody sees this profile but
                  you — and you can switch this off at any time.
                </span>
              </label>

              <div className="controls" style={{ border: 0 }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Save my profile"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-lg"
                  onClick={() => {
                    setDraft(profile);
                    setEditing(false);
                    setError(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              {incomplete > 0 && (
                <div className="framing">
                  Your profile is still missing {incomplete}{" "}
                  {incomplete === 1 ? "detail" : "details"}. Matching will work
                  from what is here, so it is worth finishing.
                </div>
              )}

              <dl className="profile-view">
                <Row label="Name" value={profile.displayName} />
                <Row label="About me" value={profile.aboutMe} />
                <Row label="My gender" value={labelFor(GENDERS, profile.gender)} />
                <Row
                  label="Seeking"
                  value={labelFor(SEEKING, profile.seeking)}
                />
                <Row
                  label="Location"
                  value={[profile.city, profile.country]
                    .filter(Boolean)
                    .join(", ")}
                />
                <Row label="Age" value={age === null ? "" : `${age}`} />
                <Row
                  label="Religion"
                  value={labelFor(RELIGIONS, profile.religion)}
                />
                <Row
                  label="Looking for"
                  value={labelFor(
                    RELATIONSHIP_TYPES,
                    profile.relationshipType,
                  )}
                />
                <Row
                  label="Children"
                  value={labelFor(WANTS_CHILDREN, profile.wantsChildren)}
                />
                <div className="profile-row">
                  <dt>Activities</dt>
                  <dd>
                    {profile.activities.length ? (
                      <span className="chips">
                        {profile.activities.map((id) => (
                          <span key={id} className="chip on static">
                            {labelFor(
                              ACTIVITY_GROUPS.flatMap((g) => g.items),
                              id,
                            )}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="muted">Not added yet</span>
                    )}
                  </dd>
                </div>
                <Row
                  label="Matching"
                  value={
                    profile.visibleInMatching
                      ? "Include me when matching opens"
                      : "Not included"
                  }
                />
              </dl>

              <div className="controls" style={{ border: 0 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => setEditing(true)}
                >
                  <Pencil aria-hidden="true" /> Edit my profile
                </button>
              </div>

              {/* The other two things a member owns. Linked, never shown
                  here — see the header. */}
              <div className="me-links">
                <Link className="me-link" href="/review">
                  <FileText aria-hidden="true" />
                  <span>
                    <strong>My answers</strong>
                    Everything you have written, editable, on this device only.
                  </span>
                  <ArrowRight aria-hidden="true" />
                </Link>
                <Link className="me-link" href="/profile">
                  <Sparkles aria-hidden="true" />
                  <span>
                    <strong>My analysis</strong>
                    The reflection written from your answers.
                  </span>
                  <ArrowRight aria-hidden="true" />
                </Link>
                <Link className="me-link" href="/dashboard">
                  <ArrowRight aria-hidden="true" />
                  <span>
                    <strong>My account</strong>
                    Progress, billing, and your details.
                  </span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer member />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-row">
      <dt>{label}</dt>
      <dd>{value || <span className="muted">Not added yet</span>}</dd>
    </div>
  );
}

function Text({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

/**
 * A single choice, drawn as chips rather than a <select>.
 *
 * A select hides its options until tapped, which on a profile form means
 * someone cannot see that "Prefer not to say" or "Anyone" is available
 * without committing to opening the control. On these questions, what the
 * options ARE is part of what the product is telling them.
 */
function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="chips">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`chip${value === o.id ? " on" : ""}`}
            aria-pressed={value === o.id}
            /* Tapping the chosen one again clears it. Every one of these is
               optional, and a radio group with no way back is a trap. */
            onClick={() => onChange(value === o.id ? "" : o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
