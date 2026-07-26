/**
 * Speech-helper tests.
 *
 * These lock in two device-level lessons borrowed from EZAITASK's production
 * implementation. Both fail silently and only on the platform we care about
 * most — a phone — so they are exactly the kind of thing that regresses
 * unnoticed if nothing asserts on it.
 *
 * Run: npm test
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { joinSpoken, preferredLang } from '../lib/speech.ts';

test('joinSpoken inserts the space iOS omits', () => {
  // iOS Safari returns transcripts with no leading whitespace. Without a
  // separator, "hello" then "milk" becomes "hellomilk".
  assert.equal(joinSpoken('hello', 'milk'), 'hello milk');
  assert.equal(joinSpoken('My father', 'was quiet'), 'My father was quiet');
});

test('joinSpoken does not double a space either side already supplies', () => {
  // Desktop Chrome supplies the leading space itself.
  assert.equal(joinSpoken('hello', ' milk'), 'hello milk');
  assert.equal(joinSpoken('hello ', 'milk'), 'hello milk');
  assert.equal(joinSpoken('hello ', ' milk'), 'hello  milk'); // caller collapses runs
});

test('joinSpoken handles empty sides without inventing whitespace', () => {
  assert.equal(joinSpoken('', 'milk'), 'milk');
  assert.equal(joinSpoken('hello', ''), 'hello');
  assert.equal(joinSpoken('', ''), '');
});

test('joinSpoken preserves a trailing space rather than trimming it', () => {
  // Never trim the accumulated value — a trailing space the user dictated is
  // theirs to keep, and trimming eats it on every result event.
  assert.equal(joinSpoken('hello ', ''), 'hello ');
});

test('preferredLang upgrades a bare language code to a full tag', () => {
  // navigator.language often returns "en"; engines recognize materially
  // better given a full locale.
  assert.equal(preferredLang('en'), 'en-US');
  assert.equal(preferredLang('es'), 'en-US');
  assert.equal(preferredLang(''), 'en-US');
  assert.equal(preferredLang(undefined), 'en-US');
  assert.equal(preferredLang(null), 'en-US');
});

test('preferredLang passes through a full locale tag untouched', () => {
  assert.equal(preferredLang('en-GB'), 'en-GB');
  assert.equal(preferredLang('es-MX'), 'es-MX');
  assert.equal(preferredLang(' fr-CA '), 'fr-CA');
});
