"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Footer, Nav } from "@/components/Chrome";
import PasswordField from "@/components/PasswordField";
import SocialButtons from "@/components/SocialButtons";
import { loadAccount, signIn } from "@/lib/account";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const account = await signIn(email, password);
    if (!account) {
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
