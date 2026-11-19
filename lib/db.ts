/**
 * The database connection — identity and billing only.
 *
 * Read `db/001_init.sql` before adding anything here. That file, not this one,
 * is where the privacy wall lives: no column in this database is large enough
 * to hold a person's answers, and a test enforces it. Nothing in this file
 * should ever need to store free text.
 *
 * ANSWERS NEVER TOUCH THIS MODULE. They live in the browser (`lib/store.ts`)
 * and are sent to `/api/synthesize` once, used, and discarded. If you find
 * yourself importing this file from anything that handles answers, stop — that
 * is the wall being crossed, and it is the one thing this architecture exists
 * to prevent.
 */

import { Pool } from "pg";

/* Heroku Postgres terminates TLS with a certificate signed by its own internal
   authority, which Node does not trust out of the box. Without this the very
   first query fails with SELF_SIGNED_CERT_IN_CHAIN — a confusing error that
   looks like a connection-string problem and is not. The connection is still
   encrypted; we are declining to verify the issuer, which is the documented
   arrangement for Heroku Postgres.
   Local development uses a plain socket with no TLS at all, so the flag is
   applied only when the URL is not localhost. */
const url = process.env.DATABASE_URL ?? "";
const isLocal = /localhost|127\.0\.0\.1|@\/|host=\/|\/tmp/.test(url);

/* Reused across hot reloads in development. Next.js re-evaluates modules on
   every edit, and a fresh Pool per reload exhausts Postgres connection slots
   within a few minutes — the failure looks like "too many clients already"
   and is maddening to diagnose if you have not seen it before. */
const globalForDb = globalThis as unknown as { lvPool?: Pool };

export const pool =
  globalForDb.lvPool ??
  new Pool({
    connectionString: url,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    /* Heroku's smallest Postgres plans cap total connections in the low tens,
       and a Next.js app can hold several dynos' worth of pools open. Keeping
       this small leaves headroom for migrations and for `heroku pg:psql`. */
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") globalForDb.lvPool = pool;

/** True when a database is configured at all. The app degrades to local-only
 *  accounts when it is not, so that a missing DATABASE_URL never presents as a
 *  crash on a page a visitor is looking at. */
export const dbConfigured = Boolean(url);

/**
 * Can this app actually talk to its database right now?
 *
 * WHY A SEPARATE FUNCTION FROM `dbConfigured`. That constant answers "is
 * DATABASE_URL set", which is a question about our configuration, not about
 * the database. The two came apart in production: /api/auth-status reported
 * every light green while sign-in hung, because the URL was set and the
 * server could not reach the database behind it.
 *
 * BOUNDED, because an unbounded health check has the same disease as the bug
 * it is diagnosing. `pool.query` waits for a free connection, and when the
 * pool is exhausted — which is one of the things this is meant to catch — it
 * waits indefinitely. A health check that hangs reports nothing.
 */
export async function dbReachable(
  timeoutMs = 4000,
): Promise<{ ok: boolean; ms: number; error?: string; tables?: boolean }> {
  const started = Date.now();
  try {
    /* NOT `SELECT 1`. A brand-new, EMPTY database answers SELECT 1 perfectly,
       so a check built on it reports a healthy green while every sign-in
       fails with "relation users does not exist" — connected, and useless.
       That gap is not hypothetical: it is where this check stood while the
       sign-in bug was being hunted. Ask for something the app actually needs. */
    const probe = await Promise.race([
      /* Probe the OLDEST and the NEWEST table the app needs, not just one.
         Checking `users` alone passes on a database that has had 001 applied
         and nothing since — which is exactly the state production was found
         in: sign-in worked against `users` while /me had no table at all.
         One probe per migration generation catches a half-migrated database,
         which is the shape this failure actually takes. */
      pool.query(
        `SELECT to_regclass('public.users')            IS NOT NULL AS has_users,
                to_regclass('public.member_profiles')  IS NOT NULL AS has_profiles`,
      ),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`no answer within ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
    const row = (
      probe as { rows?: { has_users?: boolean; has_profiles?: boolean }[] }
    )?.rows?.[0];
    const hasUsers = row?.has_users === true;
    const hasProfiles = row?.has_profiles === true;
    const tables = hasUsers && hasProfiles;

    /* Reachable, half-migrated and fully migrated are three different states
       needing three different actions, and they were one green light before.
       Name which migration is missing rather than saying "run them" — the
       runner skips what is already applied, so the instruction is the same
       either way, but the diagnosis should not be guesswork. */
    return {
      ok: true,
      ms: Date.now() - started,
      tables,
      error: tables
        ? undefined
        : hasUsers
          ? "connected, but behind on migrations (member_profiles is missing) — run npm run db:migrate"
          : "connected, but empty — no tables at all. Run npm run db:migrate",
    };
  } catch (error) {
    return {
      ok: false,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}
