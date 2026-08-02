/**
 * Inspect the live database without needing psql installed locally.
 *
 *   heroku run "npm run db:check" -a lovevalues
 *
 * `heroku pg:psql` requires a local PostgreSQL install, which a Windows laptop
 * running only Node does not have. This uses the `pg` client the app already
 * depends on, so it works anywhere the app itself runs.
 *
 * It prints three things:
 *   1. the tables that exist,
 *   2. how many accounts are registered,
 *   3. whether the privacy wall still holds — no column anywhere in this
 *      database is large enough to hold a person's answers.
 *
 * That third check is the one worth running after any schema change. It is the
 * same guarantee tests/schema.test.mjs enforces, verified against production
 * rather than a local copy.
 */

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

/* Only our own tables. Heroku's pg_stat_statements extension also lives in
   `public`; see scripts/our-tables.mjs for why that matters. */
const { rows: tables } = await client.query(`
  ${OUR_TABLES_CTE}
  SELECT table_name FROM ours ORDER BY table_name
`);
console.log('\nTABLES');
if (tables.length === 0) console.log('  (none — has the migration run?)');
for (const t of tables) console.log(`  ${t.table_name}`);

try {
  const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM users');
  console.log(`\nACCOUNTS\n  ${rows[0].n}`);
} catch {
  console.log('\nACCOUNTS\n  (users table not found)');
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
