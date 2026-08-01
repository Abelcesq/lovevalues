/**
 * The privacy wall, checked against a live database.
 *
 * Hard rule 8 and open decision 5 both require that the server be *incapable*
 * of storing a person's answers, not merely uninterested in doing so. These
 * tests are what turns that from a sentence in CLAUDE.md into something a
 * build can fail on.
 *
 * Three checks, in increasing order of how much they prove:
 *
 *   1. No unbounded column exists anywhere. No `text`, no `json`/`jsonb`, no
 *      array. Every character column is varchar(n).
 *   2. Every column is on an allowlist. Adding an `answers` table or a `notes`
 *      column fails the build, so widening the wall has to be a deliberate
 *      edit to this file that a human reviews.
 *   3. A real insert of realistic answer-length prose into the roomiest column
 *      in the database is REJECTED by Postgres. Not a claim about the schema —
 *      the actual round trip.
 *
 * SKIPS ENTIRELY WITHOUT DATABASE_URL, so `npm test` still runs on a machine
 * with no Postgres. That is a deliberate trade and it has a cost worth stating
 * plainly: a green test run does NOT prove the wall holds — it proves it holds
 * *if this file ran*. Read the output. Before deploying a schema change, run
 * it against the real database:
 *
 *   heroku pg:credentials:url -a lovevalues     # then export DATABASE_URL=...
 *   npm test
 */

import assert from 'node:assert/strict';
import test from 'node:test';

const url = process.env.DATABASE_URL;

if (!url) {
  test('schema guards SKIPPED — no DATABASE_URL set', { skip: true }, () => {});
} else {
  const pg = (await import('pg')).default;
  const isLocal = /localhost|127\.0\.0\.1|@\/|host=\/|\/tmp/.test(url);
  const client = new pg.Client({
    connectionString: url,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();

  /* Every column this database is permitted to have. Deliberately exhaustive:
     the point is that an addition fails until someone edits this list. */
  const ALLOWED = new Set([
    'users.id',
    'users.name',
    'users.email',
    'users.emailVerified',
    'users.image',
    'users.password_hash',
    'users.created_at',
    'accounts.id',
    'accounts.userId',
    'accounts.type',
    'accounts.provider',
    'accounts.providerAccountId',
    'accounts.refresh_token',
    'accounts.access_token',
    'accounts.id_token',
    'accounts.expires_at',
    'accounts.token_type',
    'accounts.scope',
    'accounts.session_state',
    'sessions.id',
    'sessions.userId',
    'sessions.sessionToken',
    'sessions.expires',
    'verification_token.identifier',
    'verification_token.token',
    'verification_token.expires',
    'subscriptions.id',
    'subscriptions.userId',
    'subscriptions.plan',
    'subscriptions.status',
    'subscriptions.trial_ends_at',
    'subscriptions.current_period_end',
    'subscriptions.stripe_customer_id',
    'subscriptions.stripe_subscription_id',
    'subscriptions.created_at',
    'subscriptions.updated_at',
    'schema_migrations.filename',
    'schema_migrations.applied_at',
  ]);

  const { rows: columns } = await client.query(`
    SELECT table_name, column_name, data_type, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  test('the database has columns to inspect', () => {
    assert.ok(columns.length > 0, 'no tables found — has the migration been run?');
  });

  test('no unbounded column exists anywhere', () => {
    /* `text`, `json` and `jsonb` have no length ceiling; an array column would
       let prose in through the side door. None of them belong in a database
       that must not be able to hold an answer. */
    const FORBIDDEN_TYPES = new Set(['text', 'json', 'jsonb', 'ARRAY', 'xml', 'bytea']);
    const offenders = columns
      .filter((c) => FORBIDDEN_TYPES.has(c.data_type))
      .map((c) => `${c.table_name}.${c.column_name} (${c.data_type})`);

    assert.deepEqual(
      offenders,
      [],
      `unbounded column(s) found — a person's answers would fit in these:\n  ${offenders.join('\n  ')}`,
    );
  });

  test('every character column has an explicit length ceiling', () => {
    const unbounded = columns
      .filter((c) => c.data_type.includes('character') && c.character_maximum_length === null)
      .map((c) => `${c.table_name}.${c.column_name}`);

    assert.deepEqual(unbounded, [], `character column(s) with no length limit: ${unbounded}`);
  });

  test('no column outside the allowlist exists', () => {
    const unexpected = columns
      .map((c) => `${c.table_name}.${c.column_name}`)
      .filter((key) => !ALLOWED.has(key));

    assert.deepEqual(
      unexpected,
      [],
      'Column(s) not on the allowlist:\n  ' +
        unexpected.join('\n  ') +
        '\n\nIf this is a deliberate schema change, add it to ALLOWED in this file — ' +
        'and while you are there, confirm it cannot hold a user’s answers.',
    );
  });

  test('Postgres actually REJECTS answer-length prose', async () => {
    /* The proof, not the claim. Roughly what one honest Roots answer looks
       like — well short of a full four-module transcript, and already far too
       big for anything in this database. */
    const answer =
      'They did not argue in front of us, which I used to think was a kindness. ' .repeat(40);
    assert.ok(answer.length > 2500, 'test fixture is too short to be meaningful');

    /* `image` at varchar(2048) is the roomiest non-token column in the schema.
       If prose will not fit here, it will not fit anywhere a careless writer
       would reach for first. */
    await assert.rejects(
      () => client.query('INSERT INTO users (email, image) VALUES ($1, $2)', ['wall@test.local', answer]),
      /value too long/i,
      'the database accepted answer-length prose — the privacy wall is not holding',
    );
  });

  test('a normal user record still inserts fine', async () => {
    /* The wall must stop prose without stopping the product. */
    await client.query('DELETE FROM users WHERE email = $1', ['ok@test.local']);
    await client.query('INSERT INTO users (name, email) VALUES ($1, $2)', [
      'Alex Rivera',
      'ok@test.local',
    ]);
    const { rows } = await client.query('SELECT name FROM users WHERE email = $1', [
      'ok@test.local',
    ]);
    assert.equal(rows[0].name, 'Alex Rivera');
    await client.query('DELETE FROM users WHERE email = $1', ['ok@test.local']);
  });

  test.after(async () => {
    await client.end();
  });
}
