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
   Anyone in distress is routed to real human help — implemented in four
   layers: an always-visible "Talk to an external resource" link and `/support` page,
   **the pre-journey notice on `/begin`** (CEO-authored, canonical as
   `PRE_JOURNEY_CARE` in `lib/care.ts` — do not paraphrase it), local-only
   screening while writing (`lib/care.ts`), and a `careFlag` the synthesis
   engine must return. The pre-journey notice is the only one of the four that
   reaches someone *before* anything has gone wrong; the rest are reactive. Screening never leaves the browser; do not add
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
3. ~~**Home page**~~ ✅ **redesigned 2026-07-27, and the reason matters.** The
   first version was rejected: *"It looks similar to the abelcalderon.com home
   page and thedotx.com home page. All the 'claude' sites look the same."*
   Correct — all three were dark navy + gold + centred serif. Rebuilt on a white
   canvas with one electric-indigo accent, one geometric sans (Plus Jakarta,
   shared with NowTrendin for portfolio consistency), Tailwind v4 tokens and
   Lucide icons.

   The **format** changed as much as the palette. Per the CEO's second
   reference — vidaselect.com — the home page is a **long-form editorial
   article, not a panel page**: sticky table of contents, one prose column,
   sections that flow into each other, CTAs dropped inline between them.
   Cards survive inside the app, where they are correct. See
   `skills/design-system/SKILL.md`, which carries the palette contract and five
   gotchas including the Tailwind `svg { display: block }` trap.
4. **Values card sort (Module 1)** ✅ built — `components/ValuesCardSort.tsx`.
5. **Accounts & persistence** 🟡 **CEO decided the flow on 2026-07-27; the
   backend is still open.** The requested order is now
   **splash → sign up → plan + payment → the method**, with a 7-day trial
   (down from 30). Built: `/` splash, `/signup`, `/login`, `/checkout`, and
   `app/api/checkout/route.ts` (Stripe-hosted Checkout, inert without keys).

   **What is NOT yet true, and must not be described as if it were:**
   `lib/account.ts` writes to `localStorage`. It is not authentication, it
   gates nothing, and it does not sync between devices. Both `/signup` and
   `/privacy` say so on the page, in plain words, because someone is typing a
   password they probably reuse. Replacing that file is the whole job when the
   backend lands — nothing else calls storage directly.

   **The target architecture is now decided (CEO, 2026-07-27), and it is a
   good one — local-first is the design, not a placeholder:**

   > Answers and all written content stay on the user's own device,
   > permanently. The server exists for exactly two things: account
   > credentials, and running the AI synthesis / report generation.

   That keeps the strongest privacy posture this product will ever have while
   still allowing accounts and billing. `/api/synthesize` already works this
   way — answers are sent once, used, and discarded. What changes is that this
   becomes the *stated architecture* rather than a temporary state, so:

   - The server stores identity and subscription state. It must NOT store
     answers, and the schema should make that impossible rather than merely
     discouraged.
   - **Consequence that must be designed for, not discovered:** an account on a
     new phone finds no answers. Sign-in restores billing, not content. That
     needs an explicit, obvious path — an encrypted export the user carries, or
     an opt-in encrypted backup — because "I logged in and my profile was
     gone" is the failure mode that destroys trust fastest.
   - Losing or wiping the device loses everything. `/privacy` says so; the
     dashboard should surface Export prominently rather than hiding it.
   - Phase 2 match analysis needs *transient* traits from both sides. It still
     never gets childhood or past-relationship content — hard rule 8 — and
     local-first makes that wall easier to hold, not harder.

   Still needed: a server + database for **credentials and billing only**, real
   password hashing (argon2/bcrypt, not browser SHA-256), OAuth apps for Google
   and Meta (Instagram login runs through Meta now — one integration, not two,
   and it carries app review), the Stripe webhook, and a decision on what
   happens when a trial lapses mid-journey.

   **The sequencing risk is on the record.** `projects/project.md` and the
   Munger seat both hold that a paywall in front of an unvalidated method buys
   faster proof it wasn't ready. The CEO has weighed that and chosen this flow;
   the checkout page therefore falls through to a working trial when Stripe is
   unconfigured, so the stranger test is never blocked by a pay screen that
   cannot take payment.
6. **Open models** ✅ **added 2026-07-27 as a resilience lane only** —
   DeepSeek-R1 (MIT) via OpenRouter, retrying a *failed* Anthropic call so the
   profile degrades instead of going dark. Claude stays primary; healthy calls
   are never re-routed; a refusal never falls back. Inert until
   `OPENROUTER_API_KEY` is set. **Enabling it means user answers can reach a
   fourth party — `/privacy` discloses this and the UI marks any reflection
   written that way.** Qwen2.5 was proposed as a "workhorse" for high-volume
   classification; **this app has no such work** (one synthesis, one person, one
   call), so nothing was built for it. Revisit if Phase 2 match analysis creates
   real volume.
7. **Hosting + processor** ✅ **decided — Heroku, existing Stripe account.**
   Pricing: $9.99/mo (first 7 days waived — changed from 30 on 2026-07-27),
   $29.99 one-time profile,
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
  page.tsx              Splash — short pitch, one next step
  how-it-works/         The long-form editorial explanation (was the home page)
  signup/  login/       Step 1 — account (email or social)
  checkout/             Step 2 — plan + 7-day trial, Stripe-hosted payment
  begin/                Step 3 — intro, the pre-journey care notice, legal gate
  dashboard/            The hub — progress, report, details, billing, about
  journey/              The 4-module guided path
  review/               Every question, editable — the living document
  profile/              AI synthesis + "Does this resonate?"
  support/              Crisis + safety resources. Always one click away
  api/synthesize/       The synthesis engine (server-side; key never client-side)
  api/checkout/         Stripe Checkout session; 503s until keys are set
components/
  VoiceInput.tsx        Speak-to-type + distress screening — every answer field
  CarePrompt.tsx        The quiet, dismissible support card
  ValuesCardSort.tsx    Module 1, the crown jewel in action
  QuestionField.tsx     One question, any input kind
  Chrome.tsx            Nav + footer. "Talk to an external resource" survives every breakpoint
  Toc.tsx               The home page's sticky table of contents
  SplashCta.tsx         Entry fork — new / mid-signup / returning
  AskAi.tsx             "Ask an AI about us" — ported from thedotx.com
  SocialButtons.tsx     Google · Facebook · Instagram (rendered, not yet wired)
  Steps.tsx             Account → Plan → Begin progress rail
  ResumeNotice.tsx      The same fork, at the top of the /begin gate
lib/
  account.ts            Accounts — LOCAL ONLY. Not auth. Read its header first
  method.ts             THE METHOD — all values, modules, questions, disclosures
  care.ts               Duty of care — screening, resources, PRE_JOURNEY_CARE
  llm.ts                Resilience lane — open-model fallback. Inert by default
  store.ts              Local-first persistence (single seam to replace)
tests/
  care.test.mjs         The false-positive corpus. Most important test here
  llm.test.mjs          Fallback parsing — incl. stripping R1 reasoning traces
public/
  llms.txt              What an AI assistant reads. Keep it TRUE — the Ask-AI
                        buttons point assistants straight at it
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
- ✅ **Live at https://www.lovevalues.com** (2026-07-27). Heroku app `lovevalues`
  — NOT `lovevalues-app`, which is a leftover that receives no deploys and cost
  real time twice. HTTPS is forced in `middleware.ts` because the microphone
  fails silently without it
- ⬜ **The synthesis engine has still never produced a reflection for a real
  person.** The key is set and valid; nobody has pressed Generate yet. Until
  that happens the central claim of this product is unverified
- ⬜ Accounts are `localStorage` only; payments inert until Stripe keys are set
- ⬜ No match feature (Phase 2) and no privacy wall implementation yet
- ⬜ Not tested on a single stranger — which is the only thing that matters next
