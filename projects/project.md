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
| Legal / Compliance | 🟡 Disclosure at gate + on every report. No consent records, no deletion SLA, no breach process |
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
3. **EZAITASK reference.** `abelcesq/ezaitask` is attached to the session but
   empty (one commit, `.gitattributes` only). The voice-input and
   editable-responses UI was built from the described behavior, not the actual
   layout. Push the real code and this can be matched precisely.
4. **Trademark search** on "Love Values" before heavy brand spend.
5. **Distress-detection UI path.** Currently only a model-side instruction.
   A tool that surfaces childhood wounds carries responsibility; this should not
   ship to strangers without a real path.
6. **32 cards may be too many** for a first pass. Worth testing a shorter list
   against completion rate.

## Board notes

- **Hormozi:** the offer is free-for-30-days then $29.99 once. Prove it before
  scaling anything. Do not spend on acquisition yet.
- **Munger (inversion):** how does this fail? Most likely — a stranger abandons
  in the Roots module because it went deeper than a free web app earned the
  right to go. Second most likely — a data incident with psyche-level content
  and no security posture. Both are addressable now and cheap to address now.
- **Duty-of-Care seat:** the gap between "we say we're not therapy" and "we
  behave like we're not therapy" is the distress path. It is the only open item
  on this list that could actually hurt someone.
