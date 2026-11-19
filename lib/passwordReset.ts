/**
 * Password resets — the way back in.
 *
 * THE RULES THIS FOLLOWS, each because the obvious alternative is a hole:
 *
 * 1. THE TOKEN IS RANDOM, NOT DERIVED. 32 bytes from the CSPRNG. Anything
 *    built from a user id, an email or a timestamp is guessable by someone
 *    who knows those things, and they all appear in the email it arrives in.
 *
 * 2. ONLY A HASH IS STORED. The token exists in the email and nowhere else.
 *    A backup, a log line, or a stray psql session must not hand anyone a
 *    live reset for every account.
 *
 * 3. ONE USE. An email gets forwarded, quoted into a support thread, and
 *    sits in a shared inbox for years. Consuming the token on use is what
 *    stops it being a permanent key.
 *
 * 4. SHORT LIFE. One hour. Long enough for someone to find the email, short
 *    enough that an old thread is not a way in.
 *
 * 5. REQUESTING A RESET INVALIDATES EARLIER ONES for that person, so a token
 *    captured and sat on stops working the moment they try again themselves.
 *
 * 6. NOTHING HERE REVEALS WHETHER AN ACCOUNT EXISTS. The route above it
 *    answers identically either way — see app/api/password/request.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { pool } from "./db.ts";

/** How long a link lives. */
export const RESET_TTL_MS = 60 * 60 * 1000;

/** Matches the floor on /signup — a reset must not be a way to set a weaker
    password than signing up allows. */
export const MIN_PASSWORD = 10;

/** url-safe, 43 chars, 256 bits of entropy. */
export function makeResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Issue a reset for an email, if it belongs to somebody.
 *
 * Returns the raw token to email, or null when no such account exists — the
 * CALLER must answer identically in both cases.
 */
export async function createReset(email: string): Promise<{
  token: string;
  userId: number;
} | null> {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
    [email.trim()],
  );
  const user = rows[0];
  if (!user) return null;

  /* Rule 5. Anything outstanding for this person stops working now. */
  await pool.query(
    `UPDATE password_resets SET used_at = NOW()
      WHERE user_id = $1 AND used_at IS NULL`,
    [user.id],
  );

  const token = makeResetToken();
  await pool.query(
    `INSERT INTO password_resets (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + make_interval(secs => $3))`,
    [hashResetToken(token), user.id, Math.round(RESET_TTL_MS / 1000)],
  );
  return { token, userId: user.id };
}

export type ResetOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid" | "weak" };

/**
 * Spend a token and set the new password.
 *
 * ONE TRANSACTION, and the token is marked used in the SAME statement that
 * selects it — `UPDATE … WHERE used_at IS NULL … RETURNING` — so two requests
 * arriving together cannot both win. Select-then-update would let a token be
 * redeemed twice under a race.
 *
 * An expired, spent or unknown token all return the same "invalid": telling
 * someone which one it was is telling an attacker whether they have a real
 * token in hand.
 */
export async function consumeReset(
  token: string,
  newPassword: string,
): Promise<ResetOutcome> {
  if (!token || newPassword.length < MIN_PASSWORD) {
    return { ok: false, reason: newPassword.length < MIN_PASSWORD ? "weak" : "invalid" };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ user_id: number }>(
      `UPDATE password_resets
          SET used_at = NOW()
        WHERE token_hash = $1
          AND used_at IS NULL
          AND expires_at > NOW()
      RETURNING user_id`,
      [hashResetToken(token)],
    );
    const row = rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "invalid" };
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
      hash,
      row.user_id,
    ]);
    await client.query("COMMIT");
    return { ok: true };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Constant-time string compare, for anywhere a secret is checked by equality.
 * Exported because the obvious `===` leaks length and first-difference
 * position through timing.
 */
export function sameSecret(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
