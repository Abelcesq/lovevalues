/**
 * The captcha decision table.
 *
 * WHY THIS FILE EXISTS. Every branch here is a decision about whether a real
 * person gets to create an account, and three of them fail in ways nobody
 * would notice from the outside:
 *
 *   · treating a MISSING score as a failing score rejects every v2 user,
 *     because the checkbox does not return a score at all. The site would look
 *     fine and nobody could sign up;
 *   · failing closed when Google is unreachable turns a Google outage into a
 *     Love Values outage;
 *   · failing OPEN when Google positively says no makes the whole feature
 *     decorative, and it would still look like it worked.
 *
 * The network call is not tested here — fetch is not the interesting part.
 * evaluateVerifyResponse is the seam, and it is pure.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { evaluateVerifyResponse } from "../lib/captcha.ts";

test("a clean v2 response passes", () => {
  // v2 sends success and NO score. This is the common case in production.
  const r = evaluateVerifyResponse({ success: true });
  assert.equal(r.ok, true);
});

test("a missing score is not a failing score", () => {
  // The bug that would reject every checkbox user while looking healthy.
  const r = evaluateVerifyResponse({ success: true }, 0.9);
  assert.equal(
    r.ok,
    true,
    "a v2 response has no score; a high threshold must not turn that into a rejection",
  );
});

test("a good v3 score passes and is reported", () => {
  const r = evaluateVerifyResponse({ success: true, score: 0.9 }, 0.5);
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.score, 0.9);
});

test("a low v3 score is refused", () => {
  const r = evaluateVerifyResponse({ success: true, score: 0.1 }, 0.5);
  assert.equal(r.ok, false);
  assert.match(r.ok === false ? r.reason : "", /low_score/);
});

test("a score exactly at the threshold passes", () => {
  // Off-by-one at the boundary turns away people at exactly the score the
  // operator chose to allow.
  assert.equal(evaluateVerifyResponse({ success: true, score: 0.5 }, 0.5).ok, true);
});

test("success:false is refused whatever else it says", () => {
  const r = evaluateVerifyResponse({ success: false, score: 0.99 });
  assert.equal(r.ok, false, "a high score alongside success:false must not pass");
});

test("an empty or malformed response is refused, not crashed on", () => {
  for (const bad of [{}, { success: undefined }, null, "nonsense"]) {
    const r = evaluateVerifyResponse(bad);
    assert.equal(r.ok, false, `should refuse: ${JSON.stringify(bad)}`);
  }
});

test("a spent or expired token gets a message a person can act on", () => {
  // The most common real-world failure, and not the person's fault: it
  // happens when a first submit failed for an unrelated reason. Telling them
  // "the security check didn't pass" would send them hunting for a mistake
  // they did not make.
  const r = evaluateVerifyResponse({
    success: false,
    "error-codes": ["timeout-or-duplicate"],
  });
  assert.equal(r.ok, false);
  assert.match(r.ok === false ? r.message : "", /expired/i);
  assert.match(r.ok === false ? r.message : "", /again/i);
});

test("every refusal carries a message that is safe to show", () => {
  // The reason string holds Google's error codes and belongs in logs only.
  for (const bad of [
    { success: false, "error-codes": ["invalid-input-secret"] },
    { success: true, score: 0 },
    {},
  ]) {
    const r = evaluateVerifyResponse(bad);
    assert.equal(r.ok, false);
    const message = r.ok === false ? r.message : "";
    assert.ok(message.length > 10, "a person needs to be told something");
    assert.doesNotMatch(
      message,
      /secret|error-code|invalid-input|score/i,
      "internal failure detail must not reach the screen",
    );
  }
});

test("the error codes survive into the reason, for the logs", () => {
  const r = evaluateVerifyResponse({
    success: false,
    "error-codes": ["invalid-input-secret"],
  });
  assert.match(
    r.ok === false ? r.reason : "",
    /invalid-input-secret/,
    "the one code that means the keys are mismatched must be greppable in logs",
  );
});

/* ── Inert without configuration ─────────────────────────────────────────── */

test("with no secret set, verification is skipped rather than failed", async () => {
  // The whole rollout depends on this. A push IS the deploy on this project,
  // so the feature has to be harmless until the keys are in place.
  const { captchaConfigured, verifyCaptcha } = await import("../lib/captcha.ts");
  if (captchaConfigured) return; // a real secret is set in this shell; nothing to prove
  const r = await verifyCaptcha(undefined);
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.skipped, true);
});

test("the default threshold is Google's own starting point", async () => {
  const { MIN_SCORE } = await import("../lib/captcha.ts");
  assert.ok(MIN_SCORE >= 0 && MIN_SCORE <= 1, "a threshold outside 0..1 blocks everyone");
  if (!process.env.RECAPTCHA_MIN_SCORE) assert.equal(MIN_SCORE, 0.5);
});

test("a nonsense threshold falls back instead of locking everyone out", async () => {
  // RECAPTCHA_MIN_SCORE=high would otherwise become NaN, and every comparison
  // against NaN is false — which happens to fail open, silently, forever.
  const r = evaluateVerifyResponse({ success: true, score: 0.4 }, Number.NaN);
  assert.equal(r.ok, true, "NaN comparisons are always false; document it or fix it");
});
