'use client';

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

import { useMemo } from 'react';
import { SORT_BUCKETS, VALUE_CARDS, type SortBucket } from '@/lib/method';
import type { ProfileState } from '@/lib/store';
import VoiceInput from './VoiceInput';

type Props = {
  profile: ProfileState;
  update: (mutate: (draft: ProfileState) => ProfileState) => void;
  /** 0 = sort, 1 = top ten, 2 = core, 3 = operationalize */
  pass: number;
};

export default function ValuesCardSort({ profile, update, pass }: Props) {
  const veryImportant = useMemo(
    () => VALUE_CARDS.filter((c) => profile.sort[c.id] === 'very-important'),
    [profile.sort],
  );

  if (pass === 0) return <PassSort profile={profile} update={update} />;
  if (pass === 1) return <PassTopTen profile={profile} update={update} pool={veryImportant} />;
  if (pass === 2) return <PassCore profile={profile} update={update} />;
  return <PassOperationalize profile={profile} update={update} />;
}

/* ---------------- Pass 1: sort every card ---------------- */

function PassSort({ profile, update }: Omit<Props, 'pass'>) {
  const setBucket = (id: string, bucket: SortBucket) =>
    update((p) => ({ ...p, sort: { ...p.sort, [id]: bucket } }));

  const sorted = Object.keys(profile.sort).length;

  return (
    <div>
      <PassHeader
        step="First pass"
        title="Sort each value"
        note="Go with your gut. You can change any of these later, and most people do."
        progress={`${sorted} of ${VALUE_CARDS.length} sorted`}
      />

      <div className="card-grid">
        {VALUE_CARDS.map((card) => {
          const chosen = profile.sort[card.id];
          return (
            <div key={card.id} className={`vcard ${chosen ? 'vcard-set' : ''}`}>
              <h4>{card.label}</h4>
              <p>{card.hint}</p>
              <div className="vcard-buckets" role="group" aria-label={`How important is ${card.label}?`}>
                {SORT_BUCKETS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`bucket ${chosen === b.id ? 'sel' : ''}`}
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
    </div>
  );
}

/* ---------------- Pass 2: down to ten ---------------- */

function PassTopTen({
  profile,
  update,
  pool,
}: Omit<Props, 'pass'> & { pool: typeof VALUE_CARDS }) {
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
          Nothing is marked <em>very important</em> yet. Go back to the first pass and sort a few
          cards — then this step will have something to work with.
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
            className={`chip ${profile.topTen.includes(card.id) ? 'sel' : ''}`}
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

function PassCore({ profile, update }: Omit<Props, 'pass'>) {
  const pool = VALUE_CARDS.filter((c) => profile.topTen.includes(c.id));

  const toggle = (id: string) =>
    update((p) => {
      const has = p.coreValues.includes(id);
      if (has) return { ...p, coreValues: p.coreValues.filter((x) => x !== id) };
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
            className={`chip chip-lg ${profile.coreValues.includes(card.id) ? 'sel' : ''}`}
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

function PassOperationalize({ profile, update }: Omit<Props, 'pass'>) {
  const core = VALUE_CARDS.filter((c) => profile.coreValues.includes(c.id));

  const set = (id: string, field: 'definition' | 'dos' | 'donts', value: string) =>
    update((p) => {
      const current = p.operationalized[id] ?? { definition: '', dos: '', donts: '' };
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
        const v = profile.operationalized[card.id] ?? { definition: '', dos: '', donts: '' };
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
              onChange={(next) => set(card.id, 'definition', next)}
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
              onChange={(next) => set(card.id, 'dos', next)}
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
              onChange={(next) => set(card.id, 'donts', next)}
            />
          </section>
        );
      })}
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
