/**
 * Account creation and sign-in, against a live database.
 *
 * These cover the parts of authentication that are easy to get subtly wrong
 * and impossible to notice in manual testing: case handling on emails, what a
 * failed sign-in reveals, and whether a wrong password is actually rejected
 * rather than merely appearing to be.
 *
 * SKIPS without DATABASE_URL, same trade as tests/schema.test.mjs — a green
 * run with no database proves nothing about this file. Read the output.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

const url = process.env.DATABASE_URL;

if (!url) {
  test('user tests SKIPPED — no DATABASE_URL set', { skip: true }, () => {});
} else {
  const { createUser, verifyCredentials, findUserByEmail, normalizeEmail, startTrial } =
    await import('../lib/users.ts');
  const { pool } = await import('../lib/db.ts');

  const EMAIL = 'test-user@lovevalues.test';
  const PASSWORD = 'correct horse battery staple';

  async function wipe() {
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@lovevalues.test']);
  }

  test('setup', async () => {
    await wipe();
  });

  test('normalizeEmail lowercases and trims', () => {
    assert.equal(normalizeEmail('  Alex@Example.COM '), 'alex@example.com');
  });

  test('creating an account stores a hash, never the password', async () => {
    const user = await createUser({ name: 'Alex Rivera', email: EMAIL, password: PASSWORD });
    assert.ok(user, 'account was not created');
    assert.notEqual(user.password_hash, PASSWORD, 'the password was stored in the clear');
    assert.match(user.password_hash, /^\$2[aby]\$/, 'not a bcrypt hash');
    /* The cost factor is recorded in the hash itself. If someone lowers
       BCRYPT_ROUNDS to make tests faster, this catches it. */
    assert.match(user.password_hash, /^\$2[aby]\$12\$/, 'bcrypt cost is below 12');
  });

  test('the correct password signs in', async () => {
    const user = await verifyCredentials(EMAIL, PASSWORD);
    assert.ok(user, 'correct credentials were rejected');
    assert.equal(user.email, EMAIL);
  });

  test('a wrong password does not sign in', async () => {
    assert.equal(await verifyCredentials(EMAIL, 'not the password'), null);
  });

  test('email case does not create a second person', async () => {
    /* Alex@ and alex@ must be one account. Two accounts for one human is how
       "I logged in and my profile was gone" happens. */
    const upper = EMAIL.toUpperCase();
    assert.ok(await findUserByEmail(upper), 'lookup is case-sensitive');
    assert.ok(await verifyCredentials(upper, PASSWORD), 'sign-in is case-sensitive');

    const dupe = await createUser({ name: 'Impostor', email: upper, password: 'whatever' });
    assert.equal(dupe, null, 'a duplicate account was created under different casing');
  });

  test('an unknown email is rejected the same way a wrong password is', async () => {
    /* Both return null. If one threw, or returned a distinguishable value, the
       UI could leak which addresses have accounts. */
    assert.equal(await verifyCredentials('nobody@lovevalues.test', PASSWORD), null);
  });

  test('an unknown email takes about as long as a real one', async () => {
    /* Guards the dummy-hash comparison in verifyCredentials. Without it, a
       missing user returns in ~1ms and a real one in ~250ms, and that gap is
       measurable over the network — enough to enumerate who has an account.
       The bound is deliberately loose; this is a shared CI box, not a lab. */
    const time = async (fn) => {
      const t = process.hrtime.bigint();
      await fn();
      return Number(process.hrtime.bigint() - t) / 1e6;
    };
    const real = await time(() => verifyCredentials(EMAIL, 'wrong'));
    const fake = await time(() => verifyCredentials('nobody@lovevalues.test', 'wrong'));

    assert.ok(
      fake > real * 0.25,
      `unknown-email path is suspiciously fast (${fake.toFixed(0)}ms vs ${real.toFixed(0)}ms) — ` +
        'the dummy-hash comparison may have been removed, which leaks account existence by timing',
    );
  });

  test('an OAuth-only account cannot be signed into with a password', async () => {
    /* Someone who signed up with Google has no password_hash. Guessing must
       not somehow succeed against a null hash. */
    await pool.query('INSERT INTO users (name, email) VALUES ($1, $2)', [
      'Google Person',
      'oauth@lovevalues.test',
    ]);
    assert.equal(await verifyCredentials('oauth@lovevalues.test', ''), null);
    assert.equal(await verifyCredentials('oauth@lovevalues.test', 'anything'), null);
  });

  test('starting a trial twice does not extend it', async () => {
    const user = await findUserByEmail(EMAIL);
    await startTrial(user.id, 7);
    const first = await pool.query('SELECT trial_ends_at FROM subscriptions WHERE "userId" = $1', [
      user.id,
    ]);
    await startTrial(user.id, 90);
    const second = await pool.query('SELECT trial_ends_at FROM subscriptions WHERE "userId" = $1', [
      user.id,
    ]);
    assert.equal(
      first.rows[0].trial_ends_at.getTime(),
      second.rows[0].trial_ends_at.getTime(),
      'a second startTrial call moved the end date — reloading checkout would extend the trial',
    );
  });

  test.after(async () => {
    await wipe();
    await pool.end();
  });
}
