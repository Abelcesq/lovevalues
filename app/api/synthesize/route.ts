import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { LEGAL_DISCLOSURE, MIRROR_FRAMING } from '@/lib/method';

export const runtime = 'nodejs';
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

const SYSTEM_PROMPT = `You are a relationship confidant. Someone has just walked through a four-module method — Values, Roots, Patterns, Habits — answering questions about what they value, where their ways of loving began, how they show up in relationships, and what they reach for when things get hard. You are now reflecting what they wrote back to them.

YOUR GOVERNING PURPOSE — read this before anything else:
You hold up a mirror. You do not deliver verdicts. You reflect what the answers suggest and let the person decide whether it is true. Your job is to give them language and courage for two things: finding a partner who can genuinely see and accept them, and consciously building a relationship on shared values rather than drifting into one.

HARD RULES — these are not stylistic preferences:

1. EMPATHY. Every sentence — especially anything touching childhood — is delivered in a loving, empathetic tone. You are speaking to a real person about the tenderest parts of their life. Warmth is not decoration here; it is the product.

2. NEVER DIAGNOSE. You are not a therapist and this is not therapy. Do not name clinical conditions, attachment styles as labels, disorders, or diagnoses. Do not say "you have" — say "what you wrote suggests" or "this may be worth sitting with." Describe patterns in plain human language.

3. ROOTS, NEVER BLAME. When you connect something in how they love now to something in how they were raised, hold the parents with the same grace you hold the user. Almost every parent gave something real alongside what was hard. Name the inheritance without indicting the person who passed it down. Many people carry an inherited pattern without ever having named it — that framing is normalizing and true.

4. NOTHING IS FINAL. This is what the method assessed from the information provided so far. Write as someone offering a reading, not issuing a result.

5. ONLY WHAT THEY GAVE YOU. Work from their actual words. Do not invent events, relationships, or details they did not write. If an area is thin, say gently that there is more to explore there rather than filling it in.

6. IF THEY ARE IN DISTRESS. If anything they wrote suggests they may be in crisis or at risk of harm, set the analysis aside and warmly encourage them to reach out to a qualified professional or a trusted person in their life. That takes priority over completing the report.

TONE: Direct and warm. Second person. Short paragraphs. No clinical hedging, no corporate softening, no flattery. Say the true thing kindly. A person should finish reading and feel both more seen and more capable — not graded.

Do not mention any book, method name, author, or person. You are the product itself.`;

const SCHEMA = {
  type: 'object',
  properties: {
    coreValues: {
      type: 'array',
      description:
        'The core values that came through, ranked most to least central. Draw on their chosen values AND what their stories actually reveal — sometimes those differ, and that gap is worth naming gently.',
      items: {
        type: 'object',
        properties: {
          value: { type: 'string', description: 'The value, in one or two words.' },
          whyItMatters: {
            type: 'string',
            description:
              'Two to four sentences on what this value looks like in their specific life, quoting or referencing what they actually wrote.',
          },
        },
        required: ['value', 'whyItMatters'],
        additionalProperties: false,
      },
    },
    operatingSystem: {
      type: 'string',
      description:
        'How they appear to run underneath: inherited patterns, what they reach for under stress, what tends to set it off. Three to five short paragraphs. Roots, never blame. No diagnosis.',
    },
    howYouPresent: {
      type: 'string',
      description:
        'How they show up in relationship — with particular attention to the gap between the terms they state and the terms they actually enforce. Two to four paragraphs, warm and direct.',
    },
    lovingFeedback: {
      type: 'string',
      description:
        'What genuinely works about how they love, and why the harder patterns are there — traced to their origins with compassion. Lead with the real strengths; they are not a consolation prize. Three to five paragraphs.',
    },
    growthPractices: {
      type: 'array',
      description:
        'Concrete, specific new habits — small enough to start this week. Not advice, not affirmations. If someone withdraws in silence, a practice might be naming the drop out loud in the moment to build the confidence that makes it possible.',
      items: {
        type: 'object',
        properties: {
          practice: { type: 'string', description: 'The practice, stated as an action.' },
          why: {
            type: 'string',
            description: 'Which specific pattern of theirs this addresses, and how it helps.',
          },
        },
        required: ['practice', 'why'],
        additionalProperties: false,
      },
    },
  },
  required: ['coreValues', 'operatingSystem', 'howYouPresent', 'lovingFeedback', 'growthPractices'],
  additionalProperties: false,
} as const;

type Payload = {
  coreValues: string[];
  operationalized: Record<string, { definition: string; dos: string; donts: string }>;
  answers: { question: string; answer: string }[];
};

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'Could not read the request.' }, { status: 400 });
  }

  const answered = (body.answers ?? []).filter((a) => a.answer?.trim());
  if (answered.length < 3) {
    return NextResponse.json(
      {
        error:
          'There isn’t quite enough here yet for an honest reflection. Answer a few more questions and come back — the mirror is only as true as what you put in front of it.',
      },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          'The synthesis engine isn’t configured yet. Set ANTHROPIC_API_KEY on the server and try again — your answers are saved and untouched.',
      },
      { status: 503 },
    );
  }

  const transcript = [
    body.coreValues?.length
      ? `CORE VALUES THEY CHOSE, in their own order of priority:\n${body.coreValues.join(', ')}`
      : 'They have not yet narrowed to core values.',
    '',
    'HOW THEY DEFINED EACH CORE VALUE:',
    ...Object.entries(body.operationalized ?? {}).map(
      ([value, v]) =>
        `${value}\n  What it means to me: ${v.definition || '(not yet answered)'}\n  Do's: ${v.dos || '(not yet answered)'}\n  Don'ts / boundaries: ${v.donts || '(not yet answered)'}`,
    ),
    '',
    'THEIR ANSWERS:',
    ...answered.map((a) => `Q: ${a.question}\nA: ${a.answer}`),
  ].join('\n');

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: 'high',
        format: { type: 'json_schema', schema: SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: `Here is everything this person shared. Reflect it back to them.\n\n${transcript}`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return NextResponse.json(
        {
          error:
            'We weren’t able to generate a reflection from this. Your answers are safe and unchanged — please try again, or reach out to a trusted person if something here feels heavy.',
        },
        { status: 422 },
      );
    }

    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') {
      return NextResponse.json({ error: 'The reflection came back empty. Please try again.' }, { status: 502 });
    }

    const synthesis = JSON.parse(text.text);

    return NextResponse.json({
      synthesis: { ...synthesis, generatedAt: new Date().toISOString() },
      framing: MIRROR_FRAMING,
      disclosure: LEGAL_DISCLOSURE,
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: 'The engine is busy right now. Wait a moment and try again — nothing was lost.' },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'The synthesis engine is misconfigured.' }, { status: 503 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: 'The reflection could not be generated right now. Your answers are safe.' },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: 'Something went wrong. Your answers are safe.' }, { status: 500 });
  }
}
