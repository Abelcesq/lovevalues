/**
 * Put a ceiling on a promise that has no timeout of its own.
 *
 * WHY THIS EXISTS. The sign-in form froze in production: the button went
 * disabled and stayed that way, with no error and nothing to click. The cause
 * was structural rather than specific — `await` on a promise that never
 * settles is indistinguishable, from the user's side, from a page that has
 * crashed. A hung database query, a request that is never answered, a library
 * call that silently gives up: all of them look like that.
 *
 * A timeout turns "frozen forever" into "something went wrong, try again",
 * which is a far smaller failure and one a person can act on.
 *
 * NOTE WHAT THIS DOES NOT DO: it does not cancel the underlying work, because
 * a plain promise cannot be cancelled. The slow thing keeps running and its
 * result is dropped. That is fine for a sign-in attempt and would NOT be fine
 * for anything that charges money — there, the request itself needs an
 * AbortSignal so the server stops too.
 */

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} did not answer within ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(
  work: Promise<T>,
  ms: number,
  label = "the server",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
