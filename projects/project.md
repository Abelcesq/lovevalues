# Project — Love Values

The full project container lives in the CEO's source document. This file is the
working dashboard: what is true right now, and what is next.

## Phase

**Phase 0 → Phase 1.** Web MVP built. Not yet validated on a single stranger.

## Task streams

Dependency truth: **Method → Engine → UX.** Privacy and Legal wrap everything.
Growth/Marketing is deliberately last — marketing an unvalidated product just
buys faster proof it isn't ready.

| Stream | Status |
|---|---|
| Method & Content | ✅ All 4 modules, faith branch, card sort, peak/pit, eulogy — encoded in `lib/method.ts` |
| AI Synthesis Engine | ✅ Built. Empathy rule + mirror framing enforced server-side. Needs `ANTHROPIC_API_KEY` |
| Product / UX | ✅ Voice input on every field; full editable-responses review; living document |
| Data / Privacy / Security | ⬜ Local-first only. No accounts, no server persistence, no privacy wall implementation |
| Legal / Compliance | 🟡 Disclosure at gate + on every report. Distress path live in three layers. No consent records, no deletion SLA, no breach process |
| Growth / Marketing | ⬜ Not started, correctly |

## The one thing that matters next

**Get 10–25 real strangers through the full journey and see whether they reach
clarity worth paying for.** Everything else is a distraction until that answer
exists. Specifically, watch for:

1. Where do people abandon? (Suspicion: the Roots module, or card-sort fatigue
   at 32 cards.)
2. Does the synthesis land? Track the Yes / Partly / No resonance answer — it is
   already captured in the profile state and is the single most valuable metric
   this product has.
3. Do people use the microphone? If yes, does voice produce longer and more
   honest answers than typing? That is testable and would justify further
   investment in the voice path.

## Open CEO decisions

1. **Accounts and persistence — still open, and now the most consequential
   one.** Payment implies accounts, and accounts imply storing psyche-level
   answers on a server. Today they live only in the user's browser, which is
   the strongest privacy posture this product will ever have. Giving that up
   needs a decision, a security professional, and everything in
   `skills/legal-duty-of-care`. **Do not let a Stripe integration drag this in
   behind it.**
2. ~~**Hosting and payment processor.**~~ ✅ **Decided 2026-07-26 — Heroku, and
   the existing Stripe account.** Same account, but Love Values needs its own
   Products/Prices and its own webhook endpoint and secret. `Procfile` and
   `engines` are in the repo and a build/start cycle is verified.

   **Sequencing, which is the part that matters:** deploying needs no accounts
   and no database, so it can happen now and unblocks the stranger test.
   Payments should follow that test, not precede it — a paywall in front of an
   unvalidated method just buys faster proof it wasn't ready. Gotchas already
   paid for (the `www.` webhook trap above all) are in
   `skills/deploy-and-payments/SKILL.md`.
3. ~~**EZAITASK reference.**~~ ✅ Resolved from its handoff doc + a screenshot.
   Its voice gotcha #10 found a real shipped bug here. Details in
   `skills/voice-input/SKILL.md`.

   Its production source also supplied the voice recognition model this app
   now uses, and the Stripe/Heroku gotchas in
   `skills/deploy-and-payments/SKILL.md`.
4. **Open-source models — scoped down deliberately.** The brief proposed
   DeepSeek-R1 as a "thinking engine" and Qwen2.5-32B as a "workhorse", with
   jobs described as synthesising trend signals, reasoning about acceleration,
   and first-pass scoring of many trend items. **Those jobs are NowTrending's,
   not this app's** — Love Values makes exactly one AI call: one synthesis, on
   one person's answers, once. There is no high-volume classification here for
   a workhorse to do, so building one would have been dead code.

   What *was* built is the pattern NowTrending actually uses in
   `transfer/ai_grade.py`: a resilience lane. DeepSeek-R1 via OpenRouter
   retries a **failed** Anthropic call so the profile degrades instead of going
   dark — the outage class NowTrending hit on 2026-07-07. Claude stays primary,
   healthy calls are never re-routed, and a refusal never falls back (a refusal
   is a judgment, not an outage).

   **The cost of switching it on is a privacy change, not a code change.**
   Answers would reach OpenRouter and its upstream provider — a fourth party.
   `/privacy` now says so plainly, `data_collection: "deny"` excludes providers
   that train on prompts, and the profile marks any reflection written by the
   fallback. Weigh that before setting the key: for this data category, "our
   server" quietly meaning "a chain of companies" is exactly the kind of thing
   that costs trust when a user finds out later rather than upfront.
5. **Trademark search** on "Love Values" before heavy brand spend.
6. ~~**Distress-detection UI path.**~~ ✅ **Built.** Always-visible support link
   and `/support` page, local-only screening while writing, and an engine-side
   `careFlag`. Two things still need a human: **verify every crisis number
   before launch and re-verify on a schedule** (a dead line is worse than none,
   because it is trusted), and decide whether the US/UK-centric list is
   sufficient for your first users.
7. **32 cards may be too many** for a first pass. Worth testing a shorter list
   against completion rate.

## Board notes

- **Hormozi:** the offer is free-for-7-days then $29.99 once (the CEO shortened
  the trial from 30 days on 2026-07-27). Prove it before scaling anything. Do
  not spend on acquisition yet.
- **Munger (inversion):** how does this fail? Most likely — a stranger abandons
  in the Roots module because it went deeper than a free web app earned the
  right to go. Second most likely — a data incident with psyche-level content
  and no security posture. Both are addressable now and cheap to address now.
- **Duty-of-Care seat:** the distress path is now built, and the design
  constraint that mattered most was counter-intuitive — the screen had to be
  *quiet*. Module 2 asks people to describe their parents' marriage, and plenty
  of honest answers there describe one that failed. A screen firing on those
  would train every user to dismiss it, and it would then be dismissed the one
  time it mattered. Restraint is the safety feature. What remains human work:
  verifying the crisis numbers stay live.
