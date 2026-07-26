'use client';

/**
 * VoiceInput — speak-to-type on every answer field.
 *
 * Every field where a user must input information offers a microphone
 * alongside the keyboard, so they can speak instead of type. Speech is
 * transcribed into the same textarea the user can then edit by hand — voice is
 * an input method, never a separate channel, so nothing is lost if dictation
 * misfires.
 *
 * Uses the Web Speech API, which runs in the browser. No audio is uploaded. If
 * the browser lacks it (Firefox), the mic is hidden entirely and the field
 * degrades to a plain textarea — no error, no nag.
 *
 * ── THE RESULT-BASELINE MODEL ─────────────────────────────────────────────
 * The naive implementation of this component reads `event.resultIndex` and
 * appends the new finals to what it already has. That works on desktop Chrome
 * and is wrong everywhere else, because the `results` array is not the
 * append-only log it appears to be:
 *
 *   - Engines re-fire results that were already final, and reset `resultIndex`
 *     to 0 when they do — so an appending reader double-counts and the user
 *     watches their sentence duplicate itself.
 *   - iOS Safari silently restarts recognition mid-session (most often in
 *     standalone PWA mode), which SHRINKS the array. A cursor held past the
 *     new end then matches nothing, and the field simply stops updating while
 *     the user keeps talking.
 *
 * So: hold a `resultBaseline` index, ignore everything before it, and RECOMPUTE
 * the transcript from scratch on every event rather than accumulating. Re-fires
 * and array mutations then self-correct. Committing (the user typed, or moved
 * on) means folding the current text into the base and bumping the baseline to
 * the array's current length — a clean slate with zero audio lost, which
 * calling stop()/start() would not give us.
 *
 * This model, and the three iOS quirks it defends against, are lifted from
 * EZAITASK's production implementation (see skills/voice-input/SKILL.md).
 * They were learned there against real devices, not derived here.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { screenForDistress, type CareLevel } from '@/lib/care';
import { joinSpoken, preferredLang } from '@/lib/speech';
import CarePrompt from './CarePrompt';

type Props = {
  id: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  /** Accessible label — points at the visible question text. */
  ariaLabelledBy?: string;
};

/* The Web Speech API is not in the TS DOM lib in a stable form. */
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function VoiceInput({
  id,
  value,
  onChange,
  placeholder,
  rows = 6,
  ariaLabelledBy,
}: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  /* Duty of care. Screening is local-only and never leaves the browser. */
  const [care, setCare] = useState<CareLevel>('none');
  const [careDismissed, setCareDismissed] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  /** Committed text — everything dictated finals are appended to. */
  const baseTextRef = useRef('');
  /** Ignore results before this index; see the result-baseline model above. */
  const resultBaselineRef = useRef(0);
  /** Largest results.length seen, used to detect an engine restart. */
  const lastResultsLengthRef = useRef(0);
  /** The last value we emitted, to tell our writes from everyone else's. */
  const lastEmittedRef = useRef(value);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  /* Commit whenever the value changes from anywhere other than dictation —
     the user typing a correction mid-sentence, the field being reset, moving
     between questions. Folding it into the base and bumping the baseline means
     the next spoken phrase extends what is actually there instead of
     resurrecting a stale snapshot over the top of it. Without this the mic,
     which in continuous mode routinely stays live across exactly those
     moments, silently wipes the typed edit. */
  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      baseTextRef.current = value;
      lastEmittedRef.current = value;
      resultBaselineRef.current = lastResultsLengthRef.current;
    }
  }, [value]);

  /* Screen after the user pauses, never mid-word — a card that appears while
     someone is still typing a sentence reads as being watched. Escalation is
     allowed after a dismissal (gentle → urgent); a dismissed level never
     returns. */
  useEffect(() => {
    const timer = setTimeout(() => {
      const level = screenForDistress(value);
      setCare((previous) => {
        if (level !== previous && level !== 'none') setCareDismissed(false);
        return level;
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [value]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    setError(null);
    baseTextRef.current = value;
    lastEmittedRef.current = value;
    /* Fresh session — some browsers reuse the object across sessions, so do
       not rely on the engine to reset these for us. */
    resultBaselineRef.current = 0;
    lastResultsLengthRef.current = 0;

    const recognition = new Ctor();
    /* Continuous: the browser keeps listening through pauses and the user ends
       it by tapping the mic again. These answers have thinking pauses in them;
       auto-ending on silence would cut people off mid-thought. */
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = preferredLang(typeof navigator !== 'undefined' ? navigator.language : '');

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      /* The array shrank, so the engine restarted itself and our baseline now
         points past the end. Without this reset every new utterance is skipped
         and the field never updates again. */
      if (event.results.length < lastResultsLengthRef.current) {
        resultBaselineRef.current = 0;
      }
      lastResultsLengthRef.current = event.results.length;

      /* Recompute from the baseline. `event.resultIndex` is deliberately
         ignored — engines reset it to 0 after a restart and re-fire finals. */
      let finalAcc = '';
      let interimAcc = '';
      for (let i = resultBaselineRef.current; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const transcript = (result[0] && result[0].transcript) || '';
        if (result.isFinal) finalAcc = joinSpoken(finalAcc, transcript);
        else interimAcc = joinSpoken(interimAcc, transcript);
      }

      /* Collapse accidental double spaces but never trim — a trailing space
         the user dictated is theirs to keep. */
      const next = joinSpoken(baseTextRef.current, finalAcc).replace(/[ \t]{2,}/g, ' ');
      if (next !== lastEmittedRef.current) {
        lastEmittedRef.current = next;
        onChange(next);
      }
      setInterim(interimAcc);
    };

    recognition.onerror = (event: any) => {
      /* "aborted" fires on a normal user-initiated stop. */
      if (event?.error === 'aborted') return;
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        setError('Microphone access is blocked. You can allow it in your browser settings — or just type.');
      } else if (event?.error === 'no-speech') {
        setError('We didn’t catch anything. Try again, or type instead.');
      } else {
        setError('Dictation stopped unexpectedly. Your typed text is safe.');
      }
      setListening(false);
      setInterim('');
    };

    recognition.onend = () => {
      setListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      /* Throws if start() is called twice in quick succession. */
      setError('Dictation could not start. You can type instead.');
      setListening(false);
    }
  }, [onChange, value]);

  /* Never leave the mic hot on unmount. */
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const toggle = () => (listening ? stop() : start());

  /* Advertise the mic in the placeholder rather than relying on the icon
     alone — from EZAITASK ("Add a task — type or tap the mic…"), where it is
     what actually makes voice discoverable. Only when speech is available, so
     unsupported browsers are never told about a control they do not have. */
  const shownPlaceholder = listening
    ? 'Listening — tap the mic when you’re done…'
    : supported && placeholder
      ? `${placeholder} or tap the mic to speak.`
      : placeholder;

  return (
    <div className={`vi ${listening ? 'vi-live' : ''}`}>
      <textarea
        ref={textareaRef}
        id={id}
        className="vi-field"
        value={value}
        rows={rows}
        placeholder={shownPlaceholder}
        aria-labelledby={ariaLabelledBy}
        onChange={(e) => onChange(e.target.value)}
      />

      {interim && (
        <p className="vi-interim" aria-live="polite">
          {interim}
        </p>
      )}

      <div className="vi-bar">
        {supported ? (
          <button
            type="button"
            className={`vi-mic ${listening ? 'on' : ''}`}
            onClick={toggle}
            aria-pressed={listening}
            aria-label={listening ? 'Stop speaking' : 'Speak your answer'}
            title={listening ? 'Listening… tap to stop' : 'Speak your answer'}
          >
            <MicIcon />
            <span>{listening ? 'Listening — tap to stop' : 'Speak your answer'}</span>
          </button>
        ) : (
          <span className="vi-note">Typing only in this browser.</span>
        )}

        <span className="vi-count">{value.trim() ? `${wordCount(value)} words` : ''}</span>
      </div>

      {error && <p className="vi-error">{error}</p>}

      {care !== 'none' && !careDismissed && (
        <CarePrompt level={care} onDismiss={() => setCareDismissed(true)} />
      )}
    </div>
  );
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
