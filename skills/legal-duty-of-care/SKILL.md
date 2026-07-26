# SKILL — Legal & Duty of Care

**Purpose.** This product asks people about the partnership they grew up
watching, their failed relationships, and what they reach for when they are
hurting. That carries responsibility. This skill defines the non-negotiable
protections.

**This is the Duty-of-Care seat's skill.** It exists because the business
voices on the board cannot fill it.

## Success criteria

No user is harmed by using this product, and no user is misled about what it is.
Both halves matter; the second is how the first usually fails.

## The canonical legal disclosure — never paraphrase

> This application, its information, and its content are not, and are not
> intended to be construed as, psychological, psychiatric, therapy, mentoring,
> coaching, or advice of any kind. The user understands that the content is
> AI-generated and may be wrong, inaccurate, or misleading. It is provided for
> informational use only and may offer valuable insight.

Lives in `lib/method.ts` as `LEGAL_DISCLOSURE`. Import it; never retype it.
Appears at signup and on every report.

## Hard gotchas

1. **Not therapy, and never presenting as therapy.** This includes visual
   language — no couch imagery, no clinical iconography, no "session" framing.
   A product that *looks* like therapy has claimed to be therapy.
2. **Distress routing beats task completion.** If a user's input suggests
   crisis or risk of harm, the correct behavior is to put a real human being in
   front of them and let the analysis wait. Implemented in three independent
   layers so no single one has to be perfect — see *The distress path* below.

3. **The screen must not cry wolf, and this is the hard part.** The Roots
   module asks people to describe the partnership they grew up watching. Many
   of those answers describe a marriage that plainly did not work — told
   calmly, in the past tense. **That is the method working, not a person in
   trouble.** A screen that fires there fires constantly on ordinary correct
   input, users learn within minutes to dismiss it, and the one time it matters
   it gets dismissed too. A false positive is not harmless over-caution here;
   it is the mechanism by which the real signal stops working.

   Therefore: screening keys on **present-tense risk**, never past-tense
   history. "He hits me" is a signal. "They fought constantly" is a normal
   answer. `tests/care.test.mjs` holds a corpus of realistic Roots answers that
   **must** screen clean, and it is the most important test in the repo. Extend
   it before touching a pattern.
4. **Collect the minimum.** Never store more of a person's psyche than a
   feature actually requires. If a field isn't used by the method, delete it
   rather than keeping it "for later."
5. **The user owns their words.** Edit and delete must be real, immediate, and
   easy to find — not buried in settings. `app/review/page.tsx` has both.
6. **The privacy wall (Phase 2 match feature) is a data-layer boundary, not a
   prompt instruction.** The compatibility engine receives only general
   personality/characteristic traits. It must be structurally incapable of
   reading childhood details or past-relationship content. A prompt that says
   "don't look at X" while X is in the payload is not a wall.
7. **Double consent, always.** No compatibility analysis without both the
   sender consenting to send and the recipient consenting to receive.
8. **Identity disclosure is capped** at first name + last initial.
9. **Managed platforms only.** Do not hand-roll infrastructure or security for
   this data category. Encrypt at rest and in transit. Budget for a security
   professional past MVP. Security is an ongoing discipline, not a setup task.

## The distress path

Three independent layers, so no single one has to be perfect:

1. **Always-on door.** "Talk to someone" sits in the nav and the footer of
   every page, and `/support` lists free confidential lines. Nobody should have
   to trip a screen to find help, and nobody should have to admit to anything
   to be shown it.
2. **Local screening while writing.** `lib/care.ts` screens each field as the
   user types, after a 700ms pause. A match renders a quiet dismissible card
   beneath the field (`components/CarePrompt.tsx`). It **never** blocks, opens
   a modal, steals focus, or alters what they wrote. Escalation past a dismissal
   is allowed (gentle → urgent); a dismissed level never returns.
3. **Engine-side flag.** The synthesis returns a required `careFlag`, and the
   profile leads with support rather than the analysis when it is set.

**Screening never leaves the browser.** Nothing is transmitted, stored, or
logged — not the match, not the level, not the text. A distress flag is the
last thing that should generate a network request, and a user who suspects it
might will simply stop being honest. Do not "improve" this by adding telemetry.

**This is routing, not assessment.** It does not measure anyone's risk and must
never be described as though it does.

## Current honest status — read before claiming compliance

- ✅ Disclosure shown at the gate (`app/begin`) and on the profile
- ✅ Answers are local-first; they leave the device only on an explicit
  synthesis request, and are not written to our disk
- ✅ Export and delete are implemented and one click from anywhere
- ✅ Distress path implemented in all three layers, with a regression suite
- ⬜ Resource list is US/UK-centric beyond the findahelpline.com fallback.
  Verify every number before launch and re-verify on a schedule — a dead
  crisis line is worse than none, because it is trusted.
- ⬜ Screening is English-only and pattern-based. It will miss indirect phrasing
  and anything not in English. It is a net, not a guarantee — layer 1 exists
  precisely because layers 2 and 3 will miss people.
- ⬜ No privacy-law posture: no consent records, no deletion SLA, no breach
  process. Required before a single real user pays.
- ⬜ No security review of any kind

## Inter-skill communication

- **Empathy Voice** must never soften this disclosure to improve tone.
- **Mirror Discipline** provides the framing that sits alongside the disclosure;
  neither substitutes for the other.
