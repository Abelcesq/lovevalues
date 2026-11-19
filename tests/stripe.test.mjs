/**
 * The Stripe webhook signature, and the subscription status mapping.
 *
 * WHY THIS FILE MATTERS MORE THAN MOST. The webhook is a public URL that
 * grants paid access. If the signature check can be fooled, anyone who can
 * POST to it hands themselves a subscription by inventing a JSON body — no
 * card, no Stripe, no trace. Every other billing bug costs money; this one
 * gives the product away.
 *
 * So the cases that must FAIL are the point of this file, and there are more
 * of them than cases that must pass.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import {
  SIGNATURE_TOLERANCE_SECONDS,
  signPayload,
  verifyStripeSignature,
} from "../lib/stripe.ts";
import { mapStatus, periodEndFrom } from "../lib/subscriptions.ts";

const SECRET = "whsec_test_secret_value";
const BODY = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
const NOW = 1_700_000_000;

/* ── What must pass ──────────────────────────────────────────────────────── */

test("a genuine signature verifies", () => {
  const header = signPayload(BODY, SECRET, NOW);
  assert.equal(verifyStripeSignature(BODY, header, SECRET, NOW).ok, true);
});

test("a second v1 is accepted, so a secret rotation survives", () => {
  // Stripe sends several v1 entries while a signing secret is being rotated.
  // Taking only the first would break every event mid-rotation.
  const good = signPayload(BODY, SECRET, NOW).split("v1=")[1];
  const header = `t=${NOW},v1=${"0".repeat(64)},v1=${good}`;
  assert.equal(verifyStripeSignature(BODY, header, SECRET, NOW).ok, true);
});

test("an event at the edge of the window still verifies", () => {
  const header = signPayload(BODY, SECRET, NOW - SIGNATURE_TOLERANCE_SECONDS);
  assert.equal(verifyStripeSignature(BODY, header, SECRET, NOW).ok, true);
});

/* ── What must fail. These are the load-bearing ones. ────────────────────── */

test("a forged body is refused", () => {
  // The whole attack: keep a real signature, change what it covers.
  const header = signPayload(BODY, SECRET, NOW);
  const tampered = JSON.stringify({ id: "evt_1", type: "invoice.paid" });
  const r = verifyStripeSignature(tampered, header, SECRET, NOW);
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.reason, "signature_mismatch");
});

test("a signature made with the wrong secret is refused", () => {
  const header = signPayload(BODY, "whsec_someone_elses_secret", NOW);
  assert.equal(verifyStripeSignature(BODY, header, SECRET, NOW).ok, false);
});

test("no signature header at all is refused", () => {
  assert.equal(verifyStripeSignature(BODY, null, SECRET, NOW).ok, false);
  assert.equal(verifyStripeSignature(BODY, "", SECRET, NOW).ok, false);
});

test("a header with no v1 is refused", () => {
  const r = verifyStripeSignature(BODY, `t=${NOW}`, SECRET, NOW);
  assert.equal(r.ok === false && r.reason, "no_v1_signature");
});

test("a header with no timestamp is refused", () => {
  // Without a timestamp there is no replay window at all.
  const sig = createHmac("sha256", SECRET).update(`.${BODY}`).digest("hex");
  const r = verifyStripeSignature(BODY, `v1=${sig}`, SECRET, NOW);
  assert.equal(r.ok === false && r.reason, "no_timestamp");
});

test("a stale event is refused, which is what bounds replay", () => {
  const header = signPayload(BODY, SECRET, NOW - SIGNATURE_TOLERANCE_SECONDS - 1);
  const r = verifyStripeSignature(BODY, header, SECRET, NOW);
  assert.equal(r.ok === false && r.reason, "too_old");
});

test("an event from the future is refused too", () => {
  // Checking only the past would let a forged far-future timestamp be
  // replayed forever.
  const header = signPayload(BODY, SECRET, NOW + SIGNATURE_TOLERANCE_SECONDS + 1);
  const r = verifyStripeSignature(BODY, header, SECRET, NOW);
  assert.equal(r.ok === false && r.reason, "too_far_future");
});

test("an empty signing secret refuses everything", () => {
  // An unset STRIPE_WEBHOOK_SECRET must never mean "accept anything".
  const header = signPayload(BODY, "", NOW);
  const r = verifyStripeSignature(BODY, header, "", NOW);
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.reason, "no_signing_secret");
});

test("a malformed header does not throw", () => {
  for (const junk of ["garbage", "t=,v1=", "=,=", "t=abc,v1=xyz", ",,,"]) {
    assert.doesNotThrow(() => verifyStripeSignature(BODY, junk, SECRET, NOW));
    assert.equal(verifyStripeSignature(BODY, junk, SECRET, NOW).ok, false);
  }
});

test("a signature of the wrong length is refused without throwing", () => {
  // timingSafeEqual throws on a length mismatch; that must be handled rather
  // than becoming a 500 on a public endpoint.
  const r = verifyStripeSignature(BODY, `t=${NOW},v1=abc`, SECRET, NOW);
  assert.equal(r.ok, false);
});

test("whitespace in the body is part of what is signed", () => {
  // The reason the raw body must be used rather than a re-serialised parse.
  const header = signPayload(BODY, SECRET, NOW);
  const reserialised = JSON.stringify(JSON.parse(BODY), null, 2);
  assert.notEqual(reserialised, BODY);
  assert.equal(verifyStripeSignature(reserialised, header, SECRET, NOW).ok, false);
});

/* ── Status mapping ──────────────────────────────────────────────────────── */

test("Stripe statuses map onto the five this app stores", () => {
  assert.equal(mapStatus("trialing"), "trialing");
  assert.equal(mapStatus("active"), "active");
  assert.equal(mapStatus("past_due"), "past_due");
  assert.equal(mapStatus("unpaid"), "past_due");
  assert.equal(mapStatus("canceled"), "canceled");
  assert.equal(mapStatus("incomplete_expired"), "canceled");
});

test("an unknown status grants nothing", () => {
  // Stripe adds statuses over time. A value this app does not understand must
  // fall to the side that gives no access.
  for (const unknown of ["something_new", "", undefined, "paused"]) {
    assert.equal(mapStatus(unknown), "none", `${unknown} must not grant access`);
  }
});

/* ── Where the renewal date lives ────────────────────────────────────────────
   Stripe's 2026-04-22.dahlia API moved current_period_end off the Subscription
   root and onto each subscription item. Code that reads only the root does not
   throw — it reads null, stores no renewal date, and looks fine until someone
   asks when they are next charged. This bit the EZAITASK build in production
   and is the reason these tests exist. */

test("the renewal date is read from the subscription ITEM", () => {
  const at = periodEndFrom({ items: { data: [{ current_period_end: 1800000000 }] } });
  assert.equal(at?.getTime(), 1800000000 * 1000);
});

test("a legacy root field still works, for replayed older events", () => {
  // The fallback is not redundant: an event replayed from an older API
  // version carries the old shape.
  const at = periodEndFrom({ current_period_end: 1900000000 });
  assert.equal(at?.getTime(), 1900000000 * 1000);
});

test("the item wins when both are present", () => {
  const at = periodEndFrom({
    current_period_end: 1,
    items: { data: [{ current_period_end: 1800000000 }] },
  });
  assert.equal(at?.getTime(), 1800000000 * 1000, "the newer location is authoritative");
});

test("a missing or malformed renewal date is null, never a wrong date", () => {
  // Storing epoch-zero, or NaN, would be worse than storing nothing: the
  // billing page would confidently show 1970.
  for (const shape of [
    {},
    { items: { data: [] } },
    { items: {} },
    { items: { data: [{}] } },
    { current_period_end: "soon" },
    { current_period_end: null },
  ]) {
    assert.equal(periodEndFrom(shape), null, JSON.stringify(shape));
  }
});
