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
