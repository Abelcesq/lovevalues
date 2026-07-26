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

## What EZAITASK confirmed — CEO decision #2, resolved

EZAITASK's handoff doc and a screenshot of the live app were reviewed
2026-07-26. Confirmed: Web Speech API, **continuous mode**, mic present on both
the task bar and the chat input, always visible rather than revealed on hover
or focus.

**Adopted here:**

- **The placeholder advertises the mic** — EZAITASK's field reads *"Add a task
  — type or tap the mic…"*. This, not the icon, is what makes voice
  discoverable; an icon alone reads as decoration. Appended automatically in
  `VoiceInput`, and only when speech is actually supported.
- **Gotcha #10** (see hard gotcha 3) — found a real shipped bug here.

**Deliberately not adopted:**

- **The bare circular icon button.** EZAITASK's field is a one-line task entry,
  where a compact adjacent icon is right. Love Values' fields are multi-line
  reflections, and the control sits in a bar beneath the textarea — where a
  labelled button ("Speak your answer") beats a bare glyph for someone
  answering a hard question for the first time. Same pattern, different
  ergonomics.
- **The light cream/peach theme.** Different brand entirely; Love Values is the
  approved dark palette.

Still unknown: the exact inline JS. The repository (`abelcesq/ezaitask`) still
contains only `.gitattributes`. If the source is ever pushed, the file to read
is `todos/templates/todos/list.html`.
