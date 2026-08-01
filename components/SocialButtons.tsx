"use client";

import { useState } from "react";

/**
 * Google / Facebook / Instagram sign-in.
 *
 * These are rendered but not yet connected, and they say so when tapped rather
 * than failing silently. Wiring them needs three things nobody has yet:
 *
 *   · a registered OAuth app per provider (client id + secret + redirect URI),
 *   · a server-side session store, because an OAuth token cannot be validated
 *     in the browser alone,
 *   · a decision on `Open CEO decisions #5` — social sign-in means a real
 *     account, which means a real backend.
 *
 * A note on Instagram specifically: there is no standalone "log in with
 * Instagram" for a product like this any more. The Basic Display API was
 * retired, and consumer login now runs through Meta — so Instagram and
 * Facebook are one integration, not two, and it will carry Meta's app review.
 *
 * The brand glyphs are inlined rather than imported: Lucide deliberately does
 * not ship company logos, and pulling in a second icon library for three marks
 * would break the one-system rule in skills/design-system.
 */

/* `authProvider` is what Auth.js is asked to sign in with — note that
   Instagram maps to `facebook`. That is not a shortcut: standalone Instagram
   login no longer exists for a product like this, and consumer login runs
   through Meta. One set of credentials, one review, two buttons. */
const PROVIDERS = [
  {
    id: "google",
    label: "Continue with Google",
    authProvider: "google",
    gate: "google",
  },
  {
    id: "facebook",
    label: "Continue with Facebook",
    authProvider: "facebook",
    gate: "meta",
  },
  {
    id: "instagram",
    label: "Continue with Instagram",
    authProvider: "facebook",
    gate: "meta",
  },
] as const;

export type SocialAvailability = { google: boolean; meta: boolean };

export default function SocialButtons({
  available = { google: false, meta: false },
}: {
  available?: SocialAvailability;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function handle(p: (typeof PROVIDERS)[number]) {
    if (!available[p.gate]) {
      setNotice(
        `${p.label.replace("Continue with ", "")} sign-in isn’t connected yet. Use your email below for now — it takes about twenty seconds.`,
      );
      return;
    }
    setBusy(p.id);
    try {
      /* Imported here rather than at module scope so that the Auth.js client
         bundle is only fetched by someone who actually taps a provider — and,
         more importantly, so this component still renders if Auth.js is not
         configured at all. */
      const { signIn } = await import("next-auth/react");
      await signIn(p.authProvider, { callbackUrl: "/checkout" });
    } catch {
      setBusy(null);
      setNotice(
        "We couldn’t reach that sign-in service. Please try your email below.",
      );
    }
  }

  return (
    <>
      <div className="social-stack">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="social-btn"
            disabled={busy !== null}
            onClick={() => handle(p)}
          >
            <Glyph id={p.id} />
            {busy === p.id ? "Taking you there…" : p.label}
          </button>
        ))}
      </div>

      {notice && <p className="social-notice">{notice}</p>}

      <div className="or">
        <span>or</span>
      </div>
    </>
  );
}

function Glyph({ id }: { id: "google" | "facebook" | "instagram" }) {
  if (id === "google") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.700-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z"
        />
        <path
          fill="#EA4335"
          d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"
        />
      </svg>
    );
  }
  if (id === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#1877F2"
          d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="ig" x1="0" y1="24" x2="24" y2="0">
          <stop offset="0" stopColor="#FDCB52" />
          <stop offset="0.5" stopColor="#E1306C" />
          <stop offset="1" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <path
        fill="url(#ig)"
        d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3zm6.9-11.1a1.5 1.5 0 1 1-1.5-1.6 1.5 1.5 0 0 1 1.5 1.6z"
      />
    </svg>
  );
}
