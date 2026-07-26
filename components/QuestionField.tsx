'use client';

import type { Question } from '@/lib/method';
import VoiceInput from './VoiceInput';

type Props = {
  question: Question;
  value: string;
  onChange: (next: string) => void;
};

/**
 * Renders one question. Every free-text field gets the microphone —
 * that is the point of the pattern, not a feature on some screens.
 */
export default function QuestionField({ question, value, onChange }: Props) {
  const labelId = `q-${question.id}`;

  return (
    <div className="q-block">
      {question.optional && <span className="q-optional">Optional</span>}
      <p className="q-prompt" id={labelId}>
        {question.prompt}
      </p>
      {question.helper && <p className="q-helper">{question.helper}</p>}

      {question.kind === 'yes-no' && (
        <div className="yesno" role="group" aria-labelledby={labelId}>
          {['yes', 'no'].map((opt) => (
            <button
              key={opt}
              type="button"
              className={value === opt ? 'sel' : ''}
              aria-pressed={value === opt}
              onClick={() => onChange(opt)}
            >
              {opt === 'yes' ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      )}

      {question.kind === 'scale-1-10' && (
        <div className="scale" role="group" aria-labelledby={labelId}>
          {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
            <button
              key={n}
              type="button"
              className={value === n ? 'sel' : ''}
              aria-pressed={value === n}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {(question.kind === 'long-text' || question.kind === 'short-text') && (
        <VoiceInput
          id={`input-${question.id}`}
          ariaLabelledBy={labelId}
          value={value}
          rows={question.kind === 'short-text' ? 2 : 6}
          placeholder={question.placeholder}
          onChange={onChange}
        />
      )}
    </div>
  );
}
