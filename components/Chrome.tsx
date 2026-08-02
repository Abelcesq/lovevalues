import Link from "next/link";
import { LEGAL_DISCLOSURE } from "@/lib/method";

/**
 * The mark — the CEO's logo, 2026-08-02.
 *
 * Replaces the flat indigo compass tile. The earlier note here argued against a
 * heart on the grounds that it would file this next to every dating app; the
 * CEO chose one anyway, and the drawing answers the objection: an open outline
 * in gold-to-rose on deep indigo reads closer to a wedding invitation than to a
 * swipe app, and the LV monogram carries the name rather than the shape.
 *
 * Inline SVG rather than a PNG, on purpose. It is asked to render from ~28px in
 * the footer to ~84px in the header, and it must stay crisp on a retina phone
 * at every size in between; one vector does that with no @2x set and no extra
 * request. Sizing lives entirely in CSS — nothing here is fixed in pixels.
 */
export function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      <svg viewBox="0 0 512 512" role="presentation" focusable="false">
        <defs>
          <linearGradient id="lv-tile" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#37276F" />
            <stop offset="0.55" stopColor="#2A1E58" />
            <stop offset="1" stopColor="#221741" />
          </linearGradient>
          {/* Gold at the top-left shoulder falling to rose at the point, which
              is the direction the light runs in the CEO's original. */}
          <linearGradient id="lv-heart" x1="0.1" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor="#F0CB8E" />
            <stop offset="0.45" stopColor="#EFAE90" />
            <stop offset="1" stopColor="#EE8FA0" />
          </linearGradient>
        </defs>

        <rect width="512" height="512" rx="116" fill="url(#lv-tile)" />

        <path
          d="M256 414C256 414 92 316 92 204c0-54 42-92 92-92 34 0 60 20 72 42 12-22 38-42 72-42 50 0 92 38 92 92 0 112-164 210-164 210z"
          fill="none"
          stroke="url(#lv-heart)"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <text
          x="256"
          y="286"
          textAnchor="middle"
          fill="#F8F2E7"
          fontSize="158"
          fontStyle="italic"
          fontFamily="Georgia, 'Times New Roman', 'Playfair Display', serif"
          letterSpacing="-6"
        >
          LV
        </text>
      </svg>
    </span>
  );
}

/**
 * `variant` controls what the nav offers, because the three contexts want
 * different things:
 *
 *   'splash' — a visitor who has not signed up. Log in + Sign up.
 *   'flow'   — mid sign-up. Nothing but the mark and the care link; a nav full
 *              of exits during a three-step flow is just leak.
 *   'app'    — inside the product. Their answers, and no CTA to start.
 */
export function Nav({
  variant = "app",
}: {
  variant?: "splash" | "flow" | "app";
}) {
  return (
    <header className="nav">
      <div className="wrap navbar">
        <Link href="/" className="brand">
          <Mark />
          <span>Love&nbsp;Values</span>
        </Link>
        <nav className="nav-actions">
          {/* Always reachable, never loud. Someone who needs this should not
              have to hunt for it, and should not have to trip a screen first.
              It is also the one nav link that survives at phone widths — and
              it survives the sign-up flow too, where someone is most likely to
              be alone with a hard question. */}
          <Link className="login care-link" href="/support">
            Talk to an external resource
          </Link>

          {variant === "splash" && (
            <>
              <Link className="login" href="/how-it-works">
                How it works
              </Link>
              <Link className="login" href="/login">
                Log in
              </Link>
              <Link className="btn btn-primary" href="/signup">
                Get started
              </Link>
            </>
          )}

          {variant === "app" && (
            <>
              <Link className="login" href="/review">
                Your answers
              </Link>
              <Link className="btn btn-ghost" href="/dashboard">
                Dashboard
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-top">
          <Link href="/" className="brand">
            <Mark />
            <span>Love&nbsp;Values</span>
          </Link>
          <nav className="foot-links">
            <Link className="care-link" href="/support">
              Talk to an external resource
            </Link>
            <Link href="/review">Your answers</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
        <p className="disclaimer">
          {LEGAL_DISCLOSURE} If you are in distress, please reach out to a
          qualified professional or a trusted person in your life — or{" "}
          <Link href="/support">see who you can talk to</Link>.
        </p>
        <p className="copy">© 2026 Love Values · lovevalues.com</p>
      </div>
    </footer>
  );
}
