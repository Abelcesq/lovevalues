import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConfigured } from "@/lib/db";
import { getMemberProfile, saveMemberProfile } from "@/lib/members";

/**
 * The signed-in member's own profile. Read it, replace it.
 *
 * THE USER ID COMES FROM THE SESSION AND NOWHERE ELSE. There is no id in the
 * path and none is read from the body, so there is no version of this route
 * that can be pointed at another member's profile — the usual way these
 * endpoints leak is an id parameter that nobody checks, and the fix is to not
 * have one.
 *
 * Both verbs refuse without a session. This is the first route in the app
 * that does; see middleware.ts for the page-level equivalent and the audit
 * note explaining why nothing did before.
 */

export const runtime = "nodejs";

async function requireUserId(): Promise<number | null> {
  const session = await auth();
  const raw = (session?.user as { id?: string } | undefined)?.id;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const UNAUTHORIZED = NextResponse.json(
  { error: "Please sign in." },
  { status: 401 },
);

export async function GET() {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Profiles aren’t connected to a server yet.", code: "no_database" },
      { status: 503 },
    );
  }
  const userId = await requireUserId();
  if (!userId) return UNAUTHORIZED;

  try {
    return NextResponse.json({ profile: await getMemberProfile(userId) });
  } catch (error) {
    console.error("member profile read failed", error);
    return NextResponse.json(
      { error: "We couldn’t load your profile. Please try again." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Profiles aren’t connected to a server yet.", code: "no_database" },
      { status: 503 },
    );
  }
  const userId = await requireUserId();
  if (!userId) return UNAUTHORIZED;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Could not read the request." },
      { status: 400 },
    );
  }

  try {
    const result = await saveMemberProfile(userId, body as never);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, field: result.field },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, profile: result.value });
  } catch (error) {
    console.error("member profile write failed", error);
    return NextResponse.json(
      { error: "We couldn’t save your profile. Please try again." },
      { status: 500 },
    );
  }
}
