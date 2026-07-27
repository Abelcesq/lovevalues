/**
 * Fallback-response parsing tests.
 *
 * The <think>-stripping cases are not cosmetic. DeepSeek-R1 emits its
 * chain-of-thought inline, and on this product that reasoning is a model
 * musing about a real person's parents. If a leaked block reached the profile
 * page, the user would read the machine thinking out loud about their family —
 * which is both a privacy failure and the precise opposite of "a mirror, not a
 * verdict".
 *
 * Run: npm test
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { extractJson } from '../lib/llm.ts';

test('parses a bare JSON object', () => {
  assert.deepEqual(extractJson('{"careFlag":"none","coreValues":[]}'), {
    careFlag: 'none',
    coreValues: [],
  });
});

test('strips a <think> block before parsing', () => {
  const raw =
    '<think>The user describes their father as distant. I should be careful not to diagnose.</think>\n{"careFlag":"none"}';
  assert.deepEqual(extractJson(raw), { careFlag: 'none' });
});

test('strips an UNCLOSED <think> block rather than leaking it', () => {
  // Truncated output (hit max_tokens mid-reasoning). There is no JSON to find,
  // and the important property is that we return null instead of surfacing the
  // reasoning as if it were content.
  const raw = '<think>Let me consider what this says about their childhood and';
  assert.equal(extractJson(raw), null);
});

test('no reasoning text survives into the parsed result', () => {
  const raw =
    '<think>SECRET REASONING ABOUT THEIR MOTHER</think>{"operatingSystem":"You tend to go quiet."}';
  const parsed = extractJson(raw);
  assert.equal(JSON.stringify(parsed).includes('SECRET'), false);
  assert.deepEqual(parsed, { operatingSystem: 'You tend to go quiet.' });
});

test('handles ```json fences', () => {
  assert.deepEqual(extractJson('```json\n{"careFlag":"gentle"}\n```'), { careFlag: 'gentle' });
});

test('handles prose before and after the object', () => {
  const raw = 'Here is the reflection you asked for:\n{"careFlag":"none"}\nLet me know if that helps.';
  assert.deepEqual(extractJson(raw), { careFlag: 'none' });
});

test('brace-matches through prose containing braces', () => {
  // The payload is long-form prose about a person's life. A lazy or greedy
  // regex gets one end or the other wrong as soon as a brace appears inside a
  // string value.
  const raw = '{"lovingFeedback":"They said {and I quote} it was fine.","careFlag":"none"}';
  assert.deepEqual(extractJson(raw), {
    lovingFeedback: 'They said {and I quote} it was fine.',
    careFlag: 'none',
  });
});

test('handles escaped quotes inside string values', () => {
  const raw = '{"howYouPresent":"You called it \\"keeping the peace\\".","careFlag":"none"}';
  assert.deepEqual(extractJson(raw), {
    howYouPresent: 'You called it "keeping the peace".',
    careFlag: 'none',
  });
});

test('returns null on unparseable input rather than throwing', () => {
  // Every null here must leave the caller reporting the ORIGINAL Anthropic
  // failure, not a second confusing one.
  assert.equal(extractJson(''), null);
  assert.equal(extractJson('I am unable to help with that request.'), null);
  assert.equal(extractJson('{"unterminated": '), null);
  assert.equal(extractJson('{{{{'), null);
});
