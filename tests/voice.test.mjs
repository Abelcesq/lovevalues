/**
 * Voice-constant guards.
 *
 * VOICE carries the posture the CEO directed into every generated document.
 * It was written from named sources — his own book among them — under a strict
 * condition: principles and register only, never facts, biography, titles, or
 * attributions. Two hard rules ride on that holding.
 *
 *   Hard rule 1 (standalone brand): no founder or personal brand may reach a
 *   user-facing surface. A system prompt IS user-facing by proxy — whatever it
 *   names, the model may repeat.
 *
 *   Hard rule 7 (faith posture): the release-of-resentment material includes a
 *   step addressed to God. Imposed on someone who holds no faith, that is the
 *   product preaching. It must stay conditional.
 *
 * What these tests can and cannot do, stated honestly: they catch DELETION and
 * NAME LEAKAGE on a later edit. They cannot judge whether the prose is any
 * good, and they cannot verify the model obeys it — only a real generation
 * shows that. They are a tripwire, not a proof.
 *
 * Run: npm test
 */

import assert from "node:assert/strict";
import test from "node:test";
import { VOICE } from "../lib/method.ts";

/* Every proper noun that went into writing VOICE, plus the personal brand the
   product must never surface. If a future edit reintroduces one as an
   attribution — "as one author put it" is fine, naming him is not — this fails. */
const FORBIDDEN = [
  "Abel",
  "Calder", // matches Calderón and Calderon
  "My Path to Me",
  "Louise",
  "Hay",
  "Jim Rohn",
  "Rohn",
  "Twelve Pillars",
  "Widener",
  "Hill", // Napoleon Hill, via the board
  "Robbins",
  "Munger",
];

/* Matched at a WORD BOUNDARY, not as a bare substring.
   A plain `includes()` reads "abel" inside the word "label" and fails the
   build for a sentence that names nobody — which it did, the moment VOICE
   gained a section about labelling each point. A guard that cries wolf on
   ordinary English gets weakened or deleted, and then it is not protecting
   hard rule 1 at all. Leading boundary only, so "Calder" still catches
   "Calderón". */
const leaks = (haystack, needle) =>
  new RegExp(
    `\\b${needle.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}`,
    "i",
  ).test(haystack);

test("VOICE names no source, author, book, or personal brand", () => {
  for (const name of FORBIDDEN) {
    assert.equal(
      leaks(VOICE, name),
      false,
      `VOICE leaks "${name}" — hard rule 1 forbids naming a source or personal brand anywhere a user can reach.`,
    );
  }
});

test("the brand guard itself does not fire on ordinary English", () => {
  // The regression that made this guard word-boundary aware: "label" contains
  // "abel". If this ever fails, the guard has gone back to substring matching
  // and will block innocent copy.
  assert.equal(
    leaks("Lead each point with a short plain label:", "Abel"),
    false,
  );
  assert.equal(leaks("a syllable, a table, a fable", "Abel"), false);
  // ...while still catching the real thing, in either spelling.
  assert.equal(leaks("as Abel wrote", "Abel"), true);
  assert.equal(leaks("Abel Calderón said", "Calder"), true);
});

test("VOICE instructs the model never to cite a source either", () => {
  // Not enough that VOICE is itself clean — it must forbid the model from
  // inventing an attribution of its own.
  const lower = VOICE.toLowerCase();
  assert.ok(lower.includes("never name"), "VOICE must forbid naming sources");
  assert.ok(lower.includes("book"), "the prohibition must cover books");
  assert.ok(lower.includes("author"), "the prohibition must cover authors");
});

test("VOICE keeps the four directives the CEO asked for", () => {
  const lower = VOICE.toLowerCase();

  // 1. Stewardship order: self, values, then partner — the spine of the ask.
  assert.ok(lower.includes("steward"), "stewardship framing is missing");

  // 2. Release of anger and resentment, and that it is carried in the body.
  assert.ok(lower.includes("resentment"), "resentment release is missing");
  assert.ok(lower.includes("body"), "the body-carries-it point is missing");

  // 3. Personal responsibility / congruence between values and daily action.
  assert.ok(lower.includes("congruence"), "congruence framing is missing");

  // 4. Explicit agreements with a partner on shared values.
  assert.ok(lower.includes("agreement"), "the agreements directive is missing");
});

test("the God-level of release stays conditional on the user holding a faith", () => {
  // Hard rule 7. The forgiveness sequence ends at God; that step must never be
  // offered to someone whose answers show no faith.
  assert.ok(
    /only if their own words show they hold a faith/i.test(VOICE),
    "the faith-conditional guard on the release sequence has been weakened or removed",
  );
});

test("VOICE forbids hunting for a wound", () => {
  // Hard rule 3. Release material is the likeliest place for the engine to
  // start excavating trauma the user never raised.
  assert.ok(
    /never go looking/i.test(VOICE),
    "the do-not-excavate boundary is missing",
  );
  assert.ok(
    /only for what they raised|only for what THEY raised/i.test(VOICE),
    "release must be bounded to what the user raised themselves",
  );
});

test("VOICE keeps responsibility from becoming blame", () => {
  // The one place the personal-responsibility register can collide with the
  // empathy hard rule. The prompt must resolve it explicitly.
  assert.ok(
    /never let a call to ownership become an assignment of blame/i.test(VOICE),
  );
  assert.ok(
    /what was done to them/i.test(VOICE),
    "agency must be explicitly scoped away from what happened TO the person",
  );
});

test("VOICE routes genuine distress to a human being", () => {
  // Hard rule 5. The release material must not read as therapy.
  assert.ok(
    /professional/i.test(VOICE),
    "VOICE must route heavy material to real human help",
  );
});

test("VOICE never lets thoughts be framed as the cause or cure of illness", () => {
  // The single most dangerous idea adjacent to the self-love and release
  // material, and the reason this guard exists rather than trusting the prose:
  // a user reading this may be seriously ill. Telling them their mind produced
  // their disease adds guilt to illness and steers them away from a doctor.
  // It would also sit badly beside LEGAL_DISCLOSURE, which states plainly that
  // nothing here is medical or psychological advice.
  assert.ok(
    /never suggest that a person's thoughts, resentment, or emotional patterns caused/i.test(
      VOICE,
    ),
    "the prohibition on mind-causes-illness claims has been weakened or removed",
  );
  assert.ok(
    /doctor/i.test(VOICE),
    "VOICE must point a user who raises their health toward their doctor",
  );
});

test("VOICE supplies no cosmology", () => {
  // Hard rule 7 again, from the other direction: the faith-conditional guard
  // stops the product withholding faith from someone who holds it; this stops
  // it imposing one on someone who does not.
  assert.ok(
    /never assert a metaphysical mechanism as fact/i.test(VOICE),
    "the prohibition on asserting a cosmology has been weakened or removed",
  );
  assert.ok(/do not supply a cosmology/i.test(VOICE));
});

test("VOICE keeps the present-moment and willingness framing", () => {
  const lower = VOICE.toLowerCase();

  // Change is possible now regardless of how long a pattern has run — the
  // difference between a reflection that shames and one that mobilizes.
  assert.ok(
    lower.includes("leverage"),
    "the present-moment leverage framing is missing",
  );

  // Nobody needs to know HOW before they can begin.
  assert.ok(
    /willingness is the threshold, not ability/i.test(VOICE),
    "the willingness-is-enough framing is missing",
  );

  // Self-criticism entrenches the pattern it targets. This is the hinge that
  // keeps the personal-responsibility register from curdling into self-blame,
  // so it is load-bearing for more than its own sake.
  assert.ok(
    /criticism is what cements/i.test(VOICE),
    "the acceptance-enables-change mechanic is missing",
  );
});

test("VOICE separates chosen values from inherited obligation", () => {
  // Directly serves Module 1, the crux of the whole method: a "should" absorbed
  // from a parent or a faith community is a weight, not a value.
  assert.ok(
    /should/i.test(VOICE),
    "the inherited-obligation distinction is missing",
  );
  assert.ok(
    /inherited obligation/i.test(VOICE),
    "VOICE must name inherited obligation explicitly",
  );
});
