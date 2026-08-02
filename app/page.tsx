import { ArrowRight, Compass, Eye, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { Footer, Nav } from "@/components/Chrome";
import AskAi from "@/components/AskAi";
import SplashCta from "@/components/SplashCta";

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
  title: "Love Values — know what you value, be truly seen",
};

const PILLARS = [
  {
    icon: Compass,
    title: "Start with what you value",
    body: "A guided card sort narrows thirty-two values down to the three to five that win when they collide.",
  },
  {
    icon: Eye,
    title: "See the patterns you carry",
    body: "Where your instincts about partnership came from, and how they show up when it counts.",
  },
  {
    icon: Sparkles,
    title: "Get a mirror, not a verdict",
    body: "A reflection written for you, that asks whether it got you right — and changes when you say it did not.",
  },
];

export default function Splash() {
  return (
    <>
      <Nav variant="splash" />

      <main className="splash">
        <section className="splash-hero">
          <div className="wrap splash-inner">
            {/* Two stacked lines, not one wrapped sentence, and not the uppercase
                letter-spaced eyebrow — this is the format the CEO specified. */}
            <p className="splash-tagline splash-tagline-head">
              Values and interpersonal dynamics FIRST
            </p>
            <p className="splash-tagline">
              Assess your values BEFORE physical appearance becomes the focus.
            </p>

            <h1>
              Know what matters to you and be <span className="hl">seen</span>{" "}
              by the commitment to your values.
            </h1>

            <p className="splash-lede">
              Love Values is a private, AI guide that will help with the
              following: 1) create clarity on your values, 2) identify
              personality traits that are important to you in a partner, 3)
              identify the personality traits you currently possess, and 4)
              explain how the current values and personality traits intertwine
              to create the unique You and your relationship dynamic.
            </p>
            <p className="splash-lede">
              By creating clarity for yourself, you can discover how to choose
              based on values and the personality traits that will build a
              relationship that can grow through your value system rather than
              be guided by physical appearance.
            </p>
            <p className="splash-lede splash-lede-cta">
              If this excites you, create your account now and let’s get
              started!!
            </p>

            <SplashCta />

            <p className="splash-fine">
              <Lock aria-hidden="true" />7 days free · Cancel any time · Your
              answers stay on your device
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
            <h2>Need more information…</h2>
            <p>
              If you are uncertain and need more information, that is OK. Some
              of us require time to prepare. Below is a link — “Read how it
              works” — that will provide more detailed information on the
              method, what it costs, the information you provide, and
              clarification on what this is not, including the fact that it is
              not therapy and never replaces it, and the benefits of ongoing
              updates and matching options.
            </p>
            <p>
              Also, if emotions or feelings come up, there is an external
              resource section to assist — to let you know that you are not
              alone, that talking about what is coming up is normal, and that
              community support is available.
            </p>
            <div className="cta-row">
              <Link className="btn btn-ghost btn-lg" href="/how-it-works">
                Read how it works <ArrowRight aria-hidden="true" />
              </Link>
              <Link className="textlink care-link" href="/support">
                Talk to an outside professional
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
