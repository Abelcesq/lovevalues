import { NextResponse } from "next/server";
import { clientIp, verifyCaptcha } from "@/lib/captcha";
import { dbConfigured } from "@/lib/db";
import { emailConfigured, resetEmailBody, sendEmail } from "@/lib/email";
import { RESET_TTL_MS, createReset } from "@/lib/passwordReset";
import { rateLimit } from "@/lib/rateLimit";

/**
 * "I forgot my password" — step one. Sends the link.
 *
 * THIS ROUTE MUST NOT REVEAL WHETHER AN ACCOUNT EXISTS. Answering "no such
 * email" turns the form into a membership oracle: anybody can test an address
 * and learn that its owner uses a relationship product. For some people that
 * is genuinely unsafe, which is the same reason /api/signup is deliberately
 * vague about why it refused. So every outcome below returns the same body
 * and the same status — found, not found, already has a pending reset.
 *
 * The one thing it will say plainly is that the SERVER cannot send mail at
 * all. That is not about any particular person, and silently promising an
 * email nobody will ever receive is the failure someone waits twenty minutes
 * to be sure of.
 *
 * Rate limited by address, because this endpoint sends mail on demand: left
 * open it is a way to use our Resend account to flood someone's inbox.
 */

export const runtime = "nodejs";

const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

/* One sentence, whatever happened. */
const SAME_ANSWER = {
  ok: true,
  message:
    "If that email has an account, a reset link is on its way. It expires in an hour.",
};

export async function POST(request: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      {
        error: "not_configured",
        message: "Accounts aren’t connected to a server yet.",
      },
      { status: 503 },
    );
  }

  let body: { email?: string; captchaToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    /* A malformed address is not a statement about any account, so this one
       can be specific without leaking anything. */
    return NextResponse.json(
      { error: "That email address doesn’t look right." },
      { status: 400 },
    );
  }

  const ip = clientIp(request);
  const limited = rateLimit(`reset:${ip ?? "unknown"}`, LIMIT, WINDOW_MS);
  if (!limited.ok) {
    return NextResponse.json(
      {
        error:
          "Too many reset requests. Please wait a little before trying again.",
      },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const captcha = await verifyCaptcha(body.captchaToken, ip);
  if (!captcha.ok) {
    return NextResponse.json({ error: captcha.message }, { status: 400 });
  }

  if (!emailConfigured) {
    return NextResponse.json(
      {
        error: "no_email",
        message:
          "Password reset isn’t switched on yet — we can’t send email from this site. Please get in touch and we’ll sort it out.",
      },
      { status: 503 },
    );
  }

  try {
    const made = await createReset(email);
    if (made) {
      const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lovevalues.com";
      const link = `${origin}/reset?token=${encodeURIComponent(made.token)}`;
      const sent = await sendEmail(
        email,
        "Reset your Love Values password",
        resetEmailBody(link, Math.round(RESET_TTL_MS / 60000)),
      );
      /* A provider failure is logged, not surfaced: saying "we could not send
         to that address" would confirm the address exists. */
      if (!sent.ok) console.error("password reset: send failed", sent.error);
    }
  } catch (error) {
    /* Also swallowed deliberately. An error here is ours, and reporting it
       per-address would be another oracle. */
    console.error("password reset: request failed", error);
  }

  return NextResponse.json(SAME_ANSWER);
}
