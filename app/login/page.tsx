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

    /* Verified on the server, because the secret key lives there and a
       browser that says "I passed" is a browser saying anything it likes.
       See app/api/captcha/route.ts for the honest limits of what this
       protects while sign-in is still a local check. */
    if (check.status === "ok") {
      try {
        const res = await fetch("/api/captcha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: check.token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          captcha.current?.reset();
          setBusy(false);
          return setError(
            data.error ?? "The security check didn’t pass. Please try again.",
          );
        }
      } catch {
        /* The check could not be reached. Matching the server's own
           fail-open rule: a network blip must not lock someone out of their
           own account. */
      }
    }

    /* Where they were going before the gate stopped them. Only ever a path
       on this site: an absolute URL here would make the sign-in page an open
       redirect, which is a credible phishing step on a product people reach
       by link. */
    const raw = params.get("next") ?? "";
    const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "";

    /* The server first. A session cookie is the only thing that opens the
       member area. */
    try {
      const { signIn: authSignIn } = await import("next-auth/react");
      const result = await authSignIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (result?.ok) {
        /* Keep the device record in step so the journey still knows their
           name, exactly as /signup does. A failure here is not fatal — they
           are signed in, and the local record rebuilds on next signup. */
        await signIn(email, password).catch(() => null);
        router.push(next || "/dashboard");
        return;
      }
    } catch {
      /* Auth.js unreachable or unconfigured — fall through to the device
         check below rather than stranding them. */
    }

    const account = await signIn(email, password);
    if (!account) {
      captcha.current?.reset();
      setBusy(false);
      // Deliberately vague about which half was wrong — the usual reason is
      // security, but here it is simply true: on this device we may have no
      // account at all, and "no account on this device" is the likeliest case.
      setError(
        loadAccount()
          ? "That email and password don’t match the account on this device."
          : "There’s no account saved in this browser yet. Accounts don’t sync between devices during the beta.",
      );
      return;
    }

    router.push(next || (account.plan ? "/journey" : "/checkout"));
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
