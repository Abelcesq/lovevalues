/**
 * Speech-recognition helpers.
 *
 * These two functions look trivial and are not. Each encodes a device-level
 * quirk that was learned the expensive way in EZAITASK's production app, and
 * each fails silently and platform-specifically when you get it wrong — the
 * kind of bug that never reproduces on the developer's desktop Chrome.
 * They live here, apart from the component, so they can be tested.
 */

/**
 * Join two spoken fragments, inserting a space only when neither side already
 * supplies one.
 *
 * iOS Safari returns transcripts with **no leading whitespace**, so saying
 * "hello" and then "milk" concatenates to "hellomilk" unless something
 * intervenes. Desktop Chrome supplies the leading space itself, which is why
 * naive concatenation looks correct right up until someone opens it on an
 * iPhone — and voice on a phone is the case that matters most here.
 */
export function joinSpoken(left: string, right: string): string {
  if (!left) return right;
  if (!right) return left;
  if (/\s$/.test(left) || /^\s/.test(right)) return left + right;
  return `${left} ${right}`;
}

/**
 * Pick the recognition locale.
 *
 * `navigator.language` frequently returns a bare `"en"`, and speech engines —
 * iOS especially — recognize considerably better given a full locale tag than
 * a two-letter code. Anything shorter than a full tag is upgraded rather than
 * passed through.
 */
export function preferredLang(navigatorLanguage: string | undefined | null): string {
  const tag = (navigatorLanguage || '').trim();
  return tag.length < 5 ? 'en-US' : tag;
}
