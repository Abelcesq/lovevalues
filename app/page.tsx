import Link from 'next/link';
import { Footer, Nav } from '@/components/Chrome';
import Reveal from '@/components/Reveal';
import { MODULES } from '@/lib/method';

export default function Home() {
  return (
    <>
      <Nav />
      <Reveal />
      <main>
        {/* HERO */}
        <section className="hero">
          <div className="glow" aria-hidden="true" />
          <div className="wrap">
            <div className="hero-inner">
              <span className="eyebrow">Your relationship confidant</span>
              <h1>
                Know what you truly value —<br />
                and be <span className="soft">truly seen.</span>
              </h1>
            </div>
            <div className="reflection" aria-hidden="true">
              Know what you truly value —<br />
              and be <span className="soft">truly seen.</span>
            </div>
            <div className="hero-inner">
              <p className="lede">
                A private, AI-guided confidant that helps you discover the values that matter most,
                understand the patterns you bring to love, and find a partner who can meet them —
                with honesty, and without judgment.
              </p>
              <div className="hero-cta">
                <Link className="btn btn-primary btn-lg" href="/begin">
                  Begin — free for 30 days
                </Link>
                <a className="btn btn-ghost btn-lg" href="#how">
                  See how it works
                </a>
              </div>
              <p className="assurance">
                Private and encrypted · No credit card for your first 30 days
              </p>
            </div>
          </div>
        </section>

        {/* THESIS */}
        <section className="thesis">
          <div className="wrap">
            <p>
              Almost every dating app starts with a face. This one starts with{' '}
              <span className="u">what you value</span> — because that&apos;s what actually makes
              love last.
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section" id="how">
          <div className="wrap">
            <div className="section-head reveal">
              <span className="eyebrow">How it works</span>
              <h2>Four steps to real clarity</h2>
              <p>
                A guided path inward — gentle, honest, and entirely your own. You can speak your
                answers aloud, and revise them anytime.
              </p>
            </div>
            <div className="steps">
              {MODULES.map((m) => (
                <div className="step reveal" key={m.id}>
                  <span className="num">{m.number}</span>
                  <div>
                    <h3>{m.title}</h3>
                    <p>{m.blurb}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="steps-note reveal">
              Then your confidant reflects it all back — as a <b>mirror, not a verdict</b> — and
              asks, gently: does this resonate?
            </p>
          </div>
        </section>

        <hr className="divider" />

        {/* PILLARS */}
        <section className="section">
          <div className="wrap">
            <div className="section-head reveal">
              <span className="eyebrow">Why it&apos;s different</span>
              <h2>Built to be honest, and kind</h2>
            </div>
            <div className="pillars">
              <div className="pillar reveal">
                <svg className="p-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <ellipse cx="12" cy="12" rx="10" ry="6.5" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="12" cy="12" r="2.6" fill="currentColor" />
                </svg>
                <h3>A mirror, not a verdict</h3>
                <p>
                  We reflect what your answers reveal and ask if it&apos;s true. You&apos;re never
                  graded, and nothing is final — your clarity grows as you do.
                </p>
              </div>
              <div className="pillar reveal">
                <svg className="p-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
                <h3>Values over appearance</h3>
                <p>
                  What someone looks like tells you almost nothing about whether you&apos;ll last.
                  What they value tells you almost everything.
                </p>
              </div>
              <div className="pillar reveal">
                <svg className="p-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3v18M5 8l7-5 7 5M5 8v8l7 5 7-5V8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
                <h3>For every faith, and none</h3>
                <p>
                  Faith matters deeply to some and not at all to others. You decide how much it
                  matters in love — and we honor exactly that.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MATCH */}
        <section className="section">
          <div className="wrap">
            <div className="match reveal">
              <span className="eyebrow">When you&apos;re ready</span>
              <h2>Invite someone to be seen, too</h2>
              <p>
                Share an honest look at where you fit and where you&apos;ll need to grow together —
                drawn only from your values and character, never your private history.
              </p>
              <p className="consent">Only ever with both people&apos;s consent.</p>
            </div>
          </div>
        </section>

        {/* TRUST */}
        <div className="wrap">
          <div className="trust reveal">
            <div className="item">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-3Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              Private and encrypted
            </div>
            <div className="item">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 20h16M6 16l9-9 3 3-9 9H6v-3Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              You own your words — edit or delete anytime
            </div>
            <div className="item">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M12 8h.01M11 12h1v4h1"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Not therapy or medical advice
            </div>
          </div>
        </div>

        {/* PRICING */}
        <section className="section">
          <div className="wrap">
            <div className="price reveal">
              <div className="free">
                Start <b>free</b> for 30 days.
              </div>
              <p className="terms">
                Your full values profile — <span>$29.99, once.</span>
                <br />
                Keep it living, and add match analysis — <span>$9.99 / month.</span>
              </p>
              <Link className="btn btn-primary btn-lg" href="/begin">
                Begin your profile
              </Link>
              <p className="cancel">Cancel anytime. Your data stays yours.</p>
            </div>
          </div>
        </section>

        {/* FINAL */}
        <section className="final">
          <div className="wrap">
            <span className="eyebrow">The first step</span>
            <h2>Ready to be seen?</h2>
            <p>It begins, quietly, with knowing yourself.</p>
            <Link className="btn btn-primary btn-lg" href="/begin">
              Begin — free for 30 days
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
