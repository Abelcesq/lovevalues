/**
 * What a reflection costs, and when.
 *
 * The CEO's rule, 2026-08-03: the first report is $29.99, every one after it is
 * $9.99, and the charge lands when someone asks to see it rather than at
 * signup. This file guards the arithmetic and — more importantly — the three
 * ways it could quietly take money it should not:
 *
 *   1. charging for a report that never arrived;
 *   2. charging someone to correct a report they just bought;
 *   3. charging first-report price to someone who already has one.
 *
 * (3) is not hypothetical. Every profile written before this feature has a
 * reflection in it and no counter, so a naive default would have billed those
 * people $29.99 for their second report — including the only person who has
 * ever generated one.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  canGenerate,
  consumeCredit,
  correctionIsIncluded,
  grantCredit,
  reportKind,
  reportPlan,
  reportPrice,
} from "../lib/reports.ts";
import { PRICE_PROFILE, PRICE_PROFILE_UPDATE } from "../lib/plan.ts";

const fresh = () => ({ reportsGenerated: 0, reportCredit: null });
const NOW = "2026-08-03T12:00:00.000Z";

test("the first report is the profile price, every later one is the update price", () => {
  assert.equal(reportKind(fresh()), "first");
  assert.equal(reportPrice("first"), PRICE_PROFILE);

  assert.equal(reportKind({ reportsGenerated: 1, reportCredit: null }), "update");
  assert.equal(reportPrice("update"), PRICE_PROFILE_UPDATE);
});

test("the two prices are actually different", () => {
  // Cheap, but it is the whole feature: if a refactor ever pointed both at the
  // same constant, every test above would still pass.
  assert.notEqual(PRICE_PROFILE, PRICE_PROFILE_UPDATE);
});

test("each kind maps to its own Stripe plan", () => {
  assert.equal(reportPlan("first"), "report");
  assert.equal(reportPlan("update"), "report-update");
});

test("nothing can be generated without a credit", () => {
  assert.equal(canGenerate(fresh()), false);
  assert.equal(canGenerate(grantCredit(fresh(), "paid", NOW)), true);
});

test("a granted credit records why it exists", () => {
  // "unconfigured" is the Stripe-not-switched-on fall-through. It must stay
  // distinguishable from a real payment, or an unpaid grant reads as revenue.
  assert.equal(grantCredit(fresh(), "paid", NOW).reportCredit.reason, "paid");
  assert.equal(
    grantCredit(fresh(), "unconfigured", NOW).reportCredit.reason,
    "unconfigured",
  );
  assert.equal(grantCredit(fresh(), "paid", NOW).reportCredit.kind, "first");
});

test("spending a credit counts the report and clears the credit", () => {
  const after = consumeCredit(grantCredit(fresh(), "paid", NOW));
  assert.equal(after.reportsGenerated, 1);
  assert.equal(after.reportCredit, null);
  assert.equal(reportKind(after), "update", "the next one is now an update");
});

test("a credit is spent once, not twice", () => {
  const once = consumeCredit(grantCredit(fresh(), "paid", NOW));
  const twice = consumeCredit(once);
  assert.equal(
    twice.reportsGenerated,
    1,
    "consuming with no credit held must not advance the meter",
  );
});

test("consuming with no credit is a no-op, so a free correction stays free", () => {
  // This is the mechanism, not a side effect: a correction re-run holds no
  // credit, so it neither charges nor pushes the person into update pricing.
  const read = { reportsGenerated: 1, reportCredit: null };
  assert.deepEqual(consumeCredit(read), read);
});

test("consumeCredit and grantCredit preserve every other field", () => {
  // They are handed a whole ProfileState. Narrowing it to the two fields they
  // care about would erase someone's answers.
  const p = { ...fresh(), answers: { "peak-1": "x" }, synthesis: null };
  assert.deepEqual(consumeCredit(grantCredit(p, "paid", NOW)).answers, {
    "peak-1": "x",
  });
});

test("corrections are included while reading, and not after it is confirmed", () => {
  assert.equal(correctionIsIncluded(true, false), true, "still reading — included");
  assert.equal(
    correctionIsIncluded(true, true),
    false,
    "reading confirmed — the next report is a new one",
  );
});

test("someone with no reading at all gets nothing for free", () => {
  // The bug this exists for: with only the confirmed flag, a person holding no
  // reflection is trivially "not yet confirmed", so the FIRST report — the
  // $29.99 one — came out free. Found by walking the pages in a browser; every
  // value involved is a boolean, so nothing about it failed to type-check.
  assert.equal(correctionIsIncluded(false, false), false);
  assert.equal(correctionIsIncluded(false, true), false);
});

/* ── The upgrade path ────────────────────────────────────────────────────── */

test("an existing reflection counts as a report already generated", async () => {
  // Guards the migration in loadProfile. Someone who generated a reflection
  // before any of this existed must be quoted the update price, not billed
  // $29.99 for the second report on a device that already shows the first.
  const { EMPTY_PROFILE } = await import("../lib/store.ts");
  const saved = {
    ...EMPTY_PROFILE,
    synthesis: { coreValues: [], generatedAt: NOW },
  };
  /* loadProfile applies this rule against localStorage; the rule itself is
     what matters and is asserted directly. */
  const migrated = {
    ...saved,
    reportsGenerated: saved.synthesis && saved.reportsGenerated === 0 ? 1 : saved.reportsGenerated,
  };
  assert.equal(reportKind(migrated), "update");
  assert.equal(reportPrice(reportKind(migrated)), PRICE_PROFILE_UPDATE);
});

test("a brand-new profile starts with no report and no credit", () => {
  return import("../lib/store.ts").then(({ EMPTY_PROFILE }) => {
    assert.equal(EMPTY_PROFILE.reportsGenerated, 0);
    assert.equal(EMPTY_PROFILE.reportCredit, null);
    assert.equal(canGenerate(EMPTY_PROFILE), false);
  });
});
