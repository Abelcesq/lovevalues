"use client";

import { useState } from "react";

/**
 * Google sign-in.
 *
 * FACEBOOK AND INSTAGRAM WERE REMOVED, 2026-11-13, at the CEO's instruction:
 * they did not work. Both ran through Meta, both needed credentials nobody had
 * registered, and both answered a tap with "isn't connected yet" — a button
 * that cannot do the thing written on it, offered to someone at the exact
 * moment they are deciding whether to trust this product. The honest notice
 * underneath did not rescue it; it just explained the dead end politely. One
 * working way in beats three doors where two are painted on.
 *
 * To bring Meta back, restore the two entries in PROVIDERS, their glyphs, and
 * the `meta` gate — authStatus in auth.ts still reports it, and the Facebook
 * provider is still registered server-side, so nothing else has to change.
 * Instagram and Facebook were deliberately one integration: standalone
 * Instagram login no longer exists for a product like this, consumer login
 * runs through Meta, and that one integration carries Meta's app review.
 *
 * Google is kept and still gated: if AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET
 * are unset it says so rather than failing silently. If it is still unset when
 * a stranger arrives, it should come out too, by the same argument.
 *
 * The brand glyph is inlined rather than imported: Lucide deliberately does
 * not ship company logos, and a second icon library for one mark would break
 * the one-system rule in skills/design-system.
 */

const PROVIDERS = [
  {
    id: "google",
    label: "Continue with Google",
    authProvider: "google",
    gate: "google",
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

function Glyph({ id }: { id: "google" }) {
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
  return null;
}
