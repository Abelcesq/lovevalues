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

import assert from 'node:assert/strict';
import test from 'node:test';
import { VOICE } from '../lib/method.ts';

/* Every proper noun that went into writing VOICE, plus the personal brand the
   product must never surface. If a future edit reintroduces one as an
   attribution — "as one author put it" is fine, naming him is not — this fails. */
const FORBIDDEN = [
  'Abel',
  'Calder', // matches Calderón and Calderon
  'My Path to Me',
  'Louise',
  'Hay',
  'Jim Rohn',
  'Rohn',
  'Twelve Pillars',
  'Widener',
  'Hill', // Napoleon Hill, via the board
  'Robbins',
  'Munger',
];

test('VOICE names no source, author, book, or personal brand', () => {
  const lower = VOICE.toLowerCase();
  for (const name of FORBIDDEN) {
    assert.equal(
      lower.includes(name.toLowerCase()),
      false,
      `VOICE leaks "${name}" — hard rule 1 forbids naming a source or personal brand anywhere a user can reach.`,
    );
  }
});

test('VOICE instructs the model never to cite a source either', () => {
  // Not enough that VOICE is itself clean — it must forbid the model from
  // inventing an attribution of its own.
  const lower = VOICE.toLowerCase();
  assert.ok(lower.includes('never name'), 'VOICE must forbid naming sources');
  assert.ok(lower.includes('book'), 'the prohibition must cover books');
  assert.ok(lower.includes('author'), 'the prohibition must cover authors');
});

test('VOICE keeps the four directives the CEO asked for', () => {
  const lower = VOICE.toLowerCase();

  // 1. Stewardship order: self, values, then partner — the spine of the ask.
  assert.ok(lower.includes('steward'), 'stewardship framing is missing');

  // 2. Release of anger and resentment, and that it is carried in the body.
  assert.ok(lower.includes('resentment'), 'resentment release is missing');
  assert.ok(lower.includes('body'), 'the body-carries-it point is missing');

  // 3. Personal responsibility / congruence between values and daily action.
  assert.ok(lower.includes('congruence'), 'congruence framing is missing');

  // 4. Explicit agreements with a partner on shared values.
  assert.ok(lower.includes('agreement'), 'the agreements directive is missing');
});

test('the God-level of release stays conditional on the user holding a faith', () => {
  // Hard rule 7. The forgiveness sequence ends at God; that step must never be
  // offered to someone whose answers show no faith.
  assert.ok(
    /only if their own words show they hold a faith/i.test(VOICE),
    'the faith-conditional guard on the release sequence has been weakened or removed',
  );
});

test('VOICE forbids hunting for a wound', () => {
  // Hard rule 3. Release material is the likeliest place for the engine to
  // start excavating trauma the user never raised.
  assert.ok(/never go looking/i.test(VOICE), 'the do-not-excavate boundary is missing');
  assert.ok(
    /only for what they raised|only for what THEY raised/i.test(VOICE),
    'release must be bounded to what the user raised themselves',
  );
});

test('VOICE keeps responsibility from becoming blame', () => {
  // The one place the personal-responsibility register can collide with the
  // empathy hard rule. The prompt must resolve it explicitly.
  assert.ok(/never let a call to ownership become an assignment of blame/i.test(VOICE));
  assert.ok(
    /what was done to them/i.test(VOICE),
    'agency must be explicitly scoped away from what happened TO the person',
  );
});

test('VOICE routes genuine distress to a human being', () => {
  // Hard rule 5. The release material must not read as therapy.
  assert.ok(/professional/i.test(VOICE), 'VOICE must route heavy material to real human help');
});
