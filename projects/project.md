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

1. **Accounts and persistence.** Payment implies accounts, and accounts imply
   storing this data category on a server. Needs a decision — and a security
   professional — before a single real user pays.
2. **Payment processor.** Nothing integrated.
3. ~~**EZAITASK reference.**~~ ✅ Resolved from its handoff doc + a screenshot.
   Its voice gotcha #10 found a real shipped bug here. Details in
   `skills/voice-input/SKILL.md`.

   **Worth a real decision: EZAITASK is a live Django/Heroku app with working
   Stripe billing, and Love Values is Next.js on nothing yet.** That is a
   genuine fork, not a detail. Building Phase 1 payments on the stack Abel
   already operates — and has already debugged in production — is a materially
   cheaper path than standing up a second stack he has never run. Against
   that: this app is already built and working in Next.js. The question to
   answer before payment work starts is which stack the CEO wants to be
   operating in a year, not which one is faster this month.
4. **Trademark search** on "Love Values" before heavy brand spend.
5. ~~**Distress-detection UI path.**~~ ✅ **Built.** Always-visible support link
   and `/support` page, local-only screening while writing, and an engine-side
   `careFlag`. Two things still need a human: **verify every crisis number
   before launch and re-verify on a schedule** (a dead line is worse than none,
   because it is trusted), and decide whether the US/UK-centric list is
   sufficient for your first users.
6. **32 cards may be too many** for a first pass. Worth testing a shorter list
   against completion rate.

## Board notes

- **Hormozi:** the offer is free-for-30-days then $29.99 once. Prove it before
  scaling anything. Do not spend on acquisition yet.
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
