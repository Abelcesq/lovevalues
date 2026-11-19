"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import Captcha, {
  BLOCKED_MESSAGE,
  type CaptchaHandle,
} from "@/components/Captcha";
import { Footer, Nav } from "@/components/Chrome";

/**
 * Ask for a reset link.
 *
 * The success message is identical whether or not the address has an account
 * — see app/api/password/request for why. This page must not improve on that
 * by being helpful.
 */
export default function Forgot() {
  const captcha = useRef<CaptchaHandle>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const check = (await captcha.current?.getToken()) ?? {
      status: "off" as const,
    };
    if (check.status === "unsolved") {
      return setError("Please tick the security check below.");
    }
    if (check.status === "blocked") return setError(BLOCKED_MESSAGE);

    setBusy(true);
    try {
      const res = await fetch("/api/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          captchaToken: check.status === "ok" ? check.token : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setSent(data.message);
        return;
      }
      captcha.current?.reset();
      setError(data.message ?? data.error ?? "We couldn’t send that just now.");
    } catch {
      captcha.current?.reset();
      setError("We couldn’t reach the server. Please try again.");
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
            <h1>Reset your password</h1>
            <p>We’ll email you a link. It works once and expires in an hour.</p>
          </div>

          {sent ? (
            <>
              <div className="notice">{sent}</div>
              <p className="auth-alt">
                <Link href="/login">Back to sign in</Link>
              </p>
            </>
          ) : (
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

              <Captcha ref={captcha} action="password_reset" />

              {error && <p className="field-error">{error}</p>}

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-block"
                disabled={busy}
              >
                {busy ? "Sending…" : "Email me a link"}
                {!busy && <ArrowRight aria-hidden="true" />}
              </button>
            </form>
          )}

          <p className="auth-alt">
            Remembered it? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
