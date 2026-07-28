import { ArrowRight, Compass, Eye, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Footer, Nav } from '@/components/Chrome';
import AskAi from '@/components/AskAi';
import SplashCta from '@/components/SplashCta';

/**
 * The splash.
 *
 * The long-form explanation that used to live here has moved, intact, to
 * /how-it-works. This page has one job: say what Love Values is in a few
 * seconds and invite the visitor to start. That is the flow the CEO asked for,
 * and it is the flow the reference sites use — eharmony and DateOurlove both
 * open with a short promise and a single obvious next action rather than an
 * essay.
 *
 * One deliberate difference from those references, and it is not stylistic:
 * the full explanation is one click away and linked prominently, not buried.
 * This product asks a stranger what their parents' marriage was like. Making
 * "what am I actually signing up for?" hard to find would be the wrong trade
 * on this particular product, whatever it does for conversion.
 */

export const metadata = {
  title: 'Love Values — know what you value, be truly seen',
};

const PILLARS = [
  {
    icon: Compass,
    title: 'Start with what you value',
    body: 'A guided card sort narrows thirty-two values down to the three to five that win when they collide.',
  },
  {
    icon: Eye,
    title: 'See the patterns you carry',
    body: 'Where your instincts about partnership came from, and how they show up when it counts.',
  },
  {
    icon: Sparkles,
    title: 'Get a mirror, not a verdict',
    body: 'A reflection written for you, that asks whether it got you right — and changes when you say it did not.',
  },
];

export default function Splash() {
  return (
    <>
      <Nav variant="splash" />

      <main className="splash">
        <section className="splash-hero">
          <div className="wrap splash-inner">
            <p className="eyebrow">Values-first, not appearance-first</p>
            <h1>
              Know what you actually value. Then be <span className="hl">seen</span> for it.
            </h1>
            <p className="splash-lede">
              Love Values is a private, AI-guided confidant. In about an hour it walks you through
              the handful of values you truly build a life around, the patterns you picked up
              before you could choose them, and how both show up in love.
            </p>

            <SplashCta />

            <p className="splash-fine">
              <Lock aria-hidden="true" />7 days free · Cancel any time · Your answers stay on your
              device
            </p>
          </div>
        </section>

        <section className="splash-pillars">
          <div className="wrap splash-pillar-grid">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <div className="splash-pillar" key={title}>
                <span className="p-mark">
                  <Icon aria-hidden="true" />
                </span>
                <h2>{title}</h2>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="splash-more">
          <div className="wrap splash-inner">
            <h2>Want the whole argument before you sign up?</h2>
            <p>
              Fair. There is a full, plain-language explanation of the method, what it costs, what
              happens to what you write, and what this is <em>not</em> — including the fact that it
              is not therapy and never replaces it.
            </p>
            <div className="cta-row">
              <Link className="btn btn-ghost btn-lg" href="/how-it-works">
                Read how it works <ArrowRight aria-hidden="true" />
              </Link>
              <Link className="textlink care-link" href="/support">
                Or talk to a real person
              </Link>
            </div>
          </div>
        </section>

        <AskAi />
      </main>

      <Footer />
    </>
  );
}
