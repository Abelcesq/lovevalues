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
   anything touching childhood — is delivered in a loving, empathetic tone. The
   method gently reflects and asks whether it resonates. It never diagnoses,
   judges, or declares. This is enforced in `app/api/synthesize/route.ts`.
3. **Mirror, never verdict.** Every output carries the framing: *this is not a
   final analysis; if the information changes, the analysis can change.* Then it
   asks: does this resonate? (Yes / Partly / No — and tell us what to correct.)
4. **Not therapy.** The product is not, and must never present as, therapy.
   Anyone in distress is routed to real human help.
5. **Legal disclosure** appears at signup and on every report. Canonical text
   lives in `lib/method.ts` as `LEGAL_DISCLOSURE` — do not paraphrase it.
6. **Faith posture.** Open to all faiths and to the non-religious. Faith is
   honored deeply for those who hold it, never imposed on those who don't.
7. **Privacy wall (Phase 2, match feature).** The compatibility engine receives
   only general personality/characteristic traits. It must never access or
   disclose either person's childhood details or past-relationship content.
   This must be enforced at the data layer, not merely promised.

## Open CEO decisions

1. ~~Confirm the name~~ ✅ **Love Values / lovevalues.com (secured).**
   Trademark search still recommended before heavy brand spend.
2. **EZAITASK reference** — `abelcesq/ezaitask` is now attached to the session
   but the repository is **empty** (one commit, `.gitattributes` only). The
   voice-input and editable-responses UI in this app is built from the described
   behavior, not the actual EZAITASK layout. Revisit `components/VoiceInput.tsx`
   and `app/review/page.tsx` once the real code is pushed.
3. **Home page** ✅ built and approved; now ported to `app/page.tsx`.
4. **Values card sort (Module 1)** ✅ built — `components/ValuesCardSort.tsx`.
5. **Open — accounts & persistence.** The MVP is deliberately local-first
   (browser `localStorage`). No account system, no server-side storage of a
   user's answers. This needs a CEO decision before Phase 1 payment testing,
   because payment implies accounts.
6. **Open — payment.** $9.99/mo (30 days waived), $29.99 one-time profile,
   $9.99/user match analysis. No processor integrated yet.

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
  api/synthesize/       The synthesis engine (server-side; key never client-side)
components/
  VoiceInput.tsx        Speak-to-type — on every answer field
  ValuesCardSort.tsx    Module 1, the crown jewel in action
  QuestionField.tsx     One question, any input kind
lib/
  method.ts             THE METHOD — all values, modules, questions, disclosures
  store.ts              Local-first persistence (single seam to replace)
knowledge/              about-me, project-purpose, board-analysis
skills/                 One SKILL.md each (gotchas live here)
projects/               project.md = the container + dashboard
```

**Dependency truth:** Method → Engine → UX. Privacy and Legal wrap everything.

## Honest status

- ✅ Method encoded, all four modules, faith branch, card sort
- ✅ Voice input on every field; full editable-answers review
- ✅ Synthesis engine with empathy rule enforced in the system prompt
- ⬜ No accounts, no payments, no server-side persistence
- ⬜ No match feature (Phase 2) and no privacy wall implementation yet
- ⬜ Not tested on a single stranger — which is the only thing that matters next
