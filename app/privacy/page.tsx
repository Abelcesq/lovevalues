import { Footer, Nav } from "@/components/Chrome";
import { LEGAL_DISCLOSURE } from "@/lib/method";

export const metadata = { title: "Privacy — Love Values" };

export default function Privacy() {
  return (
    <>
      <Nav />
      <main className="journey">
        <div className="read">
          <div className="module-open">
            <span className="eyebrow">Privacy</span>
            <h1>What happens to what you write</h1>
            <p>Plainly, and without the usual hedging.</p>
          </div>

          <section className="syn-section">
            <h2>Where your answers live</h2>
            <p>
              Right now, your answers are stored in your own browser on this
              device. They are not sent to us as you type, and we do not keep a
              copy on our servers.
            </p>
            <p>
              Your <strong>account</strong> — your name, your email — is a
              separate thing from your answers, and during the beta it is also
              stored only in this browser. Your password is scrambled before it
              is saved and is never transmitted. This means your account does
              not sync between devices yet, and it is not a security barrier:
              anyone with your unlocked device can open your profile. When real
              accounts arrive, this page will be rewritten before they ship, not
              after.
            </p>
            <p>
              The one exception is when you press{" "}
              <strong>Generate my profile</strong>. At that moment your answers
              are sent to our server, passed once to the AI that writes your
              reflection, and then discarded. We do not write them to a database
              or a log.
            </p>
            <p>
              Being specific about who that AI is: normally it is
              Anthropic&apos;s Claude. If that service is unavailable, we can
              fall back to an open-source model reached through a routing
              service called OpenRouter, so that your reflection doesn&apos;t
              simply fail. When we do, we require that the provider does not
              train on what you wrote. If a reflection was produced this way, we
              mark it — you should be able to tell.
            </p>
            <p>
              We would rather say that plainly than let &quot;our server&quot;
              quietly stand in for a chain of companies. If you would prefer
              your answers never travel that path, simply don&apos;t generate a
              profile — everything else in the app works without it, and your
              answers stay on your device.
            </p>
            <p>
              Because everything lives on your device, clearing your browser
              data will erase your profile — and we will not be able to recover
              it. Use <strong>Export</strong> on your dashboard to keep your own
              copy of everything, and <strong>Print or save my analysis</strong>{" "}
              on your profile page if what you want is the reflection itself, as
              a PDF or on paper.
            </p>
          </section>

          <section className="syn-section">
            <h2>Payment</h2>
            <p>
              If and when you enter card details, they go directly to Stripe on
              Stripe&apos;s own pages. We never see, handle, or store a card
              number. We are told only whether a subscription is active.
            </p>
          </section>

          <section className="syn-section">
            <h2>Your voice</h2>
            <p>
              When you speak an answer, transcription happens in your browser.
              We never receive an audio recording of you.
            </p>
          </section>

          <section className="syn-section">
            <h2>What you can do at any time</h2>
            <p>
              Edit any answer. Regenerate your profile. Export everything as a
              file you own. Delete all of it permanently, in one click, without
              asking us.
            </p>
          </section>

          <section className="syn-section">
            <h2>Compatibility analysis</h2>
            <p>
              This feature is not built yet. When it is, two rules govern it: it
              will require both people to consent — the sender to send and the
              recipient to receive — and it will only ever be able to see
              general character and values traits. Your childhood and your past
              relationships will be structurally out of its reach, not merely
              off-limits by policy.
            </p>
          </section>

          <section className="syn-section">
            <h2>Honestly, where we are</h2>
            <p>
              This is an early product, and the design is deliberate rather than
              temporary: <strong>what you write stays on your device</strong>.
              Our server exists to hold your account and to run the AI that
              writes your reflection — not to keep your answers.
            </p>
            <p>
              The honest cost of that: signing in on a new phone restores your
              account and your subscription, not your writing. Clearing your
              browser data is permanent. Use <strong>Export</strong> on your
              dashboard and keep your own copy — we would rather say this
              plainly than let a sign-up screen imply a safety net that
              isn&apos;t there.
            </p>
          </section>

          <div className="framing">{LEGAL_DISCLOSURE}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
