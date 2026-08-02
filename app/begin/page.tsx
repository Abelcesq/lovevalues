import { HeartHandshake } from "lucide-react";
import Link from "next/link";
import { Footer, Nav } from "@/components/Chrome";
import ResumeNotice from "@/components/ResumeNotice";
import Steps from "@/components/Steps";
import { PRE_JOURNEY_CARE } from "@/lib/care";
import { LEGAL_DISCLOSURE } from "@/lib/method";

export const metadata = { title: "Begin — Love Values" };

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
              Congratulations — you&apos;re beginning one of the most impactful
              experiences of your life.
            </h1>
            <p>
              What follows is a guided path inward. Four parts: what you value,
              where your ways of loving began, how you actually show up, and
              what you reach for when things get hard.
            </p>
            {/* CEO copy, revised 2026-08-02. Reproduced verbatim — his voice,
                like PRE_JOURNEY_CARE. Sets the time expectation before anyone
                starts, so nobody tries to finish this in a queue. */}
            <p>
              Please ensure to allow at least 30 minutes to about 120 minutes to
              give yourself the time and the space to reflect on the question
              and provide your most honest and genuine answers so that the
              analysis provided gives you the substance and clarity you seek. We
              at Love Values are excited for you and this journey of discovery!
            </p>
          </div>

          {/* The pre-journey care notice.
              It sits ABOVE the practical "three things", because it is the more
              important of the two and because everything else in this app's
              duty-of-care path is reactive — it fires after someone has already
              written something worrying. This is the only surface that reaches
              a person before anything has gone wrong. Copy is canonical: see
              PRE_JOURNEY_CARE in lib/care.ts. */}
          <section className="pre-care">
            <span className="pre-care-mark" aria-hidden="true">
              <HeartHandshake />
            </span>
            <div>
              <span className="eyebrow">You&apos;re not alone in this</span>
              <h2>Before you begin</h2>
              <p>{PRE_JOURNEY_CARE}</p>
              <p className="pre-care-link">
                Here is the link to resources should you ever need them.{" "}
                <Link href="/support">Talk to an external resource</Link>
              </p>
            </div>
          </section>

          <div className="q-block">
            <p className="q-prompt">
              Three things worth knowing before you start.
            </p>

            <div className="step" style={{ marginBottom: 16 }}>
              <span className="num">01</span>
              <div>
                <h3>Honesty is the whole engine</h3>
                <p>
                  The mirror is only as true as what you put in front of it.
                  Nobody else reads your answers. There is no one to impress
                  here, and nothing to protect.
                </p>
              </div>
            </div>

            <div className="step" style={{ marginBottom: 16 }}>
              <span className="num">02</span>
              <div>
                <h3>You can speak instead of type</h3>
                <p>
                  Every answer field has a microphone. Talk it out and
                  we&apos;ll transcribe it — you can edit the words afterward.
                  Most people say more, and say it truer, out loud.
                </p>
              </div>
            </div>

            <div className="step" style={{ marginBottom: 16 }}>
              <span className="num">03</span>
              <div>
                <h3>Nothing here is final</h3>
                <p>
                  Every question and answer stays editable. Change one and
                  regenerate your profile whenever you want. This is a living
                  document, not a test.
                </p>
              </div>
            </div>
          </div>

          <div className="framing">
            <strong>Please read this.</strong>
            <p style={{ marginTop: 10 }}>{LEGAL_DISCLOSURE}</p>
            <p style={{ marginTop: 10 }}>
              This is not therapy and does not replace it. Parts of this —
              especially the questions about childhood — may bring up something
              tender. If you are in distress, please reach out to a qualified
              professional or a trusted person in your life.
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
