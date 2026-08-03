/**
 * WHICH REPORT IS THIS, AND WHAT DOES IT COST.
 *
 * The CEO's rule, 2026-08-03: the first analysis a person generates about
 * themselves is $29.99. Every one after that is $9.99. The charge lands when
 * they ask to see it — the "See your reflection" button at the end of Module 4
 * — not at signup and not before the modules are done.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * READ THIS BEFORE TRUSTING ANY OF IT.
 *
 * This is a gate drawn in the browser. It decides what a page SHOWS. It does
 * not and cannot decide what a person is allowed to have, because the profile
 * lives in localStorage and /api/synthesize has no session, no account, and no
 * idea whether anyone paid. Anyone who opens devtools can grant themselves a
 * credit in about four seconds, and anyone who can use curl can skip this file
 * entirely.
 *
 * That is a deliberate MVP position and not an oversight: the server has
 * nothing to check against until the Stripe webhook and real sessions land
 * (Project Container, open item 5). Enforcement belongs there — the webhook
 * writes the entitlement, the synthesis route reads it, and this module keeps
 * doing exactly what it does now, which is deciding what the UI offers. Do not
 * add "security" here; there is none to add. Add it in the webhook.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * CORRECTIONS ARE INCLUDED IN THE REPORT THEY CORRECT, and that is a product
 * decision worth defending. While someone is reading the reflection they just
 * bought and telling us a section is wrong, re-running it is part of
 * delivering what they paid for. Charging there would mean: pay $29.99, get
 * something that misses, pay again to be understood. The re-run becomes a paid
 * update only once they have confirmed the reading — at that point the
 * document is finished, and generating another one later is a new report.
 */

/* Extension included on purpose: this module is imported by tests that run on
   bare Node, where extensionless ESM does not resolve. lib/users.ts imports
   ./db.ts for the same reason, and tsconfig sets allowImportingTsExtensions. */
import { PRICE_PROFILE, PRICE_PROFILE_UPDATE } from "./plan.ts";

/** What the person is about to buy. */
export type ReportKind = "first" | "update";

/**
 * Why a credit exists. "paid" came back from Stripe. "unconfigured" is granted
 * when the payment route answers 503 because no keys are set — the same
 * fall-through /checkout already uses, and for the same reason: a pay screen
 * that cannot take payment must never be the thing that blocks the stranger
 * test. Kept distinct from "paid" so a later reconciliation can tell the two
 * apart, and so nothing counts an unconfigured grant as revenue.
 */
export type CreditReason = "paid" | "unconfigured";

export type ReportCredit = {
  kind: ReportKind;
  reason: CreditReason;
  grantedAt: string;
};

/** The minimum a caller has to know about a profile for any of this. */
type ReportState = {
  reportsGenerated: number;
  reportCredit: ReportCredit | null;
};

/** First report or a re-run — the only question this module really answers. */
export function reportKind(p: ReportState): ReportKind {
  return p.reportsGenerated > 0 ? "update" : "first";
}

export function reportPrice(kind: ReportKind): number {
  return kind === "first" ? PRICE_PROFILE : PRICE_PROFILE_UPDATE;
}

/** The Stripe plan name for a kind. Mirrors the switch in /api/checkout. */
export function reportPlan(kind: ReportKind): "report" | "report-update" {
  return kind === "first" ? "report" : "report-update";
}

/**
 * Can this person generate a reflection right now?
 *
 * A credit is spent per report, so a credit bought as an update does not
 * become a first report and vice versa — but a credit of EITHER kind is
 * accepted, because someone who paid should never be told their money was for
 * the wrong thing. The kind is recorded for reconciliation, not for gating.
 */
export function canGenerate(p: ReportState): boolean {
  return p.reportCredit !== null;
}

/* grantCredit and consumeCredit are generic so they can be handed a whole
   ProfileState and give one back with every other field intact. Typed as plain
   ReportState they would compile and then silently narrow the profile to two
   fields at the call site. */
export function grantCredit<T extends ReportState>(
  p: T,
  reason: CreditReason,
  now: string,
): T {
  return {
    ...p,
    reportCredit: { kind: reportKind(p), reason, grantedAt: now },
  };
}

/**
 * Spend the credit and count the report.
 *
 * Called when a reflection comes back successfully — never when the request is
 * sent. A failed generation that consumed the credit would charge someone for
 * a server error, which is the single worst bug this file could have.
 */
export function consumeCredit<T extends ReportState>(p: T): T {
  if (!p.reportCredit) return p;
  return {
    ...p,
    reportCredit: null,
    reportsGenerated: p.reportsGenerated + 1,
  };
}

/**
 * Is this re-run included in what they already paid for?
 *
 * True only while there is a reading in front of them AND they have not yet
 * confirmed it — see the header for why that window is free.
 *
 * BOTH ARGUMENTS ARE LOAD-BEARING, and the first one was learned the hard way.
 * With only "have they confirmed it", someone holding no reflection at all is
 * trivially unconfirmed, so the very first report — the $29.99 one — came out
 * free. Caught in a browser walk-through, not by a type error: every value
 * involved is a boolean and the wrong answer is a perfectly valid one.
 */
export function correctionIsIncluded(
  hasReading: boolean,
  readingConfirmed: boolean,
): boolean {
  return hasReading && !readingConfirmed;
}
