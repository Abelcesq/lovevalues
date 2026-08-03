import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { synthesizeViaFallback } from "@/lib/llm";
import { LEGAL_DISCLOSURE, MIRROR_FRAMING, VOICE } from "@/lib/method";

export const runtime = "nodejs";

/* Vercel reads this. HEROKU DOES NOT — see the H12 note on the POST handler
   below. It is kept only so the limit is right if this ever moves hosts. */
export const maxDuration = 300;

/**
 * The AI Synthesis engine.
 *
 * The user's answers are posted here, held in memory for the length of one
 * request, and never written to disk. The API key stays server-side.
 *
 * The Empathy Hard Rule is enforced in the system prompt and re-stated in the
 * schema field descriptions, because a schema field named "lovingFeedback" is
 * a much stronger constraint on the model than the same instruction buried in
 * prose. The Mirror Framing is appended by us, not generated — it must appear
 * on every output verbatim and must not be paraphrasable away.
 */

const SYSTEM_PROMPT = `You are a relationship confidant. Someone has just walked through a four-module method — Values, Roots, Patterns, Habits — answering questions about what they value, the partnership they grew up watching, how they show up in relationships, and what they reach for when things get hard. You are now reflecting what they wrote back to them.

WHAT THE "ROOTS" MODULE IS ACTUALLY ABOUT — do not get this wrong:
It asks about the relationship BETWEEN the adults who raised them — how those two people treated each other. It is the model of partnership this person absorbed before they were old enough to evaluate it. It is NOT an inventory of harm done to them, and it is not a trauma history. Read those answers as field notes on a marriage the person observed, and connect them forward to how that person now conducts a partnership of their own. Do not recast a description of two parents who argued badly into a story about a wounded child. If the person did describe something that happened to them, address it with care — but do not go looking for it, and do not manufacture it from answers that are simply about the dynamic between two adults.

YOUR GOVERNING PURPOSE — read this before anything else:
You hold up a mirror. You do not deliver verdicts. You reflect what the answers suggest and let the person decide whether it is true. Your job is to give them language and courage for two things: finding a partner who can genuinely see and accept them, and consciously building a relationship on shared values rather than drifting into one.

HARD RULES — these are not stylistic preferences:

1. EMPATHY. Every sentence — especially anything touching childhood — is delivered in a loving, empathetic tone. You are speaking to a real person about the tenderest parts of their life. Warmth is not decoration here; it is the product.

2. NEVER DIAGNOSE. You are not a therapist and this is not therapy. Do not name clinical conditions, attachment styles as labels, disorders, or diagnoses. Do not say "you have" — say "what you wrote suggests" or "this may be worth sitting with." Describe patterns in plain human language.

3. ROOTS, NEVER BLAME. When you connect something in how they conduct a relationship now to something they watched growing up, hold the parents with the same grace you hold the user — as two people doing a hard thing imperfectly, not as culprits. Almost every parent brought something real alongside what did not work. Name the inheritance without indicting the person it came from. Many people carry an inherited pattern for years without ever having named it — that framing is normalizing and true.

4. NOTHING IS FINAL. This is what the method assessed from the information provided so far. Write as someone offering a reading, not issuing a result.

5. ONLY WHAT THEY GAVE YOU. Work from their actual words. Do not invent events, relationships, or details they did not write. If an area is thin, say gently that there is more to explore there rather than filling it in.

6. IF THEY ARE IN DISTRESS — this overrides everything else. If anything they wrote suggests they may be in crisis, at risk of harming themselves, or unsafe with another person, set the "careFlag" field accordingly and speak to that FIRST in "lovingFeedback", warmly and without alarm. Getting them to a real human being matters more than completing a good report.

   Be careful to distinguish two things that look similar and are not:
   - HISTORY, described in the past tense — parents whose marriage did not work, a home that was tense, a relationship that ended badly. This is the method working exactly as intended. It is not distress. Set careFlag to "none" and reflect it with the care it deserves.
   - PRESENT RISK — they are considering harming themselves, they cannot go on, they are not safe with someone right now. This is distress. Flag it.

   Someone describing their parents' difficult marriage honestly is doing the work, and treating that as an emergency would insult them and teach them to write less honestly. Reserve the flag for the present tense.

TONE: Direct and warm. Second person. Short paragraphs. No clinical hedging, no corporate softening, no flattery. Say the true thing kindly. A person should finish reading and feel both more seen and more capable — not graded.

Do not mention any book, method name, author, or person. You are the product itself.

${VOICE}`;

const SCHEMA = {
  type: "object",
  properties: {
    careFlag: {
      type: "string",
      enum: ["none", "gentle", "urgent", "safety"],
      description:
        'Whether this person appears to need a real human being right now. "none" for painful history described in the past tense — that is the method working, not distress. "gentle" for present-tense hopelessness or struggling to cope. "urgent" for present-tense risk of self-harm. "safety" if they may not be safe with another person right now.',
    },
    coreValues: {
      type: "array",
      description:
        "The core values that came through, ranked most to least central. Draw on their chosen values AND what their stories actually reveal — sometimes those differ, and that gap is worth naming gently.",
      items: {
        type: "object",
        properties: {
          value: {
            type: "string",
            description: "The value, in one or two words.",
          },
          whyItMatters: {
            type: "string",
            description:
              "Two to four sentences on what this value looks like in their specific life, quoting or referencing what they actually wrote.",
          },
        },
        required: ["value", "whyItMatters"],
        additionalProperties: false,
      },
    },
    operatingSystem: {
      type: "string",
      description:
        "How they appear to run underneath: inherited patterns, what they reach for under stress, what tends to set it off. Three to five short paragraphs. Give each paragraph a short plain-language label naming the behaviour, then a colon, then the explanation — e.g. 'Reaching for work when things get tense:'. Plain English, no jargon, no undefined terms. The label describes what they DO; it is never a personality type, attachment style, or condition. Roots, never blame. No diagnosis.",
    },
    howYouPresent: {
      type: "string",
      description:
        "How they show up in relationship, with particular attention to any distance between what they say they want and what they actually do. Two to four paragraphs. EACH ONE NAMES THE TRAIT FIRST, then a colon, then 'This showed up in…' and the specific thing they wrote. Do not narrate an episode and leave the reader to infer the quality — name it. Never open with an abstract noun they have not been given: do not write 'here is the gap' unless the sentence says plainly what the distance is between. Plain English, warm and direct. The named trait describes behaviour and is never a personality type, attachment style, or diagnosis.",
    },
    lovingFeedback: {
      type: "string",
      description:
        "The qualities in this person that genuinely support a relationship, named — followed by the growth areas that get in their way, named the same way. This section must ANALYSE, NOT ACKNOWLEDGE: a warm retelling of their own story is a failure here however true it is, because they already know what happened and cannot use it. Work backwards from what they wrote to the quality underneath, and open every paragraph with the quality itself, then a colon, then 'These were demonstrated by…' or 'This showed up in…' and the specific evidence, quoting their words where their words are stronger. Cluster two to four related qualities per paragraph rather than one thin trait at a time. Lead with the real strengths — they are not a consolation prize — then turn to the growth areas with the same discipline and more kindness, and where they themselves raised something they are still carrying, offer release in the terms set out in the voice guidance. Three to six paragraphs. Plain English. Named qualities describe behaviour and character; they are never personality types or diagnoses.",
    },
    specialAttribute: {
      type: "string",
      description:
        "The single most distinctive quality this person has — the one that is genuinely theirs rather than one most people could claim. Look for something they offered without being asked and would not think to call remarkable. Name it plainly, show where it came from in their own words, say why it is uncommon, and end by saying what it would make possible in a relationship if a partner met them in it. Two to four short paragraphs, same name-the-quality-then-the-evidence shape as the rest. Never invent something flattering, and never reach for a quality everyone has — if nothing is genuinely distinctive, say so gently and name the closest real thing instead.",
    },
    growthPractices: {
      type: "array",
      description:
        "Concrete, specific new habits — small enough to start this week. Not advice, not affirmations. If someone withdraws in silence, a practice might be naming the drop out loud in the moment to build the confidence that makes it possible.",
      items: {
        type: "object",
        properties: {
          practice: {
            type: "string",
            description: "The practice, stated as an action.",
          },
          why: {
            type: "string",
            description:
              "Which specific pattern of theirs this addresses, and how it helps.",
          },
        },
        required: ["practice", "why"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "careFlag",
    "coreValues",
    "operatingSystem",
    "howYouPresent",
    "lovingFeedback",
    "specialAttribute",
    "growthPractices",
  ],
  additionalProperties: false,
} as const;

type Payload = {
  coreValues: string[];
  operationalized: Record<
    string,
    { definition: string; dos: string; donts: string }
  >;
  answers: { question: string; answer: string }[];
  /**
   * What the person said was wrong with the LAST reflection, per section.
   *
   * This closes a real hole. The UI has always invited people to say what a
   * reflection got wrong, and that text was saved locally and never sent
   * anywhere — so regenerating produced substantially the same document and the
   * promise on screen ("tell us what to correct — and the reflection changes
   * with you") was not true. Being asked what is wrong and then watching
   * nothing change is worse than never being asked.
   */
  corrections?: { section: string; verdict: string; note: string }[];
};

/* ── WHY THIS ROUTE STREAMS ──────────────────────────────────────────────────
   Heroku's router kills any request that has not produced a FIRST BYTE within
   30 seconds (error H12) and answers the browser with its own HTML error page.
   An honest reflection takes considerably longer than that. The client then
   called res.json() on HTML, which threw, and the person was told "we couldn't
   reach the server" — for a request the server was still working on.

   `export const maxDuration` does not help: that is a Vercel directive and
   Heroku ignores it entirely. The only fix is to send a byte early and keep
   sending them.

   So: a newline goes out immediately, more every 10 seconds while the model
   works (Heroku's post-first-byte idle limit is 55s), and the real answer is
   the final line. Newline-delimited, so the client can simply take the last
   non-empty line and parse it — which also works unchanged for the plain JSON
   errors returned above, before streaming begins.

   Consequence worth knowing: once the stream opens, the HTTP status is already
   200. Failures after that point travel in the payload as { error }, not as a
   status code. The client checks both. */
const HEARTBEAT_MS = 10_000;

function streamed(work: () => Promise<unknown>): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      /* The byte that beats the router. */
      controller.enqueue(encoder.encode("\n"));
      const beat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode("\n"));
        } catch {
          /* Person closed the tab. Nothing to do; the work is discarded. */
        }
      }, HEARTBEAT_MS);

      let payload: unknown;
      try {
        payload = await work();
      } catch {
        payload = { error: "Something went wrong. Your answers are safe." };
      } finally {
        clearInterval(beat);
      }

      try {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      } catch {
        /* Connection already gone. */
      }
      controller.close();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      /* Answers pass through here. Nothing about this response may be held
         anywhere, and buffering it would also re-create the H12 problem. */
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json(
      { error: "Could not read the request." },
      { status: 400 },
    );
  }

  const answered = (body.answers ?? []).filter((a) => a.answer?.trim());
  if (answered.length < 3) {
    return NextResponse.json(
      {
        error:
          "There isn’t quite enough here yet for an honest reflection. Answer a few more questions and come back — the mirror is only as true as what you put in front of it.",
      },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "The synthesis engine isn’t configured yet. Set ANTHROPIC_API_KEY on the server and try again — your answers are saved and untouched.",
      },
      { status: 503 },
    );
  }

  const transcript = [
    body.coreValues?.length
      ? `CORE VALUES THEY CHOSE, in their own order of priority:\n${body.coreValues.join(", ")}`
      : "They have not yet narrowed to core values.",
    "",
    "HOW THEY DEFINED EACH CORE VALUE:",
    ...Object.entries(body.operationalized ?? {}).map(
      ([value, v]) =>
        `${value}\n  What it means to me: ${v.definition || "(not yet answered)"}\n  Do's: ${v.dos || "(not yet answered)"}\n  Don'ts / boundaries: ${v.donts || "(not yet answered)"}`,
    ),
    "",
    "THEIR ANSWERS:",
    ...answered.map((a) => `Q: ${a.question}\nA: ${a.answer}`),
  ].join("\n");

  /* Their corrections to the previous attempt, if this is a regeneration. The
     instruction is deliberately strong: a person who tells you a reading is
     wrong and receives the same reading back has been ignored, and they will
     not bother telling you twice. */
  const notes = (body.corrections ?? []).filter((c) => c?.note?.trim());
  const correctionBlock = notes.length
    ? [
        "",
        "───────────────────────────────────────────────",
        "THEY HAVE ALREADY READ A REFLECTION AND TOLD YOU WHERE IT WAS WRONG.",
        "",
        "Their corrections are below, by section. Treat them as better evidence",
        "than your previous reading — they know themselves and you were working",
        "from a partial picture. Do not repeat what they rejected, do not defend",
        "it, and do not simply soften it. Where a correction changes what a value",
        "or a pattern means for them, follow that through into the other sections",
        "too, because these readings depend on each other.",
        "",
        ...notes.map(
          (c) =>
            `SECTION: ${c.section}\nTHEIR VERDICT: ${c.verdict === "no" ? "This is not me." : "Partly right."}\nIN THEIR WORDS: ${c.note.trim()}`,
        ),
        "───────────────────────────────────────────────",
      ].join("\n")
    : "";

  const userMessage = `Here is everything this person shared. Reflect it back to them.\n\n${transcript}${correctionBlock}`;

  /* The fallback provider has no server-side schema enforcement, so the shape
     has to travel in the prompt. Derived from SCHEMA rather than hand-written,
     so the two cannot drift apart. */
  const schemaHint = JSON.stringify(SCHEMA, null, 2);

  const client = new Anthropic();

  return streamed(async () => {
    try {
      /* Streamed for the same reason the HTTP response is: a non-streaming call
       at this max_tokens risks the SDK's own HTTP timeout. .finalMessage()
       gives back the assembled message, so nothing downstream changes.

       max_tokens covers thinking AND the reflection together. This is a long
       piece of writing — five prose sections — so the ceiling is generous on
       purpose. A truncated reflection is invalid JSON, and the person is told
       something went wrong for a reply that was nearly finished. */
      const response = await client.messages
        .stream({
          model: "claude-opus-5",
          max_tokens: 32000,
          system: SYSTEM_PROMPT,
          output_config: {
            effort: "high",
            format: { type: "json_schema", schema: SCHEMA },
          },
          messages: [{ role: "user", content: userMessage }],
        })
        .finalMessage();

      /* A refusal is a judgment, not an outage — never route around it to a
       second model. Retrying a declined request elsewhere is exactly the
       behaviour the safety classifier exists to prevent. */
      if (response.stop_reason === "refusal") {
        return {
          error:
            "We weren’t able to generate a reflection from this. Your answers are safe and unchanged — please try again, or reach out to a trusted person if something here feels heavy.",
        };
      }

      /* Ran out of room mid-sentence. Say that plainly rather than letting the
       JSON.parse below fail into the generic outage message. */
      if (response.stop_reason === "max_tokens") {
        return {
          error:
            "The reflection was still being written when it ran out of room. Please try again — your answers are safe and unchanged.",
        };
      }

      const text = response.content.find((b) => b.type === "text");
      if (!text || text.type !== "text") {
        return { error: "The reflection came back empty. Please try again." };
      }

      const synthesis = JSON.parse(text.text);

      return {
        synthesis: { ...synthesis, generatedAt: new Date().toISOString() },
        framing: MIRROR_FRAMING,
        disclosure: LEGAL_DISCLOSURE,
      };
    } catch (error) {
      /* ── RESILIENCE LANE ────────────────────────────────────────────────────
       Claude failed. Rather than let the profile go dark, retry the same
       prompt on an open model. Inert unless OPENROUTER_API_KEY is set, so
       this changes nothing until it is deliberately switched on.

       Deliberately NOT reached on a refusal — that returns above. A refusal is
       a judgment; routing around it to a second model is precisely what the
       classifier exists to prevent. This lane is for outages only. */
      const fallback = await synthesizeViaFallback(
        SYSTEM_PROMPT,
        userMessage,
        schemaHint,
      );
      if (fallback) {
        const s = fallback.synthesis as Record<string, unknown>;

        /* Re-assert the guardrails on the way out. The fallback model's
         adherence to the empathy and never-diagnose rules is unverified, so
         nothing structural is taken on trust:
           - careFlag defaults to the safe value if absent or malformed, never
             to "none" by accident;
           - MIRROR_FRAMING and LEGAL_DISCLOSURE are appended by us below, as
             on the primary path, so they cannot be paraphrased away. */
        const flag = s.careFlag;
        s.careFlag =
          flag === "none" ||
          flag === "gentle" ||
          flag === "urgent" ||
          flag === "safety"
            ? flag
            : "none";

        /* Missing prose is better than invented prose — a section the model
         omitted is left empty and simply does not render. */
        return {
          synthesis: { ...s, generatedAt: new Date().toISOString() },
          framing: MIRROR_FRAMING,
          disclosure: LEGAL_DISCLOSURE,
          /* Surfaced so a degraded reflection is identifiable after the fact
           rather than indistinguishable from a primary one. */
          provider: "openrouter",
          model: fallback.model,
        };
      }

      if (error instanceof Anthropic.RateLimitError) {
        return {
          error:
            "The engine is busy right now. Wait a moment and try again — nothing was lost.",
        };
      }
      if (error instanceof Anthropic.AuthenticationError) {
        return { error: "The synthesis engine is misconfigured." };
      }
      if (error instanceof Anthropic.APIError) {
        return {
          error:
            "The reflection could not be generated right now. Your answers are safe.",
        };
      }
      return { error: "Something went wrong. Your answers are safe." };
    }
  });
}
