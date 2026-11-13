import { NextResponse } from "next/server";
import { captchaConfigured, clientIp, verifyCaptcha } from "@/lib/captcha";

/**
 * Verify a captcha token on its own, with no other side effect.
 *
 * WHY THIS EXISTS SEPARATELY. Signing up posts to a server route, so its
 * captcha is checked inside that route. Signing in does not: /login compares a
 * password against a hash in this browser's own localStorage and never touches
 * the server at all (see lib/account.ts). There is no request to attach a
 * check to, so the check needs its own endpoint.
 *
 * BE HONEST ABOUT WHAT THIS BUYS. It stops a bot driving the login FORM, which
 * is what the captcha was asked for. It does not protect the credential check
 * itself, because that check happens in the browser, where anything is
 * possible to anyone who opens devtools — and a bot attacking localStorage on
 * its own machine is attacking nothing. The real protection arrives when
 * sign-in moves to the server alongside signup; at that point this endpoint
 * should be deleted and the verification folded into that route, exactly as
 * /api/signup does it.
 *
 * The secret key is read here and never leaves the server.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  /* Nothing configured, nothing to check. Mirrors lib/captcha.ts so a
     half-configured deploy never blocks a sign-in. */
  if (!captchaConfigured) return NextResponse.json({ ok: true, skipped: true });

  let token: string | undefined;
  try {
    ({ token } = (await request.json()) as { token?: string });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not read the request." },
      { status: 400 },
    );
  }

  const result = await verifyCaptcha(token, clientIp(request));
  if (!result.ok) {
    console.warn("login: captcha rejected", result.reason);
    return NextResponse.json(
      { ok: false, error: result.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, skipped: result.skipped });
}
