/**
 * User records — the server side of an account.
 *
 * Everything here touches identity and billing only. Nothing in this file may
 * read or write a person's answers; see `lib/db.ts` and `db/001_init.sql` for
 * why that is enforced rather than requested.
 */

import bcrypt from "bcryptjs";
/* Relative, not the `@/` alias: everything under lib/ must stay loadable by
   `node --experimental-strip-types`, which does not read tsconfig paths. The
   alias would typecheck fine and then fail at test time. */
import { pool } from "./db.ts";

export type DbUser = {
  id: number;
  name: string | null;
  email: string | null;
  image: string | null;
  password_hash: string | null;
};

/* 12 rounds. Each increment doubles the work: 10 is the common default and is
   getting cheap for an attacker with a modern GPU, while 14 makes sign-in feel
   sluggish on a Heroku dyno. 12 lands around a quarter-second here, which is
   slow enough to make offline guessing expensive and fast enough that nobody
   notices. Revisit upward as hardware improves — bcrypt hashes record their
   own cost, so raising this does not invalidate existing passwords. */
const BCRYPT_ROUNDS = 12;

/** Emails are compared case-insensitively; `Alex@x.com` and `alex@x.com` are
 *  one person, and letting them become two accounts is a support nightmare
 *  that surfaces as "my profile is gone". */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const { rows } = await pool.query<DbUser>(
    "SELECT id, name, email, image, password_hash FROM users WHERE email = $1",
    [normalizeEmail(email)],
  );
  return rows[0] ?? null;
}

/**
 * Verify an email/password pair.
 *
 * Returns null for every failure — wrong password, unknown email, or an
 * account that has no password because it only ever signed in through Google
 * or Meta. The caller must not distinguish between these in anything it shows
 * the user: "no account with that email" tells an attacker which addresses are
 * registered, which for a product about people's private relationship history
 * is a disclosure worth avoiding.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<DbUser | null> {
  const user = await findUserByEmail(email);

  /* Hash against a dummy even when the user does not exist. Without this, a
     missing email returns in ~1ms and a wrong password in ~250ms, and the
     difference is measurable over the network — an attacker can enumerate
     which addresses have accounts just by timing the response.

     THE DUMMY MUST BE A REAL BCRYPT HASH. An invented look-alike string is
     rejected as malformed and compare() returns immediately, which reinstates
     the exact timing gap this line exists to close — the defence looks present
     in the diff while doing nothing. This is a genuine cost-12 hash of a random
     string that was never recorded, so nothing can match it. The timing test in
     tests/users.test.mjs is what caught the look-alike; keep it. */
  const hash =
    user?.password_hash ??
    "$2b$12$xC6tS0xekuYbab3UVt7O2uOtU4Yx.Rlw9kb47lCsQiJJpClfskzWe";
  const ok = await bcrypt.compare(password, hash);

  if (!user || !user.password_hash || !ok) return null;
  return user;
}

/**
 * Create an email/password account.
 *
 * Returns null if the address is already taken — including when it is taken by
 * a Google or Meta account, which is the common case and needs its own message
 * in the UI ("you already signed up with Google").
 */
export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<DbUser | null> {
  const email = normalizeEmail(input.email);
  const existing = await findUserByEmail(email);
  if (existing) return null;

  const password_hash = await hashPassword(input.password);
  const { rows } = await pool.query<DbUser>(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, image, password_hash`,
    [input.name.trim().slice(0, 100), email, password_hash],
  );
  return rows[0] ?? null;
}

/** Start the 7-day trial. Idempotent — calling it twice does not extend it,
 *  which matters because the checkout page can be reloaded. */
export async function startTrial(userId: number, days = 7): Promise<void> {
  /* `make_interval(days => $2::int)` rather than string-concatenating into an
     interval literal. The older form silently stringified whatever it was
     given, so a non-number arriving here produced a Postgres syntax error far
     from the real cause — which is exactly what happened when TRIAL_DAYS was
     imported across the client/server boundary and turned into a stub. The
     ::int cast now rejects anything that is not a number, at the point of use. */
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) {
    throw new TypeError(
      `startTrial: days must be a positive number, received ${String(days)}`,
    );
  }

  await pool.query(
    `INSERT INTO subscriptions ("userId", plan, status, trial_ends_at)
     VALUES ($1, 'trial', 'trialing', NOW() + make_interval(days => $2::int))
     ON CONFLICT ("userId") DO NOTHING`,
    [userId, Math.round(n)],
  );
}
