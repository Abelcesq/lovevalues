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

## Open item — CEO decision #2

The EZAITASK repository (`abelcesq/ezaitask`) is attached to the session but is
empty — one commit containing only `.gitattributes`. This component was
therefore built from the described behavior, not the actual EZAITASK layout.
Revisit spacing, iconography, and control placement once the real code is
pushed.
