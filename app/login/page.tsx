"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import Captcha, {
  BLOCKED_MESSAGE,
  type CaptchaHandle,
} from "@/components/Captcha";
import { Footer, Nav } from "@/components/Chrome";
import PasswordField from "@/components/PasswordField";
import SocialButtons from "@/components/SocialButtons";
import { loadAccount, signIn } from "@/lib/account";
import { TimeoutError, withTimeout } from "@/lib/timeout";

/* Ceilings, not guesses. The captcha check talks to Google with its own 5s
   budget, so 12s covers it with room. Sign-in does a database round trip;
   past 20s nobody is still waiting hopefully, they are reloading the page. */
const CAPTCHA_TIMEOUT_MS = 12_000;
const SIGN_IN_TIMEOUT_MS = 20_000;

/**
 * Sign in.
 *
 * WHAT WAS WRONG HERE (audit, 2026-11-13). This page never contacted the
 * server. It compared the password against a hash in THIS browser's
 * localStorage, so signing in on a second device was impossible by
 * construction — and the page said so, in an error message that described
 * the limitation as a beta policy rather than a bug. Meanwhile /signup had
 * been creating real server accounts and opening real sessions for weeks.
 * Signing up and signing in were two different systems.
 *
 * It now signs in through Auth.js against the database, which is what makes
 * the member area in middleware.ts mean anything: a cookie you cannot get
 * without a password the server checked.
 *
 * THE LOCAL CHECK IS STILL HERE, as a fallback for when there is no database
 * configured at all. That path keeps a developer — and the site, if the
 * add-on were ever detached — working rather than locked out, and matches
 * how every other integration in this codebase degrades.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}

/**
 * Ask the server whether sign-in is possible at all, and turn a false into a
 * sentence. Returns null when the server is fine — in which case the failure
 * really was the credentials.
 *
 * Never throws and never blocks for long: this runs after a sign-in has
 * already failed, and a diagnosis that hangs is worse than no diagnosis.
 */
async function serverSideReason(): Promise<string | null> {
  try {
    const res = await withTimeout(
      fetch("/api/auth-status", { cache: "no-store" }),
      4000,
      "the status check",
    );
    const s = (await res.json()) as {
      signInWorks?: boolean;
      sessionSecret?: boolean;
      database?: boolean;
      tablesReady?: boolean;
    };
    if (s.signInWorks) return null;
    if (s.sessionSecret === false) {
      return "Sign-in isn’t set up on the server yet. This is our problem, not your details.";
    }
    if (s.database === false) {
      return "We can’t reach our database right now, so nobody can sign in. Your details are fine — please try again shortly.";
    }
    if (s.tablesReady === false) {
      return "Our database is mid-setup, so sign-in isn’t available yet. This is our problem, not your details.";
    }
    return "Sign-in isn’t available right now. This is our problem, not your details.";
  } catch {
    return null;
  }
}

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const captcha = useRef<CaptchaHandle>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  /**
   * Auth.js sends people here with ?error=... when a sign-in fails, because
   * auth.ts names /login as its error page. Until now this page ignored that
   * parameter completely, so a configuration failure rendered a blank sign-in
   * form with nothing to read — which is how a missing AUTH_SECRET turns into
   * twenty minutes of guessing.
   *
   * "Configuration" never means the person did anything wrong. It means the
   * server is not set up, so it says so plainly rather than implying they
   * mistyped something.
   */
  const authError = params.get("error");
  const [error, setError] = useState<string | null>(
    authError === "Configuration"
      ? "Sign-in isn’t available right now — this is a problem on our side, not with your details. Please try again shortly."
      : authError === "CredentialsSignin"
        ? "That email and password don’t match an account."
        : authError
          ? "We couldn’t sign you in. Please try again."
          : null,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const check = (await captcha.current?.getToken()) ?? { status: "off" };
    if (check.status === "unsolved") {
      return setError("Please tick the security check below.");
    }
    if (check.status === "blocked") {
      return setError(BLOCKED_MESSAGE);
    }

    setBusy(true);

    /* EVERYTHING FROM HERE IS INSIDE try/finally, AND THAT IS THE WHOLE POINT.
       The first version of this handler had no finally, so setBusy(false) ran
       only on the paths someone remembered. In production the button went
       disabled and stayed that way — no error, nothing to click, the form
       apparently dead. The CEO's words were "nothing happens, this page
       freezes", and that is exactly what an unsettled promise looks like from
       the other side of the screen.

       Awaiting anything without a ceiling can do it: a database query that
       never returns, a request nobody answers, a library that quietly gives
       up. So every wait below has a timeout, and the button is released no
       matter which way this ends. */
    try {
      /* Verified on the server, because the secret key lives there and a
         browser that says "I passed" is a browser saying anything it likes.
         See app/api/captcha/route.ts for the honest limits of what this
         protects while sign-in is still a local check. */
      if (check.status === "ok") {
        try {
          const res = await withTimeout(
            fetch("/api/captcha", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: check.token }),
            }),
            CAPTCHA_TIMEOUT_MS,
            "the security check",
          );
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) {
            captcha.current?.reset();
            setError(
              data.error ?? "The security check didn’t pass. Please try again.",
            );
            return;
          }
        } catch {
          /* Unreachable or slow. Matching the server's own fail-open rule: a
             network blip must not lock someone out of their own account. */
        }
      }

      /* Where they were going before the gate stopped them. Only ever a path
         on this site: an absolute URL here would make the sign-in page an
         open redirect, which is a credible phishing step on a product people
         reach by link. */
      const raw = params.get("next") ?? "";
      const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "";

      /* The server first. A session cookie is the only thing that opens the
         member area. */
      let timedOut = false;
      try {
        const { signIn: authSignIn } = await import("next-auth/react");
        const result = await withTimeout(
          authSignIn("credentials", {
            email: email.trim(),
            password,
            redirect: false,
          }),
          SIGN_IN_TIMEOUT_MS,
          "sign-in",
        );
        /* `ok` MEANS THE REQUEST SUCCEEDED, NOT THE SIGN-IN. Auth.js v5
           answers a rejected credential with ok:true, status:200 and an
           `error` field — so checking ok alone treats a wrong password as a
           success. What followed was worse than an error message: this pushed
           to /dashboard, the middleware found no session cookie and bounced
           it back here, and the person was returned to a login page with
           nothing on it to read. "Nothing happens" was the report, and that
           is precisely what it looks like. Both must be true. */
        if (result?.ok && !result?.error) {
          /* Keep the device record in step so the journey still knows their
             name, exactly as /signup does. A failure here is not fatal — they
             are signed in, and the local record rebuilds on next signup. */
          await signIn(email, password).catch(() => null);
          router.push(next || "/dashboard");
          return;
        }
      } catch (err) {
        /* A TIMEOUT IS NOT A WRONG PASSWORD and must not be reported as one.
           Telling someone their details are wrong when the server never
           answered sends them to reset a password that was fine. */
        timedOut = err instanceof TimeoutError;
      }

      const account = await signIn(email, password).catch(() => null);
      if (account) {
        router.push(next || (account.plan ? "/journey" : "/checkout"));
        return;
      }

      captcha.current?.reset();

      /* BEFORE BLAMING THE PERSON, CHECK WHETHER THE SERVER CAN SIGN ANYONE
         IN AT ALL. A failed credential and a server that is not set up are
         indistinguishable from the form's side, and the default guess —
         "your details are wrong" — is the one that sends someone off to
         reset a password that was always fine. It is also the guess that
         hides a real outage: every person affected quietly concludes they
         forgot something.

         /api/auth-status answers in booleans and knows the difference:
         no session secret, a database that does not answer, a schema behind
         on migrations. When it says sign-in cannot work, say THAT. */
      const reason = timedOut ? null : await serverSideReason();

      setError(
        reason ??
          (timedOut
            ? "The server didn’t answer in time. Your details are probably fine — please try again in a moment."
            : loadAccount()
              ? "That email and password don’t match the account on this device."
              : "That email and password didn’t match an account."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Nav variant="flow" />
      <main className="journey">
        <div className="auth">
          <div className="auth-head">
            <h1>Welcome back</h1>
            <p>Pick up exactly where you left off.</p>
          </div>

          <SocialButtons />

          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <PasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <Captcha ref={captcha} action="login" />

            {error && <p className="field-error">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={busy}
            >
              Log in {!busy && <ArrowRight aria-hidden="true" />}
            </button>
          </form>

          <p className="auth-alt">
            New here? <Link href="/signup">Create an account</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
