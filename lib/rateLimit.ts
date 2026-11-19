/**
 * A rate limit for the endpoints that cost money or do real work.
 *
 * WHY THIS EXISTS. /api/synthesize had no authentication, no rate limit and
 * no size cap on its input, while calling a frontier model with a 32,000
 * token ceiling. Anyone who found the URL could run it in a loop and spend
 * the project's Anthropic budget as fast as the network allowed. It was live
 * on a public site. That is the kind of hole that does not announce itself —
 * nothing breaks, the bill simply arrives.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * BE HONEST ABOUT WHAT THIS IS. The counters live in this process's memory.
 *
 *   · They reset when the dyno restarts, which on Heroku is at least daily.
 *   · They are PER DYNO. Two dynos means twice the allowance.
 *
 * So this is a speed bump, not a guarantee, and it should be read as one. It
 * turns "unlimited spend by anyone with curl" into "a few calls per person
 * per hour", which is the difference that matters right now. A real limit
 * belongs in Postgres or Redis, keyed on the user, and should be built before
 * this app has more than one dyno.
 *
 * It is deliberately NOT the only defence on the expensive route — a session
 * is required there too. Rate limiting alone would still let anyone with a
 * free account spend the budget.
 * ─────────────────────────────────────────────────────────────────────────
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/* Bound the map. An attacker cycling keys — a new IP per request — would
   otherwise grow it until the dyno runs out of memory, turning a rate
   limiter into the denial of service it was meant to prevent. */
const MAX_KEYS = 10_000;

export type RateVerdict = {
  ok: boolean;
  /** Whole seconds until this key is allowed again. */
  retryAfter: number;
  remaining: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateVerdict {
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      /* Drop everything already expired before refusing to grow. Cheap,
         amortised, and keeps a long-running dyno from leaking. */
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      /* Still full of live entries: refuse rather than grow without bound.
         Failing CLOSED here is deliberate — the alternative is an unbounded
         map, and this branch is only reachable under abuse. */
      if (buckets.size >= MAX_KEYS) {
        return { ok: false, retryAfter: 60, remaining: 0 };
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  existing.count += 1;
  return {
    ok: true,
    retryAfter: 0,
    remaining: limit - existing.count,
  };
}

/** Exposed for tests. Never call this from a route. */
export function __resetRateLimits(): void {
  buckets.clear();
}
