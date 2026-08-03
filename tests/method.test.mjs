/**
 * The two questions about the sixty seconds that decide a relationship.
 *
 * WHY THIS FILE EXISTS. Everything else in Module 3 asks what a person is
 * LIKE — the gifts they bring, the traits that cost them, what they hold back.
 * Until 2026-08-03 the only question about behaviour under strain was "what do
 * you actually do in conflict", and the reflection had to infer the rest.
 *
 * The two added here close that. They are short, they are cheap to answer, and
 * they carry more predictive weight than anything else in the method:
 *
 *   · what repairs it, and — the half people never volunteer — whether they can
 *     take a repair when it is offered to them;
 *   · what happens in them in the first seconds of hearing a complaint, which
 *     is where a person's sense of their own worth becomes visible without
 *     ever having to ask them about it directly.
 *
 * The tests below pin the properties that make them work. A well-meaning edit
 * that sharpens the wording could easily drop the receiving half of repair, or
 * turn either question into an invitation to describe what a partner did —
 * which is a different product and a worse one.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { QUESTIONS, questionsForModule } from "../lib/method.ts";

const byId = (id) => QUESTIONS.find((q) => q.id === id);

test("both questions exist and sit in Patterns", () => {
  for (const id of ["patterns-repair", "patterns-complaint"]) {
    const q = byId(id);
    assert.ok(q, `${id} is missing from the method`);
    assert.equal(q.moduleId, "patterns");
    assert.equal(q.kind, "long-text", `${id} needs room for a story`);
    assert.ok(q.prompt.trim().length > 20);
    assert.ok(q.placeholder, `${id} should show what kind of answer is wanted`);
  }
});

test("neither is optional — these are the two that carry the most weight", () => {
  for (const id of ["patterns-repair", "patterns-complaint"]) {
    assert.notEqual(byId(id).optional, true);
  }
});

test("the repair question asks who moves first", () => {
  const q = byId("patterns-repair");
  assert.match(q.prompt, /who usually moves first/i);
});

test("the repair question keeps the receiving half", () => {
  // The load-bearing one. Asked only about offering a repair, people describe
  // themselves as reasonable and the pattern that actually costs them —
  // being reached for and not being ready to take it — never reaches the page.
  const q = byId("patterns-repair");
  assert.match(
    q.helper,
    /weren’t ready to take it|weren't ready to take it/i,
    "the helper must invite the times a repair was offered and not received",
  );
});

test("the complaint question asks about the first seconds, not the argument", () => {
  const q = byId("patterns-complaint");
  assert.match(q.helper, /first few seconds/i);
  assert.match(
    q.helper,
    /before you answer/i,
    "the reaction before the reply is the whole subject",
  );
});

test("neither question asks what the partner did", () => {
  // Module 3 is a mirror. A question that invites an account of someone else's
  // behaviour produces a case for the prosecution, and the reflection then has
  // to analyse a person who is not in the room.
  for (const id of ["patterns-repair", "patterns-complaint"]) {
    const q = byId(id);
    const text = `${q.prompt} ${q.helper ?? ""} ${q.placeholder ?? ""}`;
    assert.doesNotMatch(
      text,
      /what (did |your )?(they|he|she|your partner) did wrong|whose fault|who was right/i,
      `${id} should not invite a case against a partner`,
    );
  }
});

test("neither question reaches for a worst case", () => {
  // Hard rule 3's discipline, applied outside Roots: ask about the ordinary
  // bad night. Someone who wants to tell us about a frightening one still can,
  // and lib/care.ts is watching — but we never go looking for it.
  for (const id of ["patterns-repair", "patterns-complaint"]) {
    const q = byId(id);
    const text = `${q.prompt} ${q.helper ?? ""} ${q.placeholder ?? ""}`;
    assert.doesNotMatch(
      text,
      /\b(abuse|abusive|violence|violent|threat|afraid of (them|him|her))\b/i,
      `${id} must not prompt for harm`,
    );
  }
});

test("Patterns still reads in order: who you are, then what you do under strain", () => {
  const ids = questionsForModule("patterns").map((q) => q.id);
  assert.ok(
    ids.indexOf("patterns-conflict-now") < ids.indexOf("patterns-repair"),
    "what you do in conflict has to come before what repairs it",
  );
  assert.ok(
    ids.indexOf("patterns-repair") < ids.indexOf("patterns-complaint"),
    "the hardest of the two belongs last, after the person has warmed up",
  );
  assert.equal(
    ids.at(-1),
    "patterns-complaint",
    "these two close the module; a later question appended after them would bury them",
  );
});

test("every question id is unique", () => {
  // Two questions with the same id silently share one answer, and the second
  // one overwrites the first in localStorage with no error anywhere.
  const ids = QUESTIONS.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate question id");
});
