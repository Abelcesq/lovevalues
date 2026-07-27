import Link from 'next/link';
import { Footer, Nav } from '@/components/Chrome';
import ResumeNotice from '@/components/ResumeNotice';
import Steps from '@/components/Steps';
import { LEGAL_DISCLOSURE } from '@/lib/method';

export const metadata = { title: 'Begin — Love Values' };

export default function Begin() {
  return (
    <>
      <Nav variant="flow" />
      <main className="journey">
        <div className="read">
          <Steps current={3} />

          <ResumeNotice />

          <div className="module-open">
            <span className="eyebrow">The first step</span>
            <h1>
              Congratulations — you&apos;re beginning one of the most impactful experiences of your
              life.
            </h1>
            <p>
              What follows is a guided path inward. Four parts: what you value, where your ways of
              loving began, how you actually show up, and what you reach for when things get hard.
            </p>
          </div>

          <div className="q-block">
            <p className="q-prompt">Three things worth knowing before you start.</p>

            <div className="step" style={{ marginBottom: 16 }}>
              <span className="num">01</span>
              <div>
                <h3>Honesty is the whole engine</h3>
                <p>
                  The mirror is only as true as what you put in front of it. Nobody else reads your
                  answers. There is no one to impress here, and nothing to protect.
                </p>
              </div>
            </div>

            <div className="step" style={{ marginBottom: 16 }}>
              <span className="num">02</span>
              <div>
                <h3>You can speak instead of type</h3>
                <p>
                  Every answer field has a microphone. Talk it out and we&apos;ll transcribe it —
                  you can edit the words afterward. Most people say more, and say it truer, out
                  loud.
                </p>
              </div>
            </div>

            <div className="step" style={{ marginBottom: 16 }}>
              <span className="num">03</span>
              <div>
                <h3>Nothing here is final</h3>
                <p>
                  Every question and answer stays editable. Change one and regenerate your profile
                  whenever you want. This is a living document, not a test.
                </p>
              </div>
            </div>
          </div>

          <div className="framing">
            <strong>Please read this.</strong>
            <p style={{ marginTop: 10 }}>{LEGAL_DISCLOSURE}</p>
            <p style={{ marginTop: 10 }}>
              This is not therapy and does not replace it. Parts of this — especially the questions
              about childhood — may bring up something tender. If you are in distress, please reach
              out to a qualified professional or a trusted person in your life.
            </p>
          </div>

          <div className="controls">
            <Link className="btn btn-primary btn-lg" href="/journey?m=values">
              I understand — begin
            </Link>
            <Link className="btn btn-ghost btn-lg" href="/">
              Not yet
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
