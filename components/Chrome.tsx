import Image from "next/image";
import Link from "next/link";
import { LEGAL_DISCLOSURE } from "@/lib/method";

/**
 * The mark — the CEO's logo artwork, uploaded 2026-08-02 and living at
 * public/logo.png. This replaced both the original flat indigo compass tile and
 * the vector recreation that briefly stood in for it while the real file was
 * being uploaded; the recreation's italic-serif monogram could not reproduce
 * the calligraphic LV, which is the most distinctive thing about the mark.
 *
 * It arrived in the repository ROOT, where Next.js does not serve static files,
 * and was moved here. Anything uploaded for the web has to sit under public/ or
 * it is simply not reachable — worth knowing before the next upload.
 *
 * Served through next/image rather than a bare <img> because the source is a
 * 512px, 120KB PNG being displayed at 30-84px. `sizes` is stated explicitly so
 * a phone downloads a ~48px-appropriate file instead of the full 512; without
 * it, next/image assumes 100vw and ships the whole thing. Dimensions come from
 * CSS, not from these props, so the header and footer can size it differently.
 */
export function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      <Image
        src="/logo.png"
        alt=""
        width={512}
        height={512}
        priority
        sizes="(max-width: 700px) 48px, 84px"
      />
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
