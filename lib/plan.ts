/**
 * THE BILLING MODEL — one definition, quoted by every page that mentions money.
 *
 * This module has NO `'use client'` directive, and that is deliberate.
 * `lib/account.ts` is a client module; importing a constant from it inside a
 * server route does not give you the value, it gives you a client *reference
 * stub*. The failure is nasty: `TRIAL_DAYS` arrives as a function,
 * `String(TRIAL_DAYS)` stringifies its source code, and Postgres rejects the
 * result with "invalid input syntax for type interval". Nothing in that error
 * points at a module boundary. It cost a real debugging session.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THREE SEPARATE PRODUCTS. THREE SEPARATE CHARGES. (CEO, corrected 2026-08-01)
 *
 * The site previously presented the membership and the report as two plans a
 * person picks BETWEEN. That was wrong and it confused the product. They are
 * not alternatives — they stack:
 *
 *   1. MEMBERSHIP — $9.99/month. This is access to the platform. Everyone who
 *      uses Love Values pays this. First 7 days free.
 *
 *   2. VALUES REPORT — $29.99, once, and only once the four modules are done.
 *      The AI analysis of the person's own answers. Bought separately, on top
 *      of the membership. Not included in it. Charged at the moment they ask
 *      to see it, which is the "See your reflection" button at the end of
 *      Module 4 — see app/unlock/page.tsx.
 *
 *   3. UPDATED VALUES REPORT — $9.99. The SECOND and every later report the
 *      same person generates about themselves, after their answers have
 *      changed. (CEO, 2026-08-03.) Only the first one is $29.99.
 *
 *   4. MATCH ANALYSIS — $9.99 per report generated. Bought separately, each
 *      time. Editing answers is always free; it is GENERATING A REPORT that
 *      costs, and a second report costs again.
 *
 * Note that 1, 3 and 4 are ALL $9.99 and are three different things — monthly
 * access, a re-run of your own report, and one report about you and another
 * person. Any copy naming $9.99 must say which, or a reader will reasonably
 * assume their membership already covers the other two. It does not.
 *
 * CANCELLATION. Canceling stops FUTURE charges only; time already paid for is
 * always honoured:
 *   · Cancel during the free 7 days → never charged, access ends at day 7.
 *   · Cancel after a charge → access runs to the end of the billed cycle, and
 *     nothing further is taken. Reinstating requires the member's authorization.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Days free before the first membership charge. Shown on /checkout, sent to
 *  Stripe as `subscription_data[trial_period_days]`, written to `subscriptions`. */
export const TRIAL_DAYS = 7;

/** Product 1 — monthly membership. Access to the platform. */
export const PRICE_MONTHLY = 9.99;

/** Product 2 — the values report. One-time, separate from membership. */
export const PRICE_PROFILE = 29.99;

/**
 * Product 3 — a re-run of a person's OWN report, after the first one.
 *
 * The same number as the membership and as a match analysis, and none of the
 * three is the other. lib/reports.ts is what decides which price a given
 * person is looking at; nothing should compare prices to work that out.
 */
export const PRICE_PROFILE_UPDATE = 9.99;

/** Product 4 — one match analysis. Charged per report generated, every time. */
export const PRICE_MATCH = 9.99;

/** Formats for display. Kept here so no page hard-codes a number that could
 *  drift from the one Stripe actually charges. */
export const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * The two purchases that come later, described in the CEO's own framing.
 * Rendered on /checkout under the membership button and quoted on
 * /how-it-works, so the wording cannot diverge between the two pages.
 */
export const LATER_COSTS = [
  {
    id: "profile",
    price: PRICE_PROFILE,
    title: "Your values and personality analysis",
    when: "Once you have completed the four-part discovery process",
    body: `This cost is separate, and it generates your unique analysis of your values and personality — the clarity to communicate who you are and to seek a partner who will value and see all that you bring to the relationship. It is charged when you ask to see your reflection, not before. Editing your answers is always free, and so is asking the analysis to reconsider a section while you are reading it; generating a fresh report later, once your answers have changed, is ${money(PRICE_PROFILE_UPDATE)}.`,
  },
  {
    id: "match",
    price: PRICE_MATCH,
    title: "A match analysis",
    when: "When you want to look at a specific person",
    body: "Our system analyses how you match with a prospective partner, with detailed recommendations on the areas that will support a lasting relationship and the areas that should be considered and discussed. This is billed separately each time. There is no fee to update your responses — the fee is for each new report generated.",
  },
] as const;
