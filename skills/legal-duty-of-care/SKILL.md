# SKILL — Legal & Duty of Care

**Purpose.** This product asks people about their childhood, their failed
relationships, and what they reach for when they are hurting. That carries
responsibility. This skill defines the non-negotiable protections.

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
   crisis or risk of harm, the correct behavior is to stop the analysis and
   warmly point toward a qualified professional or a trusted person. Enforced in
   the system prompt as hard rule 6; also needs a UI-level path (**open item**).
3. **Collect the minimum.** Never store more of a person's psyche than a
   feature actually requires. If a field isn't used by the method, delete it
   rather than keeping it "for later."
4. **The user owns their words.** Edit and delete must be real, immediate, and
   easy to find — not buried in settings. `app/review/page.tsx` has both.
5. **The privacy wall (Phase 2 match feature) is a data-layer boundary, not a
   prompt instruction.** The compatibility engine receives only general
   personality/characteristic traits. It must be structurally incapable of
   reading childhood details or past-relationship content. A prompt that says
   "don't look at X" while X is in the payload is not a wall.
6. **Double consent, always.** No compatibility analysis without both the
   sender consenting to send and the recipient consenting to receive.
7. **Identity disclosure is capped** at first name + last initial.
8. **Managed platforms only.** Do not hand-roll infrastructure or security for
   this data category. Encrypt at rest and in transit. Budget for a security
   professional past MVP. Security is an ongoing discipline, not a setup task.

## Current honest status — read before claiming compliance

- ✅ Disclosure shown at the gate (`app/begin`) and on the profile
- ✅ Answers are local-first; they leave the device only on an explicit
  synthesis request, and are not written to our disk
- ✅ Export and delete are implemented and one click from anywhere
- ⬜ **No distress-detection UI path yet** — only the model-side instruction
- ⬜ No privacy-law posture: no consent records, no deletion SLA, no breach
  process. Required before a single real user pays.
- ⬜ No security review of any kind

## Inter-skill communication

- **Empathy Voice** must never soften this disclosure to improve tone.
- **Mirror Discipline** provides the framing that sits alongside the disclosure;
  neither substitutes for the other.
