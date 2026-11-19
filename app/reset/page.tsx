"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Footer, Nav } from "@/components/Chrome";
import PasswordField from "@/components/PasswordField";

/**
 * Choose a new password, using the token from the email.
 *
 * The token stays in the URL and is posted once. It is never written to
 * localStorage: it is a key to the account, and this app's own storage is the
 * first place anyone holding the device would look.
 */
export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <Reset />
    </Suspense>
  );
}

function Reset() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      return setError(
        "Please use at least 10 characters. A short phrase works well.",
      );
    }
    setBusy(true);
    try {
      const res = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setDone(true);
        setTimeout(() => router.push("/login"), 1800);
        return;
      }
      setError(data.error ?? "That link is no longer valid.");
    } catch {
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
            <h1>Choose a new password</h1>
          </div>

          {!token ? (
            <>
              <div className="notice">
                This link is missing its code. Please open the link from your
                email, or request a new one.
              </div>
              <p className="auth-alt">
                <Link href="/forgot">Request a new link</Link>
              </p>
            </>
          ) : done ? (
            <div className="notice">
              Your password has been changed. Taking you to sign in…
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <PasswordField
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                hint="At least 10 characters. A short phrase works well."
              />

              {error && <p className="field-error">{error}</p>}

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-block"
                disabled={busy}
              >
                {busy ? "Saving…" : "Set my new password"}
                {!busy && <ArrowRight aria-hidden="true" />}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
