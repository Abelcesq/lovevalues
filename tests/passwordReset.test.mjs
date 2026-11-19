/**
 * Password resets and report credits — both against a real database.
 *
 * These two share a file because they share a property that unit tests cannot
 * check: each is a single-use right, and the thing that makes them safe is a
 * SQL statement that selects and marks in one step. A select-then-update
 * would pass every test written against one request at a time and still let a
 * token be redeemed twice, or a $29.99 credit spent twice, under a race.
 *
 * Skipped when there is no DATABASE_URL, like the other database tests.
 */

import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import pg from "pg";
import {
  MIN_PASSWORD,
  consumeReset,
  createReset,
  hashResetToken,
  makeResetToken,
  sameSecret,
} from "../lib/passwordReset.ts";
import {
  consumeReportCredit,
  grantReportCredit,
  reportCreditsFor,
} from "../lib/subscriptions.ts";
import { pool } from "../lib/db.ts";

const url = process.env.DATABASE_URL;

/* ── Pure parts, always run ──────────────────────────────────────────────── */

test("tokens are random, long, and url-safe", () => {
  const a = makeResetToken();
  const b = makeResetToken();
  assert.notEqual(a, b, "two tokens must never collide");
  assert.ok(a.length >= 43, "256 bits, base64url");
  assert.match(a, /^[A-Za-z0-9_-]+$/, "must survive being put in a URL");
});

test("only a hash is ever stored, and it is stable", () => {
  const t = makeResetToken();
  const h = hashResetToken(t);
  assert.equal(h.length, 64, "sha-256 hex");
  assert.equal(hashResetToken(t), h, "same token, same hash");
  assert.notEqual(h, t, "the token itself must not be the stored value");
});

test("sameSecret compares without throwing on length mismatch", () => {
  assert.equal(sameSecret("abc", "abc"), true);
  assert.equal(sameSecret("abc", "abd"), false);
  assert.equal(sameSecret("abc", "abcdef"), false, "must not throw");
  assert.equal(sameSecret("", ""), true);
});

/* ── Against a database ──────────────────────────────────────────────────── */

if (!url) {
  test("database tests SKIPPED — no DATABASE_URL set", { skip: true }, () => {});
} else {
  const client = new pg.Client({ connectionString: url });
  let userId = 0;

  test("setup", async () => {
    await client.connect();
    const { rows } = await client.query(
      `INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id`,
      [`reset-${Date.now()}@example.com`, await bcrypt.hash("old-password-here", 4)],
    );
    userId = rows[0].id;
  });

  test("a reset link works exactly once", async () => {
    const { rows } = await client.query(`SELECT email FROM users WHERE id=$1`, [userId]);
    const made = await createReset(rows[0].email);
    assert.ok(made, "a real address gets a token");

    const first = await consumeReset(made.token, "a-brand-new-passphrase");
    assert.equal(first.ok, true);

    // The whole point: an email can be forwarded, quoted, or sit in a shared
    // inbox. The second use must fail.
    const second = await consumeReset(made.token, "another-new-passphrase");
    assert.equal(second.ok, false);
    assert.equal(second.ok === false && second.reason, "invalid");
  });

  test("the password really changed, and is stored hashed", async () => {
    const { rows } = await client.query(
      `SELECT password_hash FROM users WHERE id=$1`,
      [userId],
    );
    const hash = rows[0].password_hash;
    assert.notEqual(hash, "a-brand-new-passphrase", "never the plaintext");
    assert.equal(await bcrypt.compare("a-brand-new-passphrase", hash), true);
    assert.equal(await bcrypt.compare("old-password-here", hash), false);
  });

  test("requesting a new link kills the previous one", async () => {
    // Otherwise a token captured and sat on keeps working even after the
    // person notices and resets it themselves.
    const { rows } = await client.query(`SELECT email FROM users WHERE id=$1`, [userId]);
    const older = await createReset(rows[0].email);
    const newer = await createReset(rows[0].email);
    assert.ok(older && newer);

    assert.equal((await consumeReset(older.token, "passphrase-number-one")).ok, false);
    assert.equal((await consumeReset(newer.token, "passphrase-number-two")).ok, true);
  });

  test("an expired link is refused", async () => {
    const { rows } = await client.query(`SELECT email FROM users WHERE id=$1`, [userId]);
    const made = await createReset(rows[0].email);
    assert.ok(made);
    await client.query(
      `UPDATE password_resets SET expires_at = NOW() - interval '1 second'
        WHERE token_hash = $1`,
      [hashResetToken(made.token)],
    );
    assert.equal((await consumeReset(made.token, "a-perfectly-fine-one")).ok, false);
  });

  test("an unknown token is refused, and says nothing useful", async () => {
    const r = await consumeReset(makeResetToken(), "a-perfectly-fine-one");
    assert.equal(r.ok, false);
    // Same reason as expired and already-used: telling them apart tells an
    // attacker whether they hold a real token.
    assert.equal(r.ok === false && r.reason, "invalid");
  });

  test("a weak password is refused even with a valid token", async () => {
    const { rows } = await client.query(`SELECT email FROM users WHERE id=$1`, [userId]);
    const made = await createReset(rows[0].email);
    assert.ok(made);
    const r = await consumeReset(made.token, "short");
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.reason, "weak");
    assert.ok(MIN_PASSWORD >= 10, "a reset must not be a way to set a weaker password");
  });

  test("an unknown email yields no token, and does not throw", async () => {
    assert.equal(await createReset("nobody-here-at-all@example.com"), null);
  });

  /* ── Report credits ──────────────────────────────────────────────────── */

  test("a report credit is granted once per Stripe session, however often it arrives", async () => {
    // Stripe delivers at least once and resends after a timeout. Without the
    // unique constraint, one payment mints two credits.
    await grantReportCredit(userId, "first", "cs_test_same");
    await grantReportCredit(userId, "first", "cs_test_same");
    await grantReportCredit(userId, "first", "cs_test_same");
    assert.equal(await reportCreditsFor(userId), 1);
  });

  test("a credit is spent once, and the second attempt gets nothing", async () => {
    assert.equal(await consumeReportCredit(userId), true);
    assert.equal(await reportCreditsFor(userId), 0);
    assert.equal(
      await consumeReportCredit(userId),
      false,
      "no credit must not silently pass",
    );
  });

  test("two simultaneous generations cannot spend one credit twice", async () => {
    // The race the UPDATE-with-subquery exists for. $29.99 buys one report.
    await grantReportCredit(userId, "first", `cs_race_${Date.now()}`);
    const [a, b] = await Promise.all([
      consumeReportCredit(userId),
      consumeReportCredit(userId),
    ]);
    assert.equal([a, b].filter(Boolean).length, 1, "exactly one may win");
    assert.equal(await reportCreditsFor(userId), 0);
  });

  test("teardown", async () => {
    await client.query(`DELETE FROM users WHERE id=$1`, [userId]);
    await client.end();
    await pool.end();
  });
}
