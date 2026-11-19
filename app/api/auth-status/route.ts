/**
 * Which sign-in methods are actually usable right now.
 *
 * The signup and login pages are client components and cannot read server
 * environment variables, so they ask here instead. Doing it at runtime rather
 * than baking `NEXT_PUBLIC_` values in at build time means connecting Google
 * later is a config change and a restart, not a rebuild.
 *
 * Returns booleans only — never a client id, and obviously never a secret.
 */

import { NextResponse } from "next/server";
import { authStatus } from "@/auth";
import { dbReachable } from "@/lib/db";

export const runtime = "nodejs";
/* Must not be cached: the answer changes the moment credentials are added on
   Heroku, and a cached "false" would keep the buttons dark after they work. */
export const dynamic = "force-dynamic";

export async function GET() {
  /* ACTUALLY OPEN A CONNECTION, rather than reporting that a variable exists.
     The first version of this endpoint answered `database: true` whenever
     DATABASE_URL was set, which is how it reported every light green while
     sign-in hung: a URL that is set and a database that answers are two
     different facts, and only the second one lets anyone in. */
  const db = authStatus.database
    ? await dbReachable()
    : { ok: false, ms: 0, error: "DATABASE_URL is not set" };

  return NextResponse.json({
    google: authStatus.google,
    meta: authStatus.meta,
    /* Configured AND answering. */
    database: db.ok,
    databaseUrlSet: authStatus.database,
    databaseMs: db.ms,
    /* The reason, when there is one. It is a driver message about our own
       infrastructure — a host that refused, a pool with nothing free — and
       never anything about a person or their data. */
    databaseError: db.error ?? null,
    /* Reachable is not the same as ready. Answering queries while holding no
       tables is a state that reads as healthy and lets nobody in. */
    tablesReady: db.tables === true,
    /* Booleans only. See the note on authStatus.sessionSecret: this exists so
       a "Configuration" error can be diagnosed with one request instead of a
       guess, and `false` here is almost always the whole answer. */
    sessionSecret: authStatus.sessionSecret,
    signInWorks: authStatus.sessionSecret && db.ok && db.tables === true,
  });
}
