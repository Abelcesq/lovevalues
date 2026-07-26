# Love Values

A faith-inclusive, values-first AI relationship confidant. **lovevalues.com**

Almost every dating app starts with a face. This one starts with what you value.

## Run it

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
npm test                     # duty-of-care screening suite
```

### Testing on a phone

```bash
npm run dev:phone
```

Then open the **Network** URL it prints (e.g. `https://192.168.1.42:3000`) on a
phone on the same Wi-Fi, and accept the certificate warning once.

Use this rather than plain `npm run dev` whenever you are testing on a device:
**the Web Speech API requires a secure context**, so the microphone silently
does not appear over `http://` on anything other than `localhost`. Voice would
look broken on the phone for a reason that has nothing to do with the code.

The app works without an API key — you can walk the entire four-module journey.
Only the AI synthesis needs one, and it fails with a clear message rather than
breaking.

## The flow

```
/            Home
/begin       Intro + legal disclosure gate
/journey     The four modules — Values → Roots → Patterns → Habits
/review      Every question, editable at any time (the living document)
/profile     The synthesis, then: "Does this resonate?"
/support     Crisis and safety resources — reachable from every page
```

## Two things to know before changing anything

**1. The method lives in one file.** `lib/method.ts` holds every value card,
question, module, and disclosure. Change the method there, not in components.

**2. There are hard rules, and they are enforced in code — not just documented.**

- **Empathy.** All feedback, especially anything touching family history, is
  delivered in a loving, empathetic tone. Enforced in the system prompt in
  `app/api/synthesize/route.ts`.
- **Mirror, never verdict.** Every output carries `MIRROR_FRAMING`, appended by
  our code so it cannot be paraphrased away, then asks whether it resonates.
  No scores, no grades, no compatibility percentages.
- **Not therapy.** `LEGAL_DISCLOSURE` appears at the gate and on every report.
  Import it; never retype or soften it. The distress path (`lib/care.ts`,
  `/support`) routes people to real human help — screening is local-only and
  must stay that way.
- **Roots is about the parents' partnership, not the user's trauma.** Module 2
  asks what happened *between* the two adults who raised the user. It is not an
  abuse inventory and must never be worded or analyzed as one.

Read `CLAUDE.md` for the full ruleset and `skills/*/SKILL.md` for the gotchas —
particularly `skills/empathy-voice` and `skills/mirror-discipline`.

## Voice input

Every answer field has a microphone (`components/VoiceInput.tsx`). This is a
required feature, not an enhancement: these questions are answered better out
loud, and since the mirror is only as true as the input, voice is load-bearing
on product quality.

Transcription runs in the browser via the Web Speech API — no audio is uploaded
anywhere. Unsupported browsers (Firefox) hide the mic entirely and degrade to a
plain textarea with no error and no nag. See `skills/voice-input/SKILL.md`.

## Where the data lives

In the user's own browser (`localStorage`). Answers leave the device only when
the user explicitly generates a profile — used once, never written to our disk.
`lib/store.ts` is the single seam to replace when real persistence lands.

## Honest status

- ✅ Method encoded; all four modules, faith branch, card sort
- ✅ Voice input on every field; full editable-answers review; export and delete
- ✅ Synthesis engine with the empathy rule enforced server-side
- ⬜ No accounts, no payments, no server-side persistence
- ⬜ No match feature (Phase 2), no privacy wall implementation
- ✅ Distress path in three layers, with a regression suite
- ⬜ Crisis numbers are US/UK-centric and need verifying before launch
- ⬜ **Not tested on a single stranger**, which is the only thing that matters next

## Stack

Next.js 15 (App Router) · TypeScript · plain CSS · `@anthropic-ai/sdk`
(`claude-opus-5`). Native mobile via Expo / React Native is Phase 2.
