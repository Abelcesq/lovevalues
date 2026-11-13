/**
 * reCAPTCHA verification. Server-side only — the secret key must never be
 * bundled into a page.
 *
 * A token produced in the browser proves nothing until Google has confirmed
 * it, so every path that accepts one calls verifyCaptcha() before doing any
 * work. A client that says "I solved the captcha" is a client saying anything
 * it likes.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THREE BEHAVIOURS THAT ARE DELIBERATE AND SHOULD SURVIVE EDITS.
 *
 * 1. INERT WITHOUT A SECRET. With no RECAPTCHA_SECRET_KEY set, verification is
 *    skipped and every form works exactly as it did before. The same posture
 *    as Stripe in /api/checkout and the engine in /api/synthesize, and for the
 *    same reason: this site is live and a push IS the deploy, so a feature
 *    that half-arrives must not take signup down with it.
 *
 * 2. FAIL OPEN WHEN GOOGLE IS UNREACHABLE, FAIL CLOSED WHEN GOOGLE SAYS NO.
 *    A timeout, a 503 from Google, or a mangled response allows the request
 *    through. A response that positively reports failure blocks it. The
 *    trade-off is explicit: a Google outage would otherwise stop people
 *    creating accounts, and the thing being defended here is spam, not a bank
 *    vault. An attacker cannot reach this branch at will — they would have to
 *    take Google down from our side.
 *
 * 3. THE SCORE IS ONLY APPLIED WHEN GOOGLE SENDS ONE. v2 (the checkbox)
 *    returns no score; treating a missing score as 0 would reject every single
 *    v2 user, which is exactly the shape of bug that gets discovered by a
 *    stranger who cannot sign up and never tells you.
 * ─────────────────────────────────────────────────────────────────────────
 */

const SECRET = process.env.RECAPTCHA_SECRET_KEY ?? "";

/** Whether verification can run at all. Routes read this to stay honest about
    what they are and are not checking. */
export const captchaConfigured = Boolean(SECRET);

/**
 * v3 only. Google scores 0.0 (almost certainly a bot) to 1.0 (almost certainly
 * human); 0.5 is Google's own suggested starting point. Raise it only with
 * evidence, because every increment turns away real people silently.
 */
export const MIN_SCORE = (() => {
  const raw = Number(process.env.RECAPTCHA_MIN_SCORE);
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.5;
})();

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const TIMEOUT_MS = 5_000;

export type CaptchaResult =
  /** Let the request through. `skipped` means nothing was actually checked. */
  | { ok: true; skipped: boolean; score?: number }
  /** Refuse. `reason` is for logs; `message` is safe to show a person. */
  | { ok: false; reason: string; message: string };

/** What Google's endpoint sends back. */
export type VerifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  "error-codes"?: string[];
};

/**
 * Turn Google's JSON into a verdict.
 *
 * Split out from the network call so the decision table can be tested
 * directly — the interesting cases here are all about what the response says,
 * not about HTTP.
 */
export function evaluateVerifyResponse(
  data: VerifyResponse,
  minScore = MIN_SCORE,
): CaptchaResult {
  if (!data || data.success !== true) {
    const codes = Array.isArray(data?.["error-codes"])
      ? data["error-codes"].join(",")
      : "none";
    /* A used or expired token is the overwhelmingly common failure and it is
       not the person's fault — it happens when they take a while over the
       form, or when a first submit failed for another reason and the widget
       was not reset. Say something they can act on. */
    const stale =
      codes.includes("timeout-or-duplicate") || codes.includes("invalid-input-response");
    return {
      ok: false,
      reason: `rejected:${codes}`,
      message: stale
        ? "That security check expired. Please tick it again and resubmit."
        : "The security check didn’t pass. Please try again.",
    };
  }

  /* v2 sends no score at all. Only judge one that exists. */
  if (typeof data.score === "number" && data.score < minScore) {
    return {
      ok: false,
      reason: `low_score:${data.score}`,
      message:
        "We couldn’t confirm you’re a person. Please try again, or use a different browser or network.",
    };
  }

  return { ok: true, skipped: false, score: data.score };
}

/**
 * Ask Google whether this token is good.
 *
 * `remoteIp` is optional and Google treats it as advisory. We pass it when we
 * have it, and never require it: behind Heroku's router the client address
 * arrives in a forwarded header that is trivial to spoof, so it must not be
 * allowed to influence whether someone gets in.
 */
export async function verifyCaptcha(
  token: string | undefined | null,
  remoteIp?: string | null,
): Promise<CaptchaResult> {
  if (!captchaConfigured) return { ok: true, skipped: true };

  if (!token) {
    return {
      ok: false,
      reason: "missing_token",
      message: "Please complete the security check below.",
    };
  }

  const body = new URLSearchParams({ secret: SECRET, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  let data: VerifyResponse;
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`siteverify ${res.status}`);
    data = (await res.json()) as VerifyResponse;
  } catch (error) {
    /* Behaviour 2 in the header. Logged loudly, because a steady stream of
       these means the check is not actually running and nobody would
       otherwise notice — it looks identical to everything working. */
    console.error("captcha: could not reach Google, allowing request", error);
    return { ok: true, skipped: true };
  }

  return evaluateVerifyResponse(data);
}

/** The caller's address, as best Heroku's router reports it. Advisory only. */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? (forwarded.split(",")[0]?.trim() ?? null) : null;
}
