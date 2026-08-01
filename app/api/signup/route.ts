/**
 * Email/password account creation.
 *
 * Sits beside Auth.js rather than inside it: Auth.js signs people in, it does
 * not register them. Creating the account here and then signing in through the
 * credentials provider keeps one code path for sessions.
 *
 * This endpoint stores an email, a name, and a bcrypt hash. It never sees an
 * answer — those stay in the browser. See db/001_init.sql.
 */

import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { createUser, startTrial } from "@/lib/users";
import { TRIAL_DAYS } from "@/lib/plan";

export const runtime = "nodejs";

/* Deliberately modest. Length beats character-class rules — a long passphrase
   is both stronger and easier to remember than eight characters of punctuation,
   and rules that demand a symbol mostly produce Password1! */
const MIN_PASSWORD = 10;

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      {
        error:
          "Accounts aren’t connected to a server yet. Your details are saved on this device only.",
        code: "no_database",
      },
      { status: 503 },
    );
  }

  let body: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Could not read the request." },
      { status: 400 },
    );
  }

  const name = `${body.firstName ?? ""} ${body.lastName ?? ""}`.trim();
  const email = (body.email ?? "").trim();
  const password = body.password ?? "";

  if (!name) {
    return NextResponse.json(
      { error: "Please tell us your name." },
      { status: 400 },
    );
  }
  /* Not a full RFC 5322 validator — those reject valid addresses and let junk
     through. A real address is confirmed by sending mail to it, not by regex. */
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "That email address doesn’t look right." },
      { status: 400 },
    );
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      {
        error: `Please use at least ${MIN_PASSWORD} characters. A short phrase works well.`,
      },
      { status: 400 },
    );
  }

  try {
    const user = await createUser({ name, email, password });

    if (!user) {
      /* Deliberately vague about WHY. Confirming that an address is registered
         tells anyone who asks that a particular person uses a relationship
         product — which for some people is genuinely unsafe. The honest cost is
         that a legitimate returning user gets a slightly unhelpful message; the
         link to sign in is there to soften it. */
      return NextResponse.json(
        {
          error:
            "We couldn’t create an account with those details. If you already have one, sign in instead.",
          code: "exists",
        },
        { status: 409 },
      );
    }

    await startTrial(user.id, TRIAL_DAYS);

    return NextResponse.json({ ok: true, email: user.email });
  } catch (error) {
    console.error("signup failed", error);
    return NextResponse.json(
      {
        error: "Something went wrong creating your account. Please try again.",
      },
      { status: 500 },
    );
  }
}
