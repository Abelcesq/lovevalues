import { ArrowRight, Check, Mic, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Footer, Nav } from "@/components/Chrome";
import Toc, { type TocEntry } from "@/components/Toc";
import { MODULES } from "@/lib/method";

/**
 * The full explanation, written as a long-form editorial page rather than a
 * landing page assembled from panels.
 *
 * This used to be the home page. It now sits one click behind the splash,
 * because the CEO's flow puts sign-up first — but nothing was cut. Someone who
 * wants the whole argument before handing over an email gets it here, and the
 * splash links to it prominently. A product that asks these questions should
 * never make the full explanation hard to find.
 *
 * Two reasons, and the second is the one that matters:
 *
 * 1. The panel layout — hero box, three feature cards, colour slab, pricing
 *    table — is what every AI-built site looks like right now, and it is what
 *    the CEO's other sites already look like.
 * 2. This product asks a stranger to write down what their parents' marriage
 *    was like. A page that sells in three-word cards has not earned that. A
 *    page that explains itself in plain paragraphs, tells you what it costs
 *    before you ask, and says out loud what it is not — that has a chance.
 *
 * So: one column, one canvas, no boxed sections, a sticky map on the left,
 * and CTAs dropped inline between sections instead of parked in slabs.
 */

const SECTIONS: TocEntry[] = [
  { id: "what", label: "What Love Values is" },
  { id: "why", label: "Why values, not photos" },
  { id: "how", label: "How the four parts work" },
  { id: "mirror", label: "A mirror, not a verdict" },
  { id: "voice", label: "You can just talk" },
  { id: "privacy", label: "What happens to what you write" },
  { id: "not", label: "What this is not" },
  { id: "cost", label: "What it costs" },
  { id: "match", label: "When you’re ready to be seen" },
];

export const metadata = { title: "How it works — Love Values" };

export default function HowItWorks() {
  return (
    <>
      <Nav variant="splash" />
      <main>
        <div className="wrap article">
          <Toc entries={SECTIONS} />

          <article className="article-body">
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

            <p className="standfirst">
              Love Values is a private, AI guide that will help with the
              following: 1) create clarity on your values, 2) identify
              personality traits that are important to you in a partner, 3)
              identify the personality traits you currently possess, and 4)
              explain how the current values and personality traits intertwine
              to create the unique You and your relationship dynamic.
            </p>

            <p className="byline">
              <ShieldCheck aria-hidden="true" />
              Private by default · Your answers stay on your device · Free for 7
              days
            </p>

            <div className="takeaways">
              <h2>The short version</h2>
              <ul>
                <li>
                  <Check aria-hidden="true" />
                  <span>
                    <b>Four guided parts</b> — Values, Roots, Patterns, Habits.
                    Around an hour if you do it in one sitting, and you
                    don&apos;t have to.
                  </span>
                </li>
                <li>
                  <Check aria-hidden="true" />
                  <span>
                    <b>You can speak every answer aloud</b> instead of typing
                    it. Most people say more that way, and say it more honestly.
                  </span>
                </li>
                <li>
                  <Check aria-hidden="true" />
                  <span>
                    <b>Your answers stay in your browser.</b> Your account
                    identifies you; your answers are not stored on our servers.
                  </span>
                </li>
                <li>
                  <Check aria-hidden="true" />
                  <span>
                    <b>What you get back is a mirror, not a verdict</b> — and it
                    asks you whether it got you right.
                  </span>
                </li>
                <li>
                  <Check aria-hidden="true" />
                  <span>
                    <b>Free for 7 days.</b> The full profile is $29.99 once.
                    Nothing is charged to begin.
                  </span>
                </li>
              </ul>
            </div>

            <section className="prose" id="what">
              <h2>What Love Values is</h2>
              <p>
                Most people can tell you what they want in a partner. Far fewer
                can tell you what they themselves value — not the words that
                sound good, but the three or four things that actually win when
                two good things collide. Loyalty or honesty, when being honest
                would hurt someone. Stability or adventure, when the offer comes
                in. Family or ambition, when the job is in another city.
              </p>
              <p>
                That&apos;s the gap this closes. Love Values takes one person —
                you, alone, with nobody watching — through a structured
                conversation about what you value, where your instincts about
                partnership came from, how you actually behave in relationships,
                and which daily habits are quietly helping or hurting. Then it
                reflects the whole thing back to you in plain language.
              </p>
              <p>
                It is deliberately not a dating app. There is no feed, no
                swiping, and nobody else can see you. It is the work you would
                want to have done <em>before</em> you met someone worth keeping.
              </p>
            </section>

            <section className="prose" id="why">
              <h2>Why values, and not photos</h2>
              <p>
                Nearly every dating site focuses on appearance and images.
                However, the physical appearance of a person will not provide
                any substantive information to assess whether a relationship
                with that person will last — how the person handles money, a
                sick parent, a broken promise, or a crisis.
              </p>
              <p>
                What someone values and how the person processes circumstances
                are more likely to confirm whether a relationship with that
                person will last long term. Understanding what things are
                cherished and honored, and obtaining compatibility based on
                those things, provides the foundation to allow the values to
                bridge the gap between a difficult circumstance and the
                sustainability of the relationship. Simply being attracted to
                another person rarely accomplishes that. Of course, time and
                daily interaction provide the ability to grow the relationship —
                but clarity of values can be the initial determination of
                whether the time investment makes sense.
              </p>
              <p>
                In the same way that love supersedes initial attraction, a
                value-based relationship will create a foundation that will hold
                stronger than one based only on physical appearance.
              </p>
            </section>

            <section className="prose" id="how">
              <h2>How the four parts work</h2>
              <p>
                The method runs in four modules, in this order, because each one
                only makes sense on top of the one before it. You can stop at
                any point and come back; everything you&apos;ve written is
                waiting.
              </p>
              <ol>
                {MODULES.map((m) => (
                  <li key={m.id}>
                    <b>{m.title}.</b> {m.blurb}
                  </li>
                ))}
              </ol>
              <p>
                A word about the second one, because it is the part people brace
                for. Roots is not an inventory of what happened to you. It asks
                what you observed{" "}
                <strong>between the two adults who raised you</strong> — how
                they treated each other — because that was the model of
                partnership you absorbed before you were old enough to evaluate
                it. Plenty of honest answers there describe a marriage that
                didn&apos;t work. That is useful information about you, and it
                is not a diagnosis of you.
              </p>
            </section>

            <div className="cta-inline">
              <h3>Start with the part almost nobody has done.</h3>
              <p>
                Module one is a card sort: thirty-two values, narrowed to the
                three to five that win when they collide. It takes about fifteen
                minutes and it&apos;s the piece people tell us they wish
                they&apos;d done years ago.
              </p>
              <Link className="btn btn-invert btn-lg" href="/signup">
                Begin — free for 7 days <ArrowRight aria-hidden="true" />
              </Link>
              <p className="fine">
                Free for 7 days. Cancel before it ends and you are never
                charged.
              </p>
            </div>

            <section className="prose" id="mirror">
              <h2>A mirror, not a verdict</h2>
              <p>
                Every reflection this produces carries the same framing, and it
                is not boilerplate:{" "}
                <strong>this is not a final analysis.</strong> It is what the
                method assessed from what you gave it. If the information
                changes, the analysis changes.
              </p>
              <p>
                So the last thing your profile does is ask you a question — does
                this resonate? Yes, partly, or no. If it&apos;s wrong, you say
                what it got wrong, correct the answers underneath it, and
                generate it again. Your profile is a living document that
                follows you, not a score you were assigned.
              </p>
              <p>
                It also never diagnoses, never grades, and never tells you what
                a thing about you means. It reflects, and then it asks.
              </p>
            </section>

            <section className="prose" id="voice">
              <h2>
                <Mic className="h-glyph" aria-hidden="true" /> You can just talk
              </h2>
              <p>
                Every answer field has a microphone. Tap it and speak; the words
                appear as you go, and you can edit them afterwards like anything
                you typed. This matters more than it sounds — people write
                carefully and speak honestly, and the questions here reward
                honesty far more than they reward polish.
              </p>
              <p>
                Transcription happens inside your browser. We never receive an
                audio recording of you.
              </p>
            </section>

            <section className="prose" id="privacy">
              <h2>What happens to what you write</h2>
              <p>
                Your answers are stored in this browser, on this device. An
                account gets you back into your own profile — it is not a copy
                of your answers, and we do not keep one on our servers. Nothing
                is sent anywhere as you type.
              </p>
              <p>
                The single exception is the moment you press{" "}
                <strong>Generate my profile</strong>. Your answers are sent
                once, passed to the AI that writes your reflection, and then
                discarded — not written to a database, not written to a log. The
                full detail, including exactly which companies are involved, is
                on the <Link href="/privacy">privacy page</Link>, written
                plainly rather than in the usual hedging.
              </p>
              <p>
                Because everything lives on your device, clearing your browser
                data erases your profile and we cannot recover it. You can
                export the whole thing as a file you own outright, at any time,
                from the review page.
              </p>
            </section>

            <section className="prose" id="not">
              <h2>What this is not</h2>
              <p>
                This is not therapy, and it must never be used as a substitute
                for it. It is not psychological, psychiatric, coaching, or
                medical advice. The content is AI-generated and can be wrong.
              </p>
              <p>
                If you are in distress, the right next step is a person, not an
                app. There is a{" "}
                <Link href="/support">Talk to an external resource</Link> link
                in the header of every page and at the bottom of every page,
                with real crisis lines behind it. It is there whether or not
                anything you write triggers it, because you should never have to
                justify yourself to software to reach help.
              </p>
            </section>

            <section className="prose" id="cost">
              <h2>What it costs</h2>
              <p>Plainly, with no card required to start:</p>
              <ul>
                <li>
                  <b>Free for 7 days.</b> The whole method, all four parts, the
                  full profile.
                </li>
                <li>
                  <b>$29.99, once</b> — your complete values profile, yours to
                  keep.
                </li>
                <li>
                  <b>$9.99 a month</b> — keeps the profile living, and adds
                  match analysis when it ships.
                </li>
              </ul>
              <p className="note">
                Cancel any time. Your data stays yours, and you can export it
                whenever you like.
              </p>
            </section>

            <section className="prose" id="match">
              <h2>When you&apos;re ready to be seen</h2>
              <p>
                Everything above is about one person. The next step — sharing an
                honest look at where you and someone else fit, and where
                you&apos;d have to grow together — is being built, and it comes
                with two rules that are not negotiable.
              </p>
              <p>
                It requires both people to agree: the sender to send, and the
                recipient to receive. And it can only ever see general character
                and values traits. Your childhood and your past relationships
                are structurally out of its reach, enforced in the data layer
                rather than promised in a policy.
              </p>
            </section>

            <div className="cta-inline">
              <h3>Ready to find out what you actually value?</h3>
              <p>
                It begins quietly, with knowing yourself. Nobody sees it but
                you, and you can stop and come back whenever you want.
              </p>
              <Link className="btn btn-invert btn-lg" href="/signup">
                Start my 7 days free <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            <p className="article-end">
              This application, its information, and its content are not, and
              are not intended to be construed as, psychological, psychiatric,
              therapy, mentoring, coaching, or advice of any kind. The content
              is AI-generated and may be wrong, inaccurate, or misleading. If
              you are in distress, please reach out to a qualified professional
              or a trusted person in your life — or{" "}
              <Link href="/support">see who you can talk to</Link>.
            </p>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
