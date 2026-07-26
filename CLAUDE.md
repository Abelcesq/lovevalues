# CLAUDE.md — Love Values (project manager file)

This file is the project's manager. It keeps any session oriented and honest
against the project's stated goal. It reports upward to a portfolio-level
manager across all of the CEO's projects.

## Purpose, in one paragraph

Love Values is a faith-inclusive, values-first AI relationship confidant. It
guides a single person to (1) get clear on the values that actually matter to
them — the crux most people have never done — then (2) surface the roots,
patterns, and habits shaping how they show up in love, and (3) gives them the
language and courage to be seen by the right partner and to jointly build a
relationship on shared values. It exists to replace appearance-first dating
with values-first discernment.

## Current phase

**Phase 0 → Phase 1.** The web MVP is being built. The goal of this phase is
narrow and specific: **prove the method survives contact with a stranger** —
that a person who is not the founder, guided only by software, reaches clarity
worth paying for. Not scale. Not marketing. One honest validation.

## Hard rules — non-negotiable, enforced in code

1. **Standalone brand.** No reference to Abel Calderón, *My Path to Me*, or any
   personal brand appears anywhere user-facing. Ever.
2. **Empathy hard rule.** All feedback, questions, and analysis — especially
   anything touching family history — is delivered in a loving, empathetic tone.
   The method gently reflects and asks whether it resonates. It never diagnoses,
   judges, or declares. This is enforced in `app/api/synthesize/route.ts`.
3. **Roots is about the parents' partnership, not the user's trauma.** Module 2
   asks what the user observed *between* the two adults who raised them — how
   they treated each other — because that is the model of partnership the user
   absorbed before they could evaluate it. It is **not** an abuse inventory and
   must never be worded, analyzed, or described as one. Never recast "my parents
   argued badly and never repaired it" into a story about a wounded child. If a
   user volunteers something that happened *to* them, meet it with care — but
   never go looking for it. This is enforced in the questions themselves
   (`lib/method.ts`) and in the synthesis system prompt.
4. **Mirror, never verdict.** Every output carries the framing: *this is not a
   final analysis; if the information changes, the analysis can change.* Then it
   asks: does this resonate? (Yes / Partly / No — and tell us what to correct.)
5. **Not therapy.** The product is not, and must never present as, therapy.
   Anyone in distress is routed to real human help — implemented in three
   layers: an always-visible "Talk to someone" link and `/support` page,
   local-only screening while writing (`lib/care.ts`), and a `careFlag` the
   synthesis engine must return. Screening never leaves the browser; do not add
   telemetry to it. The false-positive corpus in `tests/care.test.mjs` is
   load-bearing — a screen that fires on ordinary Roots answers trains users to
   dismiss it, and then it fails the one time it matters.
6. **Legal disclosure** appears at signup and on every report. Canonical text
   lives in `lib/method.ts` as `LEGAL_DISCLOSURE` — do not paraphrase it.
7. **Faith posture.** Open to all faiths and to the non-religious. Faith is
   honored deeply for those who hold it, never imposed on those who don't.
8. **Privacy wall (Phase 2, match feature).** The compatibility engine receives
   only general personality/characteristic traits. It must never access or
   disclose either person's childhood details or past-relationship content.
   This must be enforced at the data layer, not merely promised.

## Open CEO decisions

1. ~~Confirm the name~~ ✅ **Love Values / lovevalues.com (secured).**
   Trademark search still recommended before heavy brand spend.
2. ~~**EZAITASK reference**~~ ✅ **Resolved 2026-07-26** via its handoff doc and
   a screenshot of the live app. Adopted: the placeholder advertises the mic,
   and its voice gotcha #10, which found a real shipped bug in
   `components/VoiceInput.tsx`. Not adopted: the bare circular icon (its field
   is one-line, ours is multi-line) or the cream theme. See
   `skills/voice-input/SKILL.md`. The repo itself still holds only
   `.gitattributes`, so the inline JS was never read.

   **EZAITASK is also the closest thing this project has to a proven template
   for Phase 1 monetization** — live Stripe with tiers, cancel/reactivate,
   top-ups, metered usage, Resend email, and a documented set of Stripe
   gotchas. When payment is decided (open item 6), read its `CLAUDE.md` first
   rather than starting cold.
3. **Home page** ✅ built and approved; now ported to `app/page.tsx`.
4. **Values card sort (Module 1)** ✅ built — `components/ValuesCardSort.tsx`.
5. **Open — accounts & persistence.** The MVP is deliberately local-first
   (browser `localStorage`). No account system, no server-side storage of a
   user's answers. This needs a CEO decision before Phase 1 payment testing,
   because payment implies accounts.
6. **Hosting + processor** ✅ **decided — Heroku, existing Stripe account.**
   Pricing unchanged: $9.99/mo (30 days waived), $29.99 one-time profile,
   $9.99/user match analysis. Nothing integrated yet, deliberately — deploy and
   run the stranger test first. See `skills/deploy-and-payments/SKILL.md`,
   which carries the `www.`-webhook trap and the rest.

## The board

Alex Hormozi (offer & scale) · Tony Robbins (human needs & brand) ·
Charlie Munger (judgment & inversion) · Napoleon Hill / Earl Nightingale /
Jim Rohn (mindset & purpose) · Marcus Aurelius (integrity & duty) ·
Jesus of Nazareth / Proverbs (the values core) · **Duty-of-Care seat**
(data ethics + pastoral/clinical safety).

**Integrity guardrail:** these are documented-principle lenses, not
impersonations. Never fabricate verbatim quotes attributed to a real or living
person. Scripture is cited as actual text.

**Protocol:** convene on a direction decision, a major fork, or signs of going
off the rails. State the decision → each relevant seat advises in its labeled
voice → flag agreements *and disagreements* (the disagreements carry the
information) → synthesized recommendation → return to the CEO. When purpose is
unclear, ask Abel rather than guessing. *The board advises; the CEO commands.*

## Repository map

```
app/
  page.tsx              Home (approved design)
  begin/                Intro + legal disclosure gate
  journey/              The 4-module guided path
  review/               Every question, editable — the living document
  profile/              AI synthesis + "Does this resonate?"
  support/              Crisis + safety resources. Always one click away
  api/synthesize/       The synthesis engine (server-side; key never client-side)
components/
  VoiceInput.tsx        Speak-to-type + distress screening — every answer field
  CarePrompt.tsx        The quiet, dismissible support card
  ValuesCardSort.tsx    Module 1, the crown jewel in action
  QuestionField.tsx     One question, any input kind
lib/
  method.ts             THE METHOD — all values, modules, questions, disclosures
  care.ts               Duty of care — screening + resources. Local-only
  store.ts              Local-first persistence (single seam to replace)
tests/
  care.test.mjs         The false-positive corpus. Most important test here
knowledge/              about-me, project-purpose, board-analysis
skills/                 One SKILL.md each (gotchas live here)
projects/               project.md = the container + dashboard
```

**Dependency truth:** Method → Engine → UX. Privacy and Legal wrap everything.

## Honest status

- ✅ Method encoded, all four modules, faith branch, card sort
- ✅ Voice input on every field; full editable-answers review
- ✅ Synthesis engine with empathy rule enforced in the system prompt
- ✅ Distress path in all three layers, with a regression suite (`npm test`)
- ⬜ Crisis resources are US/UK-centric beyond findahelpline.com; verify every
  number before launch and on a schedule — a dead crisis line is worse than none
- ⬜ Screening is English-only and pattern-based; it will miss indirect phrasing
- ⬜ No accounts, no payments, no server-side persistence
- ⬜ No match feature (Phase 2) and no privacy wall implementation yet
- ⬜ Not tested on a single stranger — which is the only thing that matters next
