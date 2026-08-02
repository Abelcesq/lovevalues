"use client";

/**
 * Module 1 — the Values Card Sort.
 *
 * Three passes, in order:
 *   1. Sort every card into Very Important / Important / Not Important.
 *   2. Reduce "Very Important" down to a top 10.
 *   3. Cut the 10 down to 3–5 core values.
 *
 * The difficulty of pass 3 is the point — it reveals what wins when values
 * collide. We say so out loud rather than hiding it, because a user who
 * understands why it's hard will sit with it instead of guessing.
 */

import { useMemo, useState } from "react";
import {
  SORT_BUCKETS,
  VALUE_CARDS,
  allValueCards,
  makeCustomValueId,
  type SortBucket,
} from "@/lib/method";
import type { ProfileState } from "@/lib/store";
import VoiceInput from "./VoiceInput";

type Props = {
  profile: ProfileState;
  update: (mutate: (draft: ProfileState) => ProfileState) => void;
  /** 0 = sort, 1 = top ten, 2 = core, 3 = operationalize */
  pass: number;
};

export default function ValuesCardSort({ profile, update, pass }: Props) {
  const veryImportant = useMemo(
    () =>
      allValueCards(profile.customValues).filter(
        (c) => profile.sort[c.id] === "very-important",
      ),
    [profile.sort],
  );

  if (pass === 0) return <PassSort profile={profile} update={update} />;
  if (pass === 1)
    return (
      <PassTopTen profile={profile} update={update} pool={veryImportant} />
    );
  if (pass === 2) return <PassCore profile={profile} update={update} />;
  return <PassOperationalize profile={profile} update={update} />;
}

/* ---------------- Pass 1: sort every card ---------------- */

function PassSort({ profile, update }: Omit<Props, "pass">) {
  const setBucket = (id: string, bucket: SortBucket) =>
    update((p) => ({ ...p, sort: { ...p.sort, [id]: bucket } }));

  /* Removing a custom value has to clear it from every list it reached, not
     just the card grid. Left behind in topTen or coreValues it becomes an id
     with no label — which renders as a blank row rather than an error. */
  const removeCustom = (id: string) =>
    update((p) => {
      const { [id]: _dropped, ...sort } = p.sort;
      return {
        ...p,
        customValues: (p.customValues ?? []).filter((c) => c.id !== id),
        sort,
        topTen: p.topTen.filter((v) => v !== id),
        coreValues: p.coreValues.filter((v) => v !== id),
        operationalized: Object.fromEntries(
          Object.entries(p.operationalized).filter(([k]) => k !== id),
        ),
      };
    });

  const cards = allValueCards(profile.customValues);
  const sorted = cards.filter((c) => profile.sort[c.id]).length;

  return (
    <div>
      <PassHeader
        step="First pass"
        title="Sort each value"
        note="Go with your gut. You can change any of these later, and most people do."
        progress={`${sorted} of ${cards.length} sorted`}
      />

      <div className="card-grid">
        {cards.map((card) => {
          const chosen = profile.sort[card.id];
          return (
            <div key={card.id} className={`vcard ${chosen ? "vcard-set" : ""}`}>
              <h4>{card.label}</h4>
              <p>{card.hint}</p>
              {card.id.startsWith("custom-") && (
                <button
                  type="button"
                  className="vcard-remove"
                  aria-label={`Remove ${card.label}`}
                  title={`Remove ${card.label}`}
                  onClick={() => removeCustom(card.id)}
                >
                  Remove
                </button>
              )}
              <div
                className="vcard-buckets"
                role="group"
                aria-label={`How important is ${card.label}?`}
              >
                {SORT_BUCKETS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`bucket ${chosen === b.id ? "sel" : ""}`}
                    onClick={() => setBucket(card.id, b.id)}
                    title={b.note}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* "Other" — a value in the person's own word.

          The 32 cards are a starting vocabulary, not the whole of what anyone
          values. Someone whose most important word is not on the list would
          otherwise sort 32 things that are not quite it and end up with a
          profile built around the closest available approximation.

          A custom value is a first-class citizen from here on: it sorts, it can
          reach the top ten, it can be chosen as a core value, it gets
          operationalised, and it reaches the synthesis engine like any other.
          That only works because every downstream lookup goes through
          allValueCards() rather than VALUE_CARDS. */}
      <div className="other-value">
        <h4>Something else?</h4>
        <p>
          These 32 are a starting point, not the whole list. If a word matters
          to you and isn&apos;t here, add it — it counts exactly the same from
          here on.
        </p>
        <AddValue profile={profile} update={update} />
      </div>
    </div>
  );
}

/* ---------------- Pass 2: down to ten ---------------- */

function PassTopTen({
  profile,
  update,
  pool,
}: Omit<Props, "pass"> & { pool: typeof VALUE_CARDS }) {
  const toggle = (id: string) =>
    update((p) => {
      const has = p.topTen.includes(id);
      if (has) return { ...p, topTen: p.topTen.filter((x) => x !== id) };
      if (p.topTen.length >= 10) return p;
      return { ...p, topTen: [...p.topTen, id] };
    });

  if (pool.length === 0) {
    return (
      <div className="empty-note">
        <p>
          Nothing is marked <em>very important</em> yet. Go back to the first
          pass and sort a few cards — then this step will have something to work
          with.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PassHeader
        step="Second pass"
        title="Now choose your top ten"
        note="Only from what you called very important. If you have fewer than ten, that's a clear signal, not a gap."
        progress={`${profile.topTen.length} of 10 chosen`}
      />
      <div className="chip-grid">
        {pool.map((card) => (
          <button
            key={card.id}
            type="button"
            className={`chip ${profile.topTen.includes(card.id) ? "sel" : ""}`}
            onClick={() => toggle(card.id)}
            aria-pressed={profile.topTen.includes(card.id)}
          >
            {card.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Pass 3: the core 3–5 ---------------- */

function PassCore({ profile, update }: Omit<Props, "pass">) {
  const pool = allValueCards(profile.customValues).filter((c) =>
    profile.topTen.includes(c.id),
  );

  const toggle = (id: string) =>
    update((p) => {
      const has = p.coreValues.includes(id);
      if (has)
        return { ...p, coreValues: p.coreValues.filter((x) => x !== id) };
      if (p.coreValues.length >= 5) return p;
      return { ...p, coreValues: [...p.coreValues, id] };
    });

  if (pool.length === 0) {
    return (
      <div className="empty-note">
        <p>Choose your top ten first, and they'll appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <PassHeader
        step="Final pass"
        title="Cut it to three, four, or five"
        note="This one is supposed to be hard. What you're really deciding is what wins when two things you love pull in opposite directions — and that is the most useful thing you'll learn today."
        progress={`${profile.coreValues.length} chosen — 3 to 5`}
      />
      <div className="chip-grid">
        {pool.map((card) => (
          <button
            key={card.id}
            type="button"
            className={`chip chip-lg ${profile.coreValues.includes(card.id) ? "sel" : ""}`}
            onClick={() => toggle(card.id)}
            aria-pressed={profile.coreValues.includes(card.id)}
          >
            {card.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Pass 4: value → behavior ---------------- */

function PassOperationalize({ profile, update }: Omit<Props, "pass">) {
  const core = allValueCards(profile.customValues).filter((c) =>
    profile.coreValues.includes(c.id),
  );

  const set = (
    id: string,
    field: "definition" | "dos" | "donts",
    value: string,
  ) =>
    update((p) => {
      const current = p.operationalized[id] ?? {
        definition: "",
        dos: "",
        donts: "",
      };
      return {
        ...p,
        operationalized: {
          ...p.operationalized,
          [id]: { ...current, [field]: value },
        },
      };
    });

  if (core.length === 0) {
    return (
      <div className="empty-note">
        <p>Choose your core values first, and they'll appear here to define.</p>
      </div>
    );
  }

  return (
    <div>
      <PassHeader
        step="Value to behavior"
        title="Now make them usable"
        note="A value nobody can see isn't a value yet — it's a word. For each one: what it means to you, what living it looks like, and what tells you it's being compromised."
      />

      {core.map((card) => {
        const v = profile.operationalized[card.id] ?? {
          definition: "",
          dos: "",
          donts: "",
        };
        return (
          <section key={card.id} className="op-block">
            <h3>{card.label}</h3>

            <label className="op-label" id={`def-${card.id}`}>
              What this means to me
            </label>
            <VoiceInput
              id={`def-input-${card.id}`}
              ariaLabelledBy={`def-${card.id}`}
              value={v.definition}
              rows={3}
              placeholder="In your own words…"
              onChange={(next) => set(card.id, "definition", next)}
            />

            <label className="op-label" id={`dos-${card.id}`}>
              Behaviors that show I live it
            </label>
            <VoiceInput
              id={`dos-input-${card.id}`}
              ariaLabelledBy={`dos-${card.id}`}
              value={v.dos}
              rows={3}
              placeholder="What someone would actually see me do…"
              onChange={(next) => set(card.id, "dos", next)}
            />

            <label className="op-label" id={`donts-${card.id}`}>
              Behaviors that signal it's being compromised
            </label>
            <VoiceInput
              id={`donts-input-${card.id}`}
              ariaLabelledBy={`donts-${card.id}`}
              value={v.donts}
              rows={3}
              placeholder="My own boundary — the line I notice when it's crossed…"
              onChange={(next) => set(card.id, "donts", next)}
            />
          </section>
        );
      })}
    </div>
  );
}

/**
 * The "Other" input.
 *
 * Kept deliberately small: one word or short phrase, no description field.
 * Asking someone to also write a definition here would stall them at the exact
 * moment they have momentum, and Pass 4 asks for the meaning properly anyway.
 */
function AddValue({ profile, update }: Omit<Props, "pass">) {
  const [label, setLabel] = useState("");

  const custom = profile.customValues ?? [];

  function add() {
    const clean = label.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!clean) return;

    /* Don't let someone add a word that is already on a card — they would end
       up rating the same value twice and wondering which one counted. */
    const existing = allValueCards(custom).find(
      (c) => c.label.toLowerCase() === clean.toLowerCase(),
    );
    if (existing) {
      setLabel("");
      return;
    }

    const id = makeCustomValueId(
      clean,
      custom.map((c) => c.id),
    );
    update((p) => ({
      ...p,
      customValues: [
        ...(p.customValues ?? []),
        { id, label: clean, hint: "Your own word." },
      ],
    }));
    setLabel("");
  }

  return (
    <div className="other-add">
      <label htmlFor="other-value" className="sr-only">
        Add a value in your own words
      </label>
      <input
        id="other-value"
        type="text"
        value={label}
        maxLength={40}
        /* Deliberately NOT one of the 32. An example that is already a card
           gets silently refused by the duplicate guard, which reads as the
           feature being broken. */
        placeholder="e.g. Playfulness"
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          /* Enter adds the value. Without this the key would submit whatever
             form this sits inside, or do nothing, and people press Enter. */
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
      />
      <button
        type="button"
        className="btn btn-ghost"
        onClick={add}
        disabled={!label.trim()}
      >
        Add
      </button>
    </div>
  );
}

/* ---------------- shared ---------------- */

function PassHeader({
  step,
  title,
  note,
  progress,
}: {
  step: string;
  title: string;
  note: string;
  progress?: string;
}) {
  return (
    <header className="pass-head">
      <span className="eyebrow">{step}</span>
      <h2>{title}</h2>
      <p>{note}</p>
      {progress && <p className="pass-progress">{progress}</p>}
    </header>
  );
}
