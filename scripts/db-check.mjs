/**
 * Inspect the live database without needing psql installed locally.
 *
 *   heroku run "npm run db:check" -a lovevalues
 *
 * `heroku pg:psql` requires a local PostgreSQL install, which a Windows laptop
 * running only Node does not have. This uses the `pg` client the app already
 * depends on, so it works anywhere the app itself runs.
 *
 * It prints:
 *   1. which migrations have been applied, and which are still pending,
 *   2. the tables that exist,
 *   3. the accounts, with their emails MASKED,
 *   4. whether the privacy wall still holds — no column anywhere in this
 *      database is large enough to hold a person's answers.
 *
 * (1) and (3) were added on 2026-11-19 after a day spent guessing at a
 * sign-in that would not work. Production turned out to be a migration behind
 * AND the question "does this person even have an account row" had no answer
 * short of installing psql. Both are one command now.
 *
 * EMAILS ARE MASKED because the answer to "is my account there" does not
 * require the whole address, and this output gets pasted into chats and
 * screenshots. `ab…@gmail.com` settles it just as well as the full thing.
 *
 * That third check is the one worth running after any schema change. It is the
 * same guarantee tests/schema.test.mjs enforces, verified against production
 * rather than a local copy.
 */

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { OUR_TABLES_CTE } from './our-tables.mjs';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. On Heroku this is set by the Postgres add-on.');
  process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1|@\/|host=\/|\/tmp/.test(url);
const client = new pg.Client({
  connectionString: url,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});
await client.connect();

/* MIGRATIONS FIRST, because everything below is meaningless if the schema is
   behind. A database that is connected, answering, and a generation out of
   date looks healthy from every other angle. */
console.log('\nMIGRATIONS');
try {
  const { rows: applied } = await client.query(
    'SELECT filename FROM schema_migrations ORDER BY filename',
  );
  const done = new Set(applied.map((r) => r.filename));
  const files = (await readdir(path.join(process.cwd(), 'db')))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const f of files) {
    console.log(`  ${done.has(f) ? '✓ applied' : '✗ PENDING'}  ${f}`);
  }
  const pending = files.filter((f) => !done.has(f));
  if (pending.length) {
    console.log(
      `\n  ${pending.length} migration(s) pending. Run:  heroku run "npm run db:migrate" -a lovevalues`,
    );
  }
} catch {
  console.log('  (schema_migrations not found — nothing has ever been applied)');
}

/* Only our own tables. Heroku's pg_stat_statements extension also lives in
   `public`; see scripts/our-tables.mjs for why that matters. */
const { rows: tables } = await client.query(`
  ${OUR_TABLES_CTE}
  SELECT table_name FROM ours ORDER BY table_name
`);
console.log('\nTABLES');
if (tables.length === 0) console.log('  (none — has the migration run?)');
for (const t of tables) console.log(`  ${t.table_name}`);

/* Masked: enough to recognise your own address, not enough to be worth a
   screenshot. */
const mask = (email) => {
  if (!email) return '(no email)';
  const [name, domain] = email.split('@');
  if (!domain) return '(malformed)';
  return `${name.slice(0, 2)}${'…'}@${domain}`;
};

console.log('\nACCOUNTS');
try {
  const { rows } = await client.query(
    `SELECT id, email, (password_hash IS NOT NULL) AS has_password, created_at
       FROM users ORDER BY id`,
  );
  if (rows.length === 0) {
    console.log('  none — nobody has ever signed up on this database.');
    console.log('  If you cannot sign in, that is why: create the account at /signup.');
  }
  for (const u of rows) {
    const when = new Date(u.created_at).toISOString().slice(0, 10);
    console.log(
      `  #${u.id}  ${mask(u.email)}  password: ${u.has_password ? 'yes' : 'NO (social sign-in only)'}  created ${when}`,
    );
  }
} catch {
  console.log('  (users table not found — has the migration run?)');
}

/* The privacy wall. `text`, `json`, `jsonb`, arrays and unbounded varchar are
   all large enough to swallow a module's worth of writing; none of them may
   exist here. See db/001_init.sql. */
const { rows: loose } = await client.query(`
  ${OUR_TABLES_CTE}
  SELECT c.table_name, c.column_name, c.data_type
  FROM information_schema.columns c
  JOIN ours o ON o.table_name = c.table_name
  WHERE c.table_schema = 'public'
    AND (
      c.data_type IN ('text','json','jsonb','ARRAY','xml','bytea')
      OR (c.data_type LIKE '%character%' AND c.character_maximum_length IS NULL)
    )
  ORDER BY c.table_name, c.column_name
`);

console.log('\nPRIVACY WALL');
if (loose.length === 0) {
  console.log('  OK — no column here can hold a user’s answers.');
} else {
  console.log('  FAILED. These columns are unbounded and could store answers:');
  for (const c of loose) console.log(`    ${c.table_name}.${c.column_name} (${c.data_type})`);
  console.log('  Fix the schema before anyone signs up.');
}

console.log('');
await client.end();
/* Non-zero exit on a breached wall so this can be used as a deploy gate later. */
process.exit(loose.length === 0 ? 0 : 1);
