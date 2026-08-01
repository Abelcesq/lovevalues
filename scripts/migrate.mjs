/**
 * Migration runner.
 *
 * Applies every `db/*.sql` file in filename order, once, inside a transaction,
 * recording what has run in `schema_migrations`. Deliberately about forty
 * lines rather than a migration framework: this schema will change perhaps a
 * dozen times in its life, and a dependency with its own build step is a worse
 * trade on Heroku than a file that anyone can read in a minute.
 *
 * Run:  npm run db:migrate
 * Heroku: heroku run npm run db:migrate -a lovevalues
 *
 * Safe to run repeatedly — already-applied files are skipped.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    'DATABASE_URL is not set.\n' +
      'Locally:  export DATABASE_URL=postgres://...\n' +
      'On Heroku it is set for you when you attach the Postgres add-on.',
  );
  process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1|@\/|host=\/|\/tmp/.test(url);
const client = new pg.Client({
  connectionString: url,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename   VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

const dir = path.join(process.cwd(), 'db');
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

const { rows } = await client.query('SELECT filename FROM schema_migrations');
const done = new Set(rows.map((r) => r.filename));

let applied = 0;
for (const file of files) {
  if (done.has(file)) {
    console.log(`· ${file} (already applied)`);
    continue;
  }
  const sql = await readFile(path.join(dir, file), 'utf8');
  /* Each file is its own transaction. A failure half-way through leaves the
     database exactly as it was, rather than in a state where the next run
     re-applies statements that already succeeded. */
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.log(`✓ ${file}`);
    applied += 1;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✗ ${file} — rolled back, database unchanged\n`, error);
    await client.end();
    process.exit(1);
  }
}

console.log(applied === 0 ? 'Schema already up to date.' : `Applied ${applied} migration(s).`);
await client.end();
