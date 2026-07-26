import Link from 'next/link';
import { LEGAL_DISCLOSURE } from '@/lib/method';

export function Mark({ id }: { id: string }) {
  return (
    <svg className="mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M4 24C4 24 10 12 20 12C30 12 36 24 36 24"
        stroke={`url(#${id})`}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="20" cy="23" r="5.2" fill={`url(#${id})`} />
      <defs>
        <linearGradient id={id} x1="4" y1="12" x2="36" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EBC489" />
          <stop offset="1" stopColor="#E9A6AF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Nav({ cta = true }: { cta?: boolean }) {
  return (
    <header className="nav">
      <div className="wrap navbar">
        <Link href="/" className="brand">
          <Mark id="brand-nav" />
          <span>
            <em>Love</em>&nbsp;Values
          </span>
        </Link>
        <nav className="nav-actions">
          {/* Always reachable, never loud. Someone who needs this should not
              have to hunt for it, and should not have to trip a screen first. */}
          <Link className="login care-link" href="/support">
            Talk to someone
          </Link>
          <Link className="login" href="/review">
            Your answers
          </Link>
          {cta && (
            <Link className="btn btn-primary" href="/begin">
              Begin
            </Link>
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
            <Mark id="brand-foot" />
            <span>
              <em>Love</em>&nbsp;Values
            </span>
          </Link>
          <nav className="foot-links">
            <Link className="care-link" href="/support">
              Talk to someone
            </Link>
            <Link href="/review">Your answers</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
        <p className="disclaimer">
          {LEGAL_DISCLOSURE} If you are in distress, please reach out to a qualified professional or
          a trusted person in your life — or <Link href="/support">see who you can talk to</Link>.
        </p>
        <p className="copy">© 2026 Love Values · lovevalues.com</p>
      </div>
    </footer>
  );
}
