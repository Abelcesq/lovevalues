import { Footer, Nav } from '@/components/Chrome';
import { CRISIS_RESOURCES, SAFETY_RESOURCES, type Resource } from '@/lib/care';

export const metadata = {
  title: 'Talk to someone — Love Values',
  description:
    'Free, confidential support lines. If you are in distress, please reach out to a qualified professional or a trusted person in your life.',
};

export default function Support() {
  return (
    <>
      <Nav cta={false} />
      <main className="journey">
        <div className="read">
          <div className="module-open">
            <span className="eyebrow">You&apos;re not alone in this</span>
            <h1>Talk to someone</h1>
            <p>
              This product is software. There are moments it has no business being the thing you
              turn to — and reaching a person is the right call more often than people let
              themselves believe.
            </p>
          </div>

          <div className="framing">
            <strong>If you are in immediate danger,</strong> call
            your local emergency number — 911 in the US and Canada, 999 in the UK, 112 across the EU
            and much of the world.
          </div>

          <section className="syn-section">
            <span className="eyebrow">Crisis and distress</span>
            <h2>Free, confidential, around the clock</h2>
            <p>
              You do not have to be in crisis to call any of these. Distress is enough. Being tired
              of carrying something alone is enough.
            </p>
            {CRISIS_RESOURCES.map((r) => (
              <ResourceCard key={r.name + r.region} resource={r} />
            ))}
          </section>

          <section className="syn-section">
            <span className="eyebrow">If you may not be safe</span>
            <h2>When the danger is another person</h2>
            <p>
              These lines will talk it through with you without pushing you toward any decision. You
              do not need to have decided anything, and you do not need to be certain, to call.
            </p>
            {SAFETY_RESOURCES.map((r) => (
              <ResourceCard key={r.name + r.region} resource={r} />
            ))}
          </section>

          <section className="syn-section">
            <span className="eyebrow">Worth saying plainly</span>
            <h2>What this product is not</h2>
            <p>
              Love Values is not therapy, counseling, or psychiatry, and it does not replace them.
              It asks reflective questions and offers a reading of your own answers. It cannot
              assess how you are doing, it cannot tell whether you are safe, and it should never be
              the only thing holding you.
            </p>
            <p>
              If the questions here have opened something that needs more than a screen — that is
              not a failure of yours, and it is not a failure of the method. It is the most
              reasonable outcome there is. A good therapist is worth more than any profile this
              could generate for you.
            </p>
          </section>

          <p className="save-note">
            Your answers are saved and untouched. Come back whenever you want — or don&apos;t.
            Either is a fine choice.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <div className="resource">
      <span className="resource-region">{resource.region}</span>
      <h3>{resource.name}</h3>
      <p className="resource-contact">{resource.contact}</p>
      <p>{resource.detail}</p>
      {resource.href && (
        <a className="resource-link" href={resource.href} target="_blank" rel="noopener noreferrer">
          {resource.href.replace('https://', '')} →
        </a>
      )}
    </div>
  );
}
