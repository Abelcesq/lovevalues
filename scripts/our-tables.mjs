/**
 * "Which tables are actually ours?"
 *
 * Shared by scripts/db-check.mjs and tests/schema.test.mjs so the two cannot
 * disagree about what the privacy wall covers.
 *
 * WHY THIS EXISTS. The first version of the wall check scanned everything in
 * the `public` schema and reported a FAILURE on production the first time it
 * ran — against `pg_stat_statements.query`, a `text` column. That is not our
 * table. Heroku installs the pg_stat_statements extension on every Postgres
 * plan for query-performance monitoring, it lives in `public`, and it records
 * SQL statement text with the values stripped out.
 *
 * The finding was harmless and the alarm was not: a wall check that cries wolf
 * teaches you to ignore it, and then it is worth nothing on the day it is
 * right. Same principle as the false-positive corpus in tests/care.test.mjs.
 *
 * Two filters, and both are needed:
 *   · `relkind = 'r'` — ordinary tables only. pg_stat_statements is a VIEW,
 *     and information_schema.tables happily lists views alongside tables.
 *   · the `pg_depend` clause — excludes anything owned by an installed
 *     extension, so a future extension that ships a real table is also
 *     ignored rather than becoming the next false alarm.
 */
export const OUR_TABLES_CTE = `
  WITH ours AS (
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_class'::regclass
          AND d.objid = c.oid
          AND d.deptype = 'e'
      )
  )
`;
