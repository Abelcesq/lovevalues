import { Footer, Nav } from '@/components/Chrome';
import { LEGAL_DISCLOSURE } from '@/lib/method';

export const metadata = { title: 'Privacy — Love Values' };

export default function Privacy() {
  return (
    <>
      <Nav cta={false} />
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
              Right now, your answers are stored in your own browser on this device. They are not
              sent to us as you type, and we do not keep a copy on our servers.
            </p>
            <p>
              The one exception is when you press <strong>Generate my profile</strong>. At that
              moment your answers are sent to our server, used once to produce your reflection, and
              then discarded. We do not write them to a database or a log.
            </p>
            <p>
              Because everything lives on your device, clearing your browser data will erase your
              profile — and we will not be able to recover it. Use <strong>Download my data</strong>{' '}
              on the review page to keep your own copy.
            </p>
          </section>

          <section className="syn-section">
            <h2>Your voice</h2>
            <p>
              When you speak an answer, transcription happens in your browser. We never receive an
              audio recording of you.
            </p>
          </section>

          <section className="syn-section">
            <h2>What you can do at any time</h2>
            <p>
              Edit any answer. Regenerate your profile. Export everything as a file you own. Delete
              all of it permanently, in one click, without asking us.
            </p>
          </section>

          <section className="syn-section">
            <h2>Compatibility analysis</h2>
            <p>
              This feature is not built yet. When it is, two rules govern it: it will require both
              people to consent — the sender to send and the recipient to receive — and it will only
              ever be able to see general character and values traits. Your childhood and your past
              relationships will be structurally out of its reach, not merely off-limits by policy.
            </p>
          </section>

          <section className="syn-section">
            <h2>Honestly, where we are</h2>
            <p>
              This is an early product. There are no accounts yet, which means there is nothing for
              anyone to break into — but it also means there is no sync between your devices. When
              accounts arrive, this page will be rewritten before they ship, not after.
            </p>
          </section>

          <div className="framing">{LEGAL_DISCLOSURE}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
