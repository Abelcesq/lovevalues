/**
 * The label parser, and the plain-English rules that produce the labels.
 *
 * WHY THIS FILE EXISTS. The CEO read a real reflection that opened "Here is the
 * gap, and it's the most useful thing in this document", used "gap" three times,
 * and never said what a gap was. His note: good analysis, too high level, put it
 * in basic English and put a plain summary label in front of each point.
 *
 * Two things had to hold for that, and both are guarded here:
 *
 *   1. splitLabel() must find a genuine label and must NOT fire on ordinary
 *      prose. It runs over model output, so a false positive would embolden a
 *      fragment mid-sentence — visibly broken. The false-positive cases below
 *      matter more than the true-positive ones, exactly as in care.test.mjs.
 *
 *   2. The instruction that produces those labels must forbid diagnosis. The
 *      CEO's own example was "Avoidant personality:", which is precisely the
 *      shape hard rule 2 rules out — a clinical label pinned to a person. The
 *      structure he asked for is right; the label has to describe behaviour.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { splitLabel } from "../lib/prose.ts";
import { VOICE } from "../lib/method.ts";

test("a real label is lifted out", () => {
  const r = splitLabel(
    "Going quiet when you are hurt: you told us you stay silent and use work to avoid.",
  );
  assert.ok(r, "should have matched");
  assert.equal(r.label, "Going quiet when you are hurt:");
  assert.match(r.rest, /^ you told us/);
});

test("the label keeps its own colon and nothing else", () => {
  const r = splitLabel(
    "Providing, then resenting: you give without asking, and the bill arrives later on.",
  );
  assert.equal(r.label, "Providing, then resenting:");
  assert.ok(!r.rest.includes("Providing"), "body must not repeat the label");
});

/* ── The cases that must NOT match. These are the load-bearing ones. ──────── */

test("ordinary prose with a mid-sentence colon is left alone", () => {
  assert.equal(
    splitLabel(
      "You wrote something that stayed with us: that you keep choosing the harder true thing even when it costs you.",
    ),
    null,
  );
});

test("a quoted line is not a label", () => {
  assert.equal(
    splitLabel(
      'She said: "I never really knew where I stood with him," and that has stayed with you.',
    ),
    null,
  );
});

test("a completed sentence before the colon is not a label", () => {
  assert.equal(
    splitLabel(
      "This is worth sitting with. Here is why: the pattern repeats across three relationships.",
    ),
    null,
  );
});

test("a paragraph with no colon is left alone", () => {
  assert.equal(
    splitLabel(
      "You have written a boundary against exactly what you do, and most people carry that for decades.",
    ),
    null,
  );
});

test("a whole sentence before a colon is too long to be a label", () => {
  assert.equal(
    splitLabel(
      "The thing you cannot tolerate in a partner is the thing you learned to be: that is the pattern.",
    ),
    null,
  );
});

test("a colon with nothing meaningful after it is not a label", () => {
  assert.equal(splitLabel("One more thing: yes."), null);
});

test("an empty or trivial paragraph is safe", () => {
  assert.equal(splitLabel(""), null);
  assert.equal(splitLabel(":"), null);
  assert.equal(splitLabel("Yes: no"), null);
});

/* ── The instructions behind the labels ──────────────────────────────────── */

test("VOICE demands plain English", () => {
  assert.match(
    VOICE,
    /PLAIN ENGLISH/,
    "the plain-English requirement must be stated as a requirement, not implied",
  );
});

test("VOICE forbids opening with an undefined term", () => {
  // The specific failure the CEO hit: "Here is the gap" with no gap defined.
  assert.match(
    VOICE,
    /NAME THE THING BEFORE YOU DISCUSS IT/,
    "VOICE must forbid using a term before defining it",
  );
  assert.ok(
    VOICE.includes("Here is the gap"),
    "VOICE should name the actual failing example so it is not repeated",
  );
});

test("VOICE asks for a short plain label on each point", () => {
  assert.match(VOICE, /LEAD EACH POINT WITH A SHORT PLAIN LABEL/);
});

test("VOICE forbids markdown in the labels", () => {
  // The renderer is not a markdown parser; asterisks would reach the screen.
  assert.match(
    VOICE,
    /Do not use asterisks, markdown, or numbering/i,
    "asking for bold would print literal asterisks to the user",
  );
});

test("VOICE forbids a diagnosis or personality type as a label", () => {
  // Hard rule 2. The CEO's example label was "Avoidant personality:" — the
  // structure was right and the label shape was not, so this must be explicit.
  assert.match(VOICE, /THE LABEL MUST NEVER BE A DIAGNOSIS OR A TYPE/);
  for (const banned of [
    "avoidant personality",
    "anxious attachment",
    "people-pleaser",
  ]) {
    assert.ok(
      VOICE.toLowerCase().includes(banned),
      `VOICE should name "${banned}" as an example of what not to write`,
    );
  }
});

test("VOICE keeps the label pointed at behaviour, not at the person", () => {
  assert.ok(
    /Label the BEHAVIOUR/i.test(VOICE),
    "the correction to a diagnosis label is to describe what they do",
  );
});
