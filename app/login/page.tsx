"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Captcha, {
  BLOCKED_MESSAGE,
  type CaptchaHandle,
} from "@/components/Captcha";
import { Footer, Nav } from "@/components/Chrome";
import PasswordField from "@/components/PasswordField";
import SocialButtons from "@/components/SocialButtons";
import { loadAccount, signIn } from "@/lib/account";

export default function Login() {
  const router = useRouter();
  const captcha = useRef<CaptchaHandle>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

    router.push(account.plan ? "/journey" : "/checkout");
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
