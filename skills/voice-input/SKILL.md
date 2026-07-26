# SKILL — Voice Input

**Purpose.** Every field where a user must input information offers a
microphone alongside the keyboard, so they can speak instead of type. This is a
required product feature, not an enhancement.

## Why it matters more here than in most products

The questions in this method are the kind people answer better out loud. Typing
invites editing yourself into a version you'd rather be; speaking tends to
produce the truer answer. Since the mirror is only as true as the input, voice
is directly load-bearing on product quality — not just convenience.

## Success criteria

A user can complete the entire journey without touching the keyboard, and can
also complete it without ever touching the microphone. Neither path is degraded.

## Hard gotchas

1. **Voice is an input method, never a separate channel.** Speech transcribes
   into the same textarea the user can then edit by hand. Never store a "voice
   answer" distinct from a typed one.
2. **Degrade silently.** If the browser lacks the Speech API, hide the mic
   entirely. No error, no nag, no "upgrade your browser." Firefox users must not
   feel punished.
3. **Never lose typed text.** Dictation appends to what is already there — it
   captures the field's value at start and appends finals to that snapshot.
   Overwriting a user's typed paragraph with a transcript is unforgivable here.
   **The snapshot must be re-synced whenever the value changes from anywhere
   other than dictation itself** — the user typing a correction mid-sentence,
   the field being reset, moving between questions. Otherwise the capture
   outlives the text it captured and the next spoken phrase silently wipes the
   typed edit. In continuous mode the mic routinely stays live across exactly
   those moments, so this is the common path, not a corner case.

   *This one is borrowed knowledge.* EZAITASK hit it and wrote it down as its
   gotcha #10 — "the chat panel mic was repopulating old transcripts after Add,
   because the Web Speech API `finalText` closure variable persists across form
   submits in continuous mode." Same root cause, different framework. Love
   Values shipped with the bug and it was found by reading that note, not by
   testing. Assume any new voice surface has it until proven otherwise.
4. **Never leave the mic hot.** Abort recognition on unmount. A relationship
   confidant that keeps listening after you navigate away is the single worst
   trust failure this product could have.
5. **Show interim results.** Users need to see it working; a silent mic feels
   broken. Interim text renders separately, in italic muted type, and is never
   committed to the field.
6. **Permission denial is not an error state.** Say plainly that the mic is
   blocked and that typing works fine. No red banner, no modal.
7. **`aborted` is not an error.** It fires on normal user-initiated stop — never
   surface it.

## Implementation notes

`components/VoiceInput.tsx`, built on the Web Speech API
(`SpeechRecognition` / `webkitSpeechRecognition`), which runs in-browser. No
audio is uploaded anywhere by us. Supported in Chrome, Edge, and Safari; not in
Firefox, where the field degrades to a plain textarea.

**If audio ever moves server-side** (e.g. for accuracy or Firefox support), that
is a *material* privacy change: raw voice recordings of someone describing their
childhood is a far more sensitive data category than the transcript. It requires
its own CEO decision and its own disclosure — do not treat it as an
implementation detail.

## What EZAITASK taught — CEO decision #2, closed

The live page source was reviewed 2026-07-26. Its `setupVoiceInput` is the
reference implementation for this component, and reading it changed the code
here materially. **Four device-level lessons were adopted, all of which this
app had wrong**, and all of which fail silently and only on a phone:

1. **`event.resultIndex` is untrustworthy — recompute, never accumulate.**
   Engines re-fire results that were already final and reset `resultIndex` to
   0 when they do. An appending reader double-counts and the user watches
   their sentence duplicate itself. Hold a `resultBaseline`, ignore everything
   before it, and rebuild the transcript from scratch on every event so
   re-fires self-correct.
2. **iOS Safari restarts recognition mid-session** — most often in standalone
   PWA mode — which *shrinks* the `results` array. A baseline held past the new
   end matches nothing and the field stops updating while the user keeps
   talking. Detect it (`results.length` shrank) and reset the baseline to 0.
3. **iOS returns transcripts with no leading whitespace.** "hello" then "milk"
   becomes `hellomilk`. Desktop Chrome supplies the space itself, which is
   exactly why naive concatenation looks correct until someone opens it on an
   iPhone. See `joinSpoken` in `lib/speech.ts`.
4. **`navigator.language` often returns a bare `"en"`**, and engines — iOS
   especially — recognize considerably better given a full locale tag. Upgrade
   anything shorter. See `preferredLang` in `lib/speech.ts`.

Also adopted: `maxAlternatives = 1`; treating `service-not-allowed` as a
permission failure alongside `not-allowed`; swapping the placeholder to
"Listening…" while recording; and **the placeholder advertising the mic**
("Add a task — type or tap the mic…"), which is what actually makes voice
discoverable — an icon alone reads as decoration.

Lessons 3 and 4 are pure functions in `lib/speech.ts` with tests in
`tests/speech.test.mjs`, deliberately, so they cannot silently regress.

**Committing without stopping.** On commit, EZAITASK bumps the baseline to the
current `results.length` rather than calling `stop()`/`start()` — same clean
slate, but no audio lost in the restart gap. This component does the same when
the value changes from outside dictation.

**Deliberately not adopted:**

- **`autoSubmit` on `onend`.** Right for a one-line task entry; wrong here,
  where an answer is a paragraph and silence usually means thinking.
- **Interim text written into the field.** EZAITASK renders interim inline;
  this component shows it beneath instead, so a long reflection is not churned
  under the user's cursor while they read it back.
- **The bare circular icon button.** Its field is one-line; ours is
  multi-line, where a labelled control beats a bare glyph for someone
  answering a hard question for the first time.
- **The cream/peach theme.** Different brand.
