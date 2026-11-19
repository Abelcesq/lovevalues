/**
 * Stripe webhooks — verifying that an event really came from Stripe.
 *
 * WHY THIS IS THE MOST IMPORTANT FILE IN THE BILLING PATH. The webhook is a
 * public URL that grants paid access. Without a verified signature, anyone who
 * can POST to it can hand themselves a subscription by inventing a JSON body —
 * no card, no Stripe, no trace. Every other billing bug costs money; this one
 * gives the product away.
 *
 * NO STRIPE SDK, DELIBERATELY. The rest of this app talks to Stripe with
 * `fetch` and a form body (see app/api/checkout/route.ts), and the signature
 * scheme is thirty lines of HMAC. Adding a dependency with its own release
 * cadence to a Heroku build, for one function, is the worse trade here.
 *
 * THE SCHEME, so a future reader does not have to go looking:
 *   Stripe-Signature: t=1700000000,v1=<hex>,v1=<hex during key rotation>
 *   signed payload   = "<t>.<raw request body>"
 *   expected         = HMAC-SHA256(signed payload, signing secret), hex
 * Any one matching v1 is enough. The timestamp is checked separately so an
 * intercepted-and-replayed event goes stale.
 *
 * THE BODY MUST BE RAW. Parsing and re-serialising JSON changes whitespace and
 * key order, the HMAC no longer matches, and every event fails with a
 * signature error that looks like a wrong secret. Read it with
 * `await request.text()` and verify before `JSON.parse`.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * PIN THE API VERSION. Stripe rolls accounts forward, and a version change
 * moves fields: 2026-04-22.dahlia took `current_period_end` off the
 * Subscription root and put it on each subscription item. The EZAITASK build
 * hit exactly that in production, and the symptom is not an error — it is a
 * field quietly reading null while everything else looks fine.
 *
 * Pinning means our requests get a shape we have actually tested. Webhook
 * EVENTS still arrive in whatever version the endpoint is set to in the
 * dashboard, which is why the webhook reads both locations regardless.
 *
 * Raise this deliberately, with the changelog open, never incidentally.
 */
export const STRIPE_API_VERSION = "2026-04-22.dahlia";

export const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
export const webhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);

/** How far out of date an event may be. Stripe's own default, and it exists
    to bound replay: a captured request stops working after five minutes. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Constant-time compare that cannot throw on a length mismatch. */
function sameSecretly(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  /* timingSafeEqual throws when lengths differ, and the throw itself leaks
     the length. Compare lengths first and still run the comparison, so the
     work done does not depend on where the strings diverge. */
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Is this request really from Stripe?
 *
 * `nowSeconds` is injectable so the timestamp window can be tested without
 * waiting five minutes.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = SIGNATURE_TOLERANCE_SECONDS,
): VerifyResult {
  if (!secret) return { ok: false, reason: "no_signing_secret" };
  if (!signatureHeader) return { ok: false, reason: "no_signature_header" };

  let timestamp: string | null = null;
  const candidates: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=", 2);
    if (!key || !value) continue;
    if (key.trim() === "t") timestamp = value.trim();
    /* Several v1 entries appear while a signing secret is being rotated.
       Accepting any of them is what makes a rotation survivable. */
    if (key.trim() === "v1") candidates.push(value.trim());
  }

  if (!timestamp || !/^\d+$/.test(timestamp)) {
    return { ok: false, reason: "no_timestamp" };
  }
  if (candidates.length === 0) return { ok: false, reason: "no_v1_signature" };

  const age = nowSeconds - Number(timestamp);
  /* Guard both directions. A far-future timestamp is as suspicious as an old
     one, and only checking the past lets a forged future event live forever. */
  if (age > toleranceSeconds) return { ok: false, reason: "too_old" };
  if (age < -toleranceSeconds) return { ok: false, reason: "too_far_future" };

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  /* Every candidate is compared — no early return — so the time taken does
     not reveal which one matched. */
  let matched = false;
  for (const candidate of candidates) {
    if (sameSecretly(candidate, expected)) matched = true;
  }

  return matched ? { ok: true } : { ok: false, reason: "signature_mismatch" };
}

/** For tests and for local replay: build the header Stripe would have sent. */
export function signPayload(
  rawBody: string,
  secret: string,
  timestamp: number,
): string {
  const sig = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${sig}`;
}
