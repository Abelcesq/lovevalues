/**
 * Plan and pricing constants — the single source of truth.
 *
 * This module has NO `'use client'` directive, and that is its entire reason
 * for existing. `lib/account.ts` is a client module; importing a constant from
 * it inside a server route does not give you the value, it gives you a client
 * *reference stub*. The failure is genuinely nasty: `TRIAL_DAYS` arrives as a
 * function, `String(TRIAL_DAYS)` stringifies its source code, and Postgres
 * rejects the result with "invalid input syntax for type interval". Nothing in
 * that error points at a module boundary. It cost a real debugging session.
 *
 * There were three copies of the trial length before this file existed — one
 * here, one in the checkout route, one in the account module. The CEO has
 * already changed this number once (30 → 7); with copies in three places, the
 * next change silently ships a page that promises one thing and a Stripe
 * session that does another.
 *
 * Anything both a server route and a browser component needs to agree on
 * belongs in here.
 */

/** Days free before the first charge. Shown on /checkout, sent to Stripe as
 *  `subscription_data[trial_period_days]`, and written to `subscriptions`. */
export const TRIAL_DAYS = 7;

/** Monthly subscription, in whole currency units. Display only — the amount
 *  actually charged comes from the Stripe price ID, never from here. */
export const PRICE_MONTHLY = 9.99;

/** One-time full profile. Same caveat: display only. */
export const PRICE_PROFILE = 29.99;

/** Per-person match analysis (Phase 2, not built). */
export const PRICE_MATCH = 9.99;
