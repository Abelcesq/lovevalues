import { Footer, Nav } from '@/components/Chrome';
import { LEGAL_DISCLOSURE, MIRROR_FRAMING } from '@/lib/method';

export const metadata = { title: 'Terms — Love Values' };

export default function Terms() {
  return (
    <>
      <Nav cta={false} />
      <main className="journey">
        <div className="read">
          <div className="module-open">
            <span className="eyebrow">Terms</span>
            <h1>What this is, and what it isn&apos;t</h1>
          </div>

          <div className="framing">{LEGAL_DISCLOSURE}</div>

          <section className="syn-section">
            <h2>This is not therapy</h2>
            <p>
              Love Values is not therapy, counseling, psychiatry, coaching, or mentoring, and it
              does not replace any of them. It asks reflective questions and offers a reading of
              your own answers. That is all it does, and it is not a substitute for a qualified
              human being.
            </p>
            <p>
              If you are in distress, please reach out to a qualified professional or a trusted
              person in your life. That is not a formality — it is the right thing to do, and this
              product will always say so rather than trying to hold you itself.
            </p>
          </section>

          <section className="syn-section">
            <h2>The content is AI-generated</h2>
            <p>
              Your reflection is produced by an AI model. It may be wrong, inaccurate, or
              misleading. {MIRROR_FRAMING}
            </p>
            <p>
              Read it as a mirror, not a verdict — and when it&apos;s wrong, say so. That is a
              feature of the method, not a failure of it.
            </p>
          </section>

          <section className="syn-section">
            <h2>Your words are yours</h2>
            <p>
              You own what you write here. You can edit it, export it, or delete it entirely at any
              time. We claim no ownership of your answers and do not use them to train anything.
            </p>
          </section>

          <section className="syn-section">
            <h2>Pricing</h2>
            <p>
              Free for the first 30 days. Your full values profile is $29.99, once. Keeping it
              living, with match analysis, is $9.99 per month. Cancel anytime. Payment is not
              enabled yet in this build.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
