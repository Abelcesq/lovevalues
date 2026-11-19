/**
 * The rate limiter guarding the endpoint that spends money.
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS. /api/synthesize calls a frontier model
 * with a 32,000 token ceiling and had no authentication, no rate limit and no
 * input cap, on a public site. The failure mode is not an outage — it is an
 * invoice. So the cases that must REFUSE are the point here.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { __resetRateLimits, rateLimit } from "../lib/rateLimit.ts";

const T0 = 1_000_000;
const WINDOW = 60_000;

test("allows up to the limit, then refuses", () => {
  __resetRateLimits();
  for (let i = 0; i < 3; i += 1) {
    assert.equal(rateLimit("k", 3, WINDOW, T0).ok, true, `call ${i + 1}`);
  }
  assert.equal(rateLimit("k", 3, WINDOW, T0).ok, false, "the fourth is refused");
});

test("remaining counts down and never goes negative", () => {
  __resetRateLimits();
  assert.equal(rateLimit("k", 2, WINDOW, T0).remaining, 1);
  assert.equal(rateLimit("k", 2, WINDOW, T0).remaining, 0);
  assert.equal(rateLimit("k", 2, WINDOW, T0).remaining, 0);
});

test("the window reopens, and not a moment before", () => {
  __resetRateLimits();
  rateLimit("k", 1, WINDOW, T0);
  assert.equal(rateLimit("k", 1, WINDOW, T0 + WINDOW - 1).ok, false, "still closed");
  assert.equal(rateLimit("k", 1, WINDOW, T0 + WINDOW).ok, true, "reopened");
});

test("keys are independent — one person cannot lock out another", () => {
  __resetRateLimits();
  rateLimit("user:1", 1, WINDOW, T0);
  assert.equal(rateLimit("user:1", 1, WINDOW, T0).ok, false);
  assert.equal(rateLimit("user:2", 1, WINDOW, T0).ok, true);
});

test("retryAfter is a usable number of seconds", () => {
  __resetRateLimits();
  rateLimit("k", 1, WINDOW, T0);
  const v = rateLimit("k", 1, WINDOW, T0 + 10_000);
  assert.equal(v.ok, false);
  assert.equal(v.retryAfter, 50, "the remainder of the window, in seconds");
  /* Never zero on a refusal: a Retry-After of 0 invites an immediate retry,
     which is the opposite of the instruction. */
  assert.ok(v.retryAfter >= 1);
});

test("cycling keys cannot grow memory without bound", () => {
  // The limiter must not become the denial of service it prevents. An
  // attacker sending a new spoofed address every request would otherwise
  // add a map entry per request until the dyno dies.
  __resetRateLimits();
  for (let i = 0; i < 12_000; i += 1) rateLimit(`ip:${i}`, 5, WINDOW, T0);
  // Beyond the cap, with every entry still live, it refuses rather than grows.
  const v = rateLimit("ip:brand-new", 5, WINDOW, T0);
  assert.equal(v.ok, false, "refuses once the key space is full and unexpired");
});

test("expired entries are reclaimed, so a busy day does not wedge it", () => {
  // The flip side of the test above: once the window has passed, the space
  // must come back, or the limiter refuses everyone forever after one burst.
  __resetRateLimits();
  for (let i = 0; i < 12_000; i += 1) rateLimit(`ip:${i}`, 5, WINDOW, T0);
  assert.equal(
    rateLimit("ip:later", 5, WINDOW, T0 + WINDOW + 1).ok,
    true,
    "after the window, new callers are allowed again",
  );
});
