/**
 * Formatting helpers for the generated reflection.
 *
 * Lives outside the page because Next.js only permits a fixed set of exports
 * from a route file — and because this is the kind of string handling that
 * should be tested directly rather than through a browser.
 */

/**
 * Pull a leading "Short label: explanation" off a paragraph so the label can be
 * set in bold.
 *
 * WHY THIS EXISTS. The CEO read a reflection that opened "Here is the gap, and
 * it's the most useful thing in this document" and could not tell what a "gap"
 * was — the term was used three times before it was ever explained. The engine
 * now writes each point with a plain-language handle in front of it ("Going
 * quiet when you are hurt: …"), and this is what turns that into something the
 * eye can find on a second read.
 *
 * DELIBERATELY CONSERVATIVE. It runs over model output, and a wrong match would
 * embolden a fragment mid-sentence, which looks like a bug. Every guard below
 * exists to make a false positive unlikely; when anything is uncertain it
 * returns null and the paragraph renders as ordinary prose. The worst case is
 * no bolding, never mangled text.
 *
 * NOT A MARKDOWN PARSER, and it should not become one. Asking the model for
 * asterisks would put literal asterisks on screen the moment it obliged.
 */
/**
 * Words that begin a sentence, not a heading.
 *
 * This is the guard that does the most work. A label is a descriptive phrase —
 * "Going quiet when you are hurt", "Providing, then resenting" — whereas a
 * colon in ordinary prose is nearly always preceded by a clause with a subject:
 * "You wrote something that stayed with us:", "She said:". Rejecting anything
 * that opens with a subject pronoun or a connective separates the two cheaply
 * and without trying to parse grammar.
 *
 * "Your" is deliberately absent — "Your work as an escape:" is a fair label.
 */
const SENTENCE_OPENERS = new Set([
  "i",
  "you",
  "we",
  "he",
  "she",
  "they",
  "it",
  "there",
  "here",
  "this",
  "that",
  "these",
  "those",
  "and",
  "but",
  "so",
  "then",
  "yet",
  "because",
  "if",
  "when",
  "what",
  "why",
  "how",
]);

export function splitLabel(
  paragraph: string,
): { label: string; rest: string } | null {
  const colon = paragraph.indexOf(":");
  /* Too early to be a phrase, or too long to be a heading. The ceiling is
     generous because a label often names several qualities at once — "Hard
     working, determined, and able to carry a hard thing to completion:" is one
     label, not a sentence. The sentence-opener guard below, not length, is what
     keeps prose out. */
  if (colon < 3 || colon > 90) return null;

  const label = paragraph.slice(0, colon).trim();

  /* A colon after a completed clause or a quotation is not a label. */
  if (/[.!?;"'”’]/.test(label)) return null;

  const words = label.split(/\s+/);

  /* Labels are phrases, not sentences. */
  if (words.length > 12) return null;

  /* The decisive test: does this read as the start of a sentence? */
  if (SENTENCE_OPENERS.has(words[0].toLowerCase().replace(/[^a-z]/g, ""))) {
    return null;
  }

  /* A colon with nothing meaningful after it was not a label either. */
  const rest = paragraph.slice(colon + 1);
  if (rest.trim().length < 20) return null;

  return { label: `${label}:`, rest };
}
