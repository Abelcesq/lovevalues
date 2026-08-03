import Link from "next/link";
import { LEGAL_DISCLOSURE } from "@/lib/method";

/**
 * The mark — the CEO's revised logo, 2026-08-02, at public/logo.svg.
 *
 * Third version of this in one day, and the progression is worth recording
 * because it is a real lesson about drawing for small canvases. The first PNG
 * rendered the LV in a fine calligraphic hairline: beautiful at 512px, and by
 * 48px on a phone the monogram had dissolved into texture while the heart
 * carried on alone. The CEO redrew it with the letterforms as filled vector
 * paths on much heavier strokes, which is exactly the right fix — weight is
 * what survives being scaled down, not detail.
 *
 * Plain <img> rather than next/image. The optimiser exists to resize rasters,
 * and this is 2.4KB of vector that is already resolution-independent — running
 * it through the pipeline would add a request and buy nothing. The PNG stays in
 * public/ because social previews cannot use SVG, so an og:image still needs it.
 *
 * Both uploads landed in the repository ROOT, where Next.js does not serve
 * static files, and both were moved here. The filename also carried spaces,
 * which do not belong in a URL. Uploading straight into public/ avoids both.
 *
 * Sizing lives entirely in CSS so the header and footer can differ.
 */
export function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="" />
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
