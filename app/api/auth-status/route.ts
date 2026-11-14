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

export const runtime = "nodejs";
/* Must not be cached: the answer changes the moment credentials are added on
   Heroku, and a cached "false" would keep the buttons dark after they work. */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    google: authStatus.google,
    meta: authStatus.meta,
    database: authStatus.database,
    /* Booleans only. See the note on authStatus.sessionSecret: this exists so
       a "Configuration" error can be diagnosed with one request instead of a
       guess, and `false` here is almost always the whole answer. */
    sessionSecret: authStatus.sessionSecret,
    signInWorks: authStatus.sessionSecret && authStatus.database,
  });
}
