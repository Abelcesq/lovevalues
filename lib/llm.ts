/**
 * Resilience lane for the synthesis engine.
 *
 * Claude stays primary. This exists so that a failed Anthropic call degrades to
 * an open model instead of the profile going dark — the same outage class
 * NowTrending hit on 2026-07-07 when its Anthropic balance ran out and the
 * feature went dark until it was topped up. The pattern here is deliberately
 * the one already proven in that codebase (`transfer/ai_grade.py`):
 *
 *   - Fallback is a RESILIENCE lane only. Never silently re-route healthy
 *     calls. If Claude answers, Claude's answer is what ships.
 *   - `provider: {data_collection: "deny"}` excludes OpenRouter providers that
 *     train on prompts. On this product that is not a nice-to-have: the payload
 *     is somebody's account of their parents' marriage.
 *   - The lane is INERT until OPENROUTER_API_KEY is set. No key, no behaviour
 *     change, no surprise third party.
 *
 * ── WHY THE REASONING MODEL, AND WHAT IT COSTS US ────────────────────────────
 * The default is DeepSeek-R1 because synthesis is the reasoning-heavy job —
 * holding a whole person's answers together and finding the pattern across
 * them. R1 is also MIT-licensed, which is the cleanest of the permissive tier.
 *
 * But R1 is a *reasoning* model, and two things follow that matter here:
 *
 *   1. It emits chain-of-thought in <think> blocks. That reasoning is about
 *      someone's childhood, and it must never reach the user. `extractJson`
 *      strips it before anything else happens.
 *   2. Its adherence to the empathy hard rule and the never-diagnose rule is
 *      UNVERIFIED. The system prompt goes with the request, but a prompt is not
 *      a guarantee. This is why the mirror framing and the legal disclosure are
 *      appended by our code rather than generated, and why fallback output is
 *      marked `provider: 'openrouter'` — so a degraded reflection is
 *      identifiable after the fact rather than indistinguishable.
 *
 * Treat anything this lane produces as a safety net, not as an equal.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * The reasoning model, for the one hard job this app has.
 *
 * Verify the exact slug against openrouter.ai/models before relying on it —
 * provider slugs drift, and a wrong one fails at request time rather than at
 * deploy time. Override with LOVEVALUES_FALLBACK_MODEL.
 */
const FALLBACK_MODEL = process.env.LOVEVALUES_FALLBACK_MODEL ?? 'deepseek/deepseek-r1';

/**
 * Strip reasoning traces and pull the first JSON object out of a model
 * response.
 *
 * Tolerant on purpose. Open models return JSON wrapped in prose, inside ```json
 * fences, or preceded by a <think> block — none of which the Anthropic path
 * produces, because there the schema is enforced server-side. Being strict here
 * would mean the safety net fails exactly when it is needed.
 */
export function extractJson(text: string): unknown | null {
  if (!text) return null;

  /* Reasoning traces first. On this product a leaked <think> block would be a
     model musing about a real person's parents — strip it before we so much as
     look for a brace. Unclosed blocks (truncated output) are dropped too. */
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  if (/<think>/i.test(cleaned)) cleaned = cleaned.replace(/<think>[\s\S]*$/i, '');
  cleaned = cleaned.replace(/```(?:json)?/gi, '').trim();

  /* Brace-match rather than regex — the payload contains prose with braces in
     it, and a greedy or lazy pattern gets both ends wrong. */
  const start = cleaned.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export type FallbackResult = { synthesis: Record<string, unknown>; model: string };

/**
 * Ask the fallback model for the synthesis. Returns null when the lane is
 * inert, the call fails, or the response cannot be parsed — every one of which
 * must leave the caller reporting the ORIGINAL Anthropic failure rather than a
 * confusing second one.
 */
export async function synthesizeViaFallback(
  system: string,
  user: string,
  schemaHint: string,
): Promise<FallbackResult | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  /* OpenRouter does not carry Anthropic's server-side schema enforcement, so
     the shape has to be asked for in the prompt and verified on the way out. */
  const instructed = `${system}\n\nReturn ONLY a single JSON object, with no preamble and no code fence, matching exactly this shape:\n${schemaHint}`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        /* OpenRouter attribution headers — harmless, and they make the spend
           legible per-app on a shared key. */
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lovevalues.com',
        'X-Title': 'Love Values',
      },
      body: JSON.stringify({
        model: FALLBACK_MODEL,
        messages: [
          { role: 'system', content: instructed },
          { role: 'user', content: user },
        ],
        max_tokens: 8000,
        /* Never route this payload to a provider that trains on prompts. */
        provider: { data_collection: 'deny' },
      }),
      signal: AbortSignal.timeout(180_000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    const parsed = extractJson(text);

    if (!parsed || typeof parsed !== 'object') return null;
    return { synthesis: parsed as Record<string, unknown>, model: data?.model ?? FALLBACK_MODEL };
  } catch {
    return null;
  }
}
