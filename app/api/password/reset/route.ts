import { NextResponse } from "next/server";
import { clientIp } from "@/lib/captcha";
import { dbConfigured } from "@/lib/db";
import { MIN_PASSWORD, consumeReset } from "@/lib/passwordReset";
import { rateLimit } from "@/lib/rateLimit";

/**
 * "I forgot my password" — step two. Spends the link, sets the password.
 *
 * AN INVALID, EXPIRED AND ALREADY-USED TOKEN ALL GET THE SAME ANSWER.
 * Distinguishing them tells someone holding a token whether it is real, which
 * is exactly what a person guessing would like to know.
 *
 * Rate limited by address even though the tokens are 256 bits and guessing is
 * hopeless: the cost of a limit is nothing, and it bounds any future mistake
 * that makes them weaker.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Accounts aren’t connected to a server yet." },
      { status: 503 },
    );
  }

  const limited = rateLimit(
    `reset-use:${clientIp(request) ?? "unknown"}`,
    20,
    60 * 60 * 1000,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a little and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }

  const password = body.password ?? "";
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      {
        error: `Please use at least ${MIN_PASSWORD} characters. A short phrase works well.`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await consumeReset(body.token ?? "", password);
    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            "That reset link is no longer valid — it may have expired or already been used. Please request a new one.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      message: "Your password has been changed. You can sign in now.",
    });
  } catch (error) {
    console.error("password reset: consume failed", error);
    return NextResponse.json(
      { error: "Something went wrong. Please request a new link." },
      { status: 500 },
    );
  }
}
