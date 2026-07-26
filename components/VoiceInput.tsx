'use client';

/**
 * VoiceInput — speak-to-type on every answer field.
 *
 * Modeled on the founder's EZAITASK pattern: every field where a user must
 * input information offers a microphone alongside the keyboard, so they can
 * speak instead of type. Speech is transcribed into the same textarea the
 * user can then edit by hand — voice is an input method, never a separate
 * channel, so nothing is lost if dictation misfires.
 *
 * Uses the Web Speech API (SpeechRecognition), which runs in the browser.
 * If the browser does not support it, the mic is hidden entirely and the
 * field degrades to a plain textarea — no error, no nag.
 *
 * NOTE (CEO decision #2): pending access to the EZAITASK repo, this matches
 * the described behavior rather than the exact visual layout. Once the repo
 * is available, revisit spacing/iconography to match precisely.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { screenForDistress, type CareLevel } from '@/lib/care';
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
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
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
  /** Text as it stood when dictation began — new speech is appended to this. */
  const baseTextRef = useRef('');
  /** The last value this component itself emitted, used to tell our own writes
      apart from everyone else's. */
  const lastEmittedRef = useRef(value);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  /* Re-sync the dictation base whenever the value changes from anywhere other
     than dictation itself — the user typing a correction mid-sentence, the
     field being reset, navigating to another question.
       Without this, the snapshot taken at start() goes stale and the next
     spoken phrase is appended to text that is no longer there, silently
     wiping whatever the user typed. In continuous mode the mic often stays
     live across exactly those moments, so this is the common path, not a
     corner case.
       This is the bug EZAITASK hit and documented as gotcha #10 ("the chat
     panel mic was repopulating old transcripts after Add") — same root cause,
     a capture that outlives the text it captured. */
  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      baseTextRef.current = value;
      lastEmittedRef.current = value;
    }
  }, [value]);

  /* Screen after the user pauses, never mid-word — a card that appears while
     someone is still typing a sentence reads as being watched. Escalation is
     allowed after a dismissal (gentle → urgent), but a dismissed level never
     comes back. */
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

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang =
      typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';

    recognition.onresult = (event: any) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += transcript;
        else interimChunk += transcript;
      }

      if (finalChunk) {
        const base = baseTextRef.current;
        const needsSpace = base.length > 0 && !/\s$/.test(base);
        baseTextRef.current = base + (needsSpace ? ' ' : '') + finalChunk.trim();
        /* Record it as ours before emitting, so the re-sync effect above does
           not mistake our own write for an outside edit. */
        lastEmittedRef.current = baseTextRef.current;
        onChange(baseTextRef.current);
      }
      setInterim(interimChunk);
    };

    recognition.onerror = (event: any) => {
      // "aborted" fires on a normal user-initiated stop — not worth surfacing.
      if (event?.error === 'aborted') return;
      if (event?.error === 'not-allowed') {
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

  return (
    <div className={`vi ${listening ? 'vi-live' : ''}`}>
      <textarea
        ref={textareaRef}
        id={id}
        className="vi-field"
        value={value}
        rows={rows}
        /* Advertise the mic in the placeholder rather than relying on the icon
           alone — lifted from EZAITASK ("Add a task — type or tap the mic…"),
           where it is the thing that actually makes voice discoverable. Only
           when speech is available, so unsupported browsers are never told
           about a control they do not have. */
        placeholder={
          supported && placeholder ? `${placeholder} or tap the mic to speak.` : placeholder
        }
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
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
