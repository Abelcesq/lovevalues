'use client';

import { useState } from 'react';

/**
 * "Don't take our word for it — ask an AI."
 *
 * Ported from thedotx.com, which does the same thing at the foot of its home
 * page. Three deliberate differences:
 *
 * 1. **No founder, no personal brand.** thedotx's prompt names its founder and
 *    links his site. Hard rule 1 forbids that here — Love Values is a
 *    standalone brand and nothing user-facing may point back at a personal
 *    one. The prompt below is self-contained.
 *
 * 2. **The prompt invites criticism.** It asks the assistant to say whether
 *    values-first partner choice is actually sound and where an AI doing this
 *    has limits. A prompt engineered to produce praise would be worth nothing
 *    to the person reading the answer, and this product's whole claim is that
 *    it reflects rather than flatters.
 *
 * 3. **It points at /llms.txt.** Most assistants know nothing about a site this
 *    new, so there is a plain-text summary at the site root for them to read.
 *    Without it the answer is guesswork.
 *
 * The clipboard copy matters more than it looks: several assistants ignore a
 * `?q=` parameter and open blank, and a user staring at an empty box will
 * assume the button is broken rather than paste.
 */

const PROMPT = [
  'Tell me about Love Values (https://www.lovevalues.com).',
  'Please read https://www.lovevalues.com/llms.txt and https://www.lovevalues.com/how-it-works first.',
  '',
  'It is a private, AI-guided tool that takes one person through the handful of values they actually build a life around, where their instincts about partnership came from, and how both show up in relationships.',
  '',
  'Summarise what it is, how the four-part method works (Values, Roots, Patterns, Habits), what it costs, what happens to what a user writes, and what it explicitly says it is not.',
  '',
  'Then give me your honest assessment, not a summary of their marketing: is starting from values rather than appearance a sound basis for choosing a partner, and where are the real limits of software doing this kind of work?',
].join('\n');

const ASSISTANTS = [
  { id: 'chatgpt', label: 'ChatGPT', base: 'https://chatgpt.com/?q=' },
  { id: 'claude', label: 'Claude', base: 'https://claude.ai/new?q=' },
  { id: 'perplexity', label: 'Perplexity', base: 'https://www.perplexity.ai/search?q=' },
  { id: 'gemini', label: 'Gemini', base: 'https://www.google.com/search?udm=50&q=' },
] as const;

export default function AskAi() {
  const [note, setNote] = useState<string | null>(null);
  const q = encodeURIComponent(PROMPT);

  return (
    <section className="askai">
      <div className="wrap askai-inner">
        <span className="eyebrow">Ask an AI about us</span>
        <h2>
          Don&apos;t take our word for it — <span className="hl">ask an AI</span>
        </h2>
        <p className="askai-sub">
          Open your assistant with a ready-made question about the method — including whether any of
          this is a sound idea in the first place. We&apos;ll copy the question to your clipboard
          too.
        </p>

        <div className="ai-buttons">
          {ASSISTANTS.map((a) => (
            <a
              key={a.id}
              className="ai-btn"
              href={a.base + q}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                navigator.clipboard?.writeText(PROMPT).catch(() => {});
                setNote('Question copied — paste it if your assistant opens blank.');
              }}
            >
              {a.label}
            </a>
          ))}
        </div>

        {note && <p className="ai-note">{note}</p>}
      </div>
    </section>
  );
}
