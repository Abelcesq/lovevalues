"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Footer, Nav } from "@/components/Chrome";
import PasswordField from "@/components/PasswordField";
import SocialButtons from "@/components/SocialButtons";
import Steps from "@/components/Steps";
import { createAccount } from "@/lib/account";
import { LEGAL_DISCLOSURE } from "@/lib/method";

/**
 * Step 1 of 3 — create the account.
 *
 * `lib/account.ts` is the seam this calls. Read its header before changing
 * anything here: there is no server yet, so this is not authentication, and
 * the page says so plainly rather than implying a security guarantee it cannot
 * keep. That honesty line is not decoration — someone is about to type a
 * password they use elsewhere.
 */
export default function SignUp() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* Which sign-in methods the server actually has credentials for. Defaults to
     everything off, so the buttons stay honest during the moment before the
     answer arrives and if the request fails outright. */
  const [available, setAvailable] = useState({
    google: false,
    meta: false,
    database: false,
  });

  useEffect(() => {
    let live = true;
    fetch("/api/auth-status")
      .then((r) => r.json())
      .then((s) => live && setAvailable(s))
      .catch(() => {
        /* Silent on purpose. A failed capability check is not something to put
           in front of someone signing up; the buttons simply stay in their
           not-connected state, which is the safe direction to fail. */
      });
    return () => {
      live = false;
    };
  }, []);

  const set =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      return setError(
        "Please give us both names — we use your first name to address you.",
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return setError("That email address doesn’t look right.");
    }
    /* Matches MIN_PASSWORD on the server. Length beats punctuation rules — a
       short phrase is stronger than eight characters of symbols and far easier
       to remember. */
    if (form.password.length < 10) {
      return setError(
        "Please use at least 10 characters. A short phrase works well.",
      );
    }

    setBusy(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        /* The account exists on the server; now open a session with the same
           credentials so the rest of the flow knows who this is. */
        const { signIn } = await import("next-auth/react");
        await signIn("credentials", {
          email: form.email.trim(),
          password: form.password,
          redirect: false,
        });
        /* Kept in step deliberately: the local record is still what the journey
           reads for the person's name, and their answers never leave this
           device. The server knows who they are; this device knows their work. */
        await createAccount(form);
        router.push("/checkout");
        return;
      }

      if (data.code === "no_database") {
        /* No server configured yet — fall back to the device-only account so
           signing up still works. This is the path in use until DATABASE_URL
           is set on Heroku. */
        await createAccount(form);
        router.push("/checkout");
        return;
      }

      setError(
        data.error ??
          "Something went wrong creating your account. Please try again.",
      );
      setBusy(false);
    } catch {
      setError(
        "We couldn’t reach the server. Please check your connection and try again.",
      );
      setBusy(false);
    }
  }

  return (
    <>
      <Nav variant="flow" />
      <main className="journey">
        <div className="auth">
          <Steps current={1} />

          <div className="auth-head">
            <h1>Create your account</h1>
            <p>
              Seven days free. You can cancel before it ends and never be
              charged.
            </p>
          </div>

          <SocialButtons available={available} />

          <form onSubmit={submit} noValidate>
            <div className="field-row">
              <Field
                id="firstName"
                label="First name"
                value={form.firstName}
                onChange={set("firstName")}
                autoComplete="given-name"
              />
              <Field
                id="lastName"
                label="Last name"
                value={form.lastName}
                onChange={set("lastName")}
                autoComplete="family-name"
              />
            </div>
            <Field
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={set("email")}
              autoComplete="email"
              placeholder="you@example.com"
            />
            <PasswordField
              value={form.password}
              onChange={set("password")}
              autoComplete="new-password"
              hint="At least 10 characters. A short phrase works well."
            />

            {error && <p className="field-error">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={busy}
            >
              {busy ? "Creating your account…" : "Continue"}
              {!busy && <ArrowRight aria-hidden="true" />}
            </button>
          </form>

          <p className="auth-alt">
            Already have an account? <Link href="/login">Log in</Link>
          </p>

          {/* Not a disclaimer to bury. Someone is typing a password they
              probably reuse, and they are entitled to know what this is.

              The two versions are the whole point: the first was true while
              there was no server, and became a LIE the moment one existed.
              Copy that describes the architecture has to be driven by the
              architecture, or it quietly turns into a false promise the day
              the infrastructure changes underneath it. */}
          <div className="framing auth-honesty">
            {available.database ? (
              <>
                <strong>What we keep, and what we don&apos;t:</strong>
                <p style={{ marginTop: 8 }}>
                  Your account — your name, your email, and your billing — is
                  stored on our server so you can sign in from any device. Your
                  password is hashed and we never see it.
                  <strong> Your answers are different.</strong> Everything you
                  write in the method stays on this device and is never stored
                  by us. That means signing in on a new phone restores your
                  account, not your answers — so use Export on your dashboard to
                  carry your work across.
                </p>
              </>
            ) : (
              <>
                <strong>While Love Values is in beta:</strong>
                <p style={{ marginTop: 8 }}>
                  Your account lives in this browser, on this device — there is
                  no server behind it yet, so it does not sync between devices
                  and it is not a security barrier. Your password is scrambled
                  before it is saved and is never sent anywhere. Please
                  don&apos;t reuse a password that protects something important.
                </p>
              </>
            )}
          </div>

          <p
            className="save-note"
            style={{ textAlign: "left", maxWidth: 520, margin: "20px auto 0" }}
          >
            {LEGAL_DISCLOSURE}
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Field({
  id,
  label,
  hint,
  ...props
}: {
  id: string;
  label: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} {...props} />
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
