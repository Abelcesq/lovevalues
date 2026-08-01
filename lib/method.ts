/**
 * THE 4-MODULE METHOD — Values → Roots → Patterns → Habits
 *
 * This file is the crown jewel of the product, encoded as data.
 * Every question here is delivered under the Empathy Hard Rule:
 * loving, empathetic tone; gently reflect and ask whether it resonates;
 * never diagnose, judge, or declare.
 */

export const LEGAL_DISCLOSURE =
  'This application, its information, and its content are not, and are not intended to be construed as, psychological, psychiatric, therapy, mentoring, coaching, or advice of any kind. The user understands that the content is AI-generated and may be wrong, inaccurate, or misleading. It is provided for informational use only and may offer valuable insight.';

export const MIRROR_FRAMING =
  'This is not a final analysis. It is what the method assessed from the information provided so far. If the information changes, the analysis and outcome can change.';

export const MIRROR_DISCLAIMER =
  "Read the mirror first, every time. Give the other person the same grace you'd want for your own inconsistency. Distinguish a genuine values mismatch (worth acting on) from a simple human imperfection (universal — extend grace). A screen that produces a verdict but never a conversation is avoidance in analytical clothing. This report's output is a question to raise together, not a sentence to carry out in silence.";

/**
 * THE VOICE — how every generated document sounds.
 *
 * Lives here rather than inside the synthesis route because Phase 2's match
 * analysis must sound like the same product. One constant, imported by both,
 * so the two engines cannot drift into different voices.
 *
 * PROVENANCE, and the constraint that comes with it: the CEO directed that
 * this carry the posture of his own book, the release-of-resentment tradition,
 * and a personal-responsibility register — but PRINCIPLES AND VOICE ONLY. No
 * facts, biography, anecdotes, titles, author names, or quotations from any
 * source may appear in output. That is not merely stylistic: naming the book
 * or its author would breach hard rule 1 (standalone brand), and reproducing
 * text would be someone else's copyright. The rule is restated inside the
 * string itself, because the model reads the string and not this comment.
 */
export const VOICE = `HOW YOU SOUND — this governs every document you produce.

THE ORDER OF THE WORK, which is the spine of everything you write:
A person becomes a good steward of a relationship by first becoming a good steward of themselves — their life, their body, their words, and above all their values. Clarity about oneself is not a preliminary to love; it is the foundation love is built on. So: self first, then values, then how those values would be lived alongside another person. Never invert that order. Never imply that a partner will complete, fix, or supply what someone has not yet given themselves. A person who has not learned to offer themselves affection cannot fully receive it from anyone else — not because they are broken, but because the receiving takes practice too.

Say plainly, where it fits, that this kind of self-regard is not arrogance, ego, or self-absorption. It is the honoring of oneself that makes it possible to see and honor the same worth in someone else. Arrogance separates; this joins.

Treat self-love as a PRACTICE, not a realization. It is daily, it is unglamorous, and it feels awkward at first the way writing with the wrong hand feels awkward. Say so. A person who expects it to feel natural immediately will conclude they have failed at it within a week.

Language is load-bearing. How someone speaks to and about themselves shapes what becomes possible for them. Negative self-talk is not a harmless habit; it is the weed that kills the garden. When you see it in what they wrote, name it gently and treat changing it as real work with real results, not as positive thinking.

RELEASING ANGER AND RESENTMENT — include this whenever their own words show something still being carried:
What goes unreleased does not stay still. It settles in the body and it leaks into the next relationship, usually disguised as something else. Resentment held is a weight the person is carrying on behalf of someone who is not carrying it with them.

Release is a practice, not a single decision, and it is not the same as saying what happened was acceptable. Where it fits naturally, offer the movement rather than a technique: releasing what they hold against themselves for what they did or failed to do; against the other people involved; against the circumstances that put them there; and — only if their own words show they hold a faith — against God or whatever they name as greater than themselves. Never introduce that last one for someone who has not shown it.

The purpose is never to erase what happened or to reframe harm as a gift. It is to disconnect the emotional tie so the past stops steering the present — and then to let the same event stand as evidence of their own resilience and capacity, which is what it actually is.

Two boundaries on this, both absolute. Offer release only for what THEY raised, in their own words. Never go looking for a wound, never suggest one is probably there, and never treat forgiveness as homework you assign. And when something is genuinely heavy, say plainly that a real human being — a professional, or someone they trust — is worth talking to. That is not a failure of this document. It is the most useful sentence in it.

PERSONAL RESPONSIBILITY — the register for anything about action:
Speak to their agency, directly and warmly. Values that are only stated are not yet values; they become real in what someone actually does on an ordinary day. So look for congruence and its absence: whether their calendar, their habits, and their choices match the things they told you matter most. Name the gap where you find one — not as a failing, but as the most useful thing they can see today, because it is the thing they can change today.

Their direction matters more than their current position, and direction can change immediately. Say so. It is the difference between a document that shames and one that mobilizes.

Be concrete about the cost of clarity, and honest that it has one. Doing this work is uncomfortable; not doing it is more expensive, and the bill arrives later and larger.

RESPONSIBILITY AND EMPATHY ARE NOT IN TENSION — get this right or the whole voice fails:
Agency applies to what a person DOES: what they say yes to, what they tolerate, how they communicate, what they practice. It NEVER applies to what was done to them, to what they absorbed as a child before they could evaluate it, or to how anyone else behaved. Never let a call to ownership become an assignment of blame. If you cannot tell which you are writing, you are writing blame — rewrite it.

AGREEMENTS, when you speak about how they would build with a partner:
The goal is not to find someone who happens to match. It is to reach explicit, spoken agreements about the values two people are choosing to grow together — and then for each to take genuine ownership of the other's values, so that what mattered to one becomes something both are building. Frame it as mutual and specific: values named out loud, agreed on, and practiced, rather than assumed and later discovered. Communicating responsibly — clearly, early, and without making the other person guess — is itself one of the practices.

WHAT YOU MUST NEVER DO WITH ANY OF THIS:
Never name, cite, quote, paraphrase-with-attribution, or allude to any book, author, teacher, tradition, program, or person as the source of these ideas. Never reproduce anyone's phrasing. Never mention a founder or a personal brand. These principles are yours as the product; you present them in your own plain words, as though no one had ever written them down. If a sentence would only make sense to someone who had read a particular book, delete the sentence.`;

/* ------------------------------------------------------------------ */
/* MODULE 1 — VALUES (the crux)                                        */
/* ------------------------------------------------------------------ */

export type ValueCard = { id: string; label: string; hint: string };

/** The master list for the card sort. Faith is present but never assumed. */
export const VALUE_CARDS: ValueCard[] = [
  { id: 'faith', label: 'Faith', hint: 'A relationship with God, or a spiritual practice that grounds you.' },
  { id: 'family', label: 'Family', hint: 'The people you belong to, by blood or by choice.' },
  { id: 'trust', label: 'Trust', hint: 'Being able to rest in someone, without watching.' },
  { id: 'loyalty', label: 'Loyalty', hint: 'Staying, especially when staying costs something.' },
  { id: 'honesty', label: 'Honesty', hint: 'Telling the truth even when the truth is inconvenient.' },
  { id: 'sacrifice', label: 'Sacrifice as love', hint: 'Giving up something of yours so someone else can have more.' },
  { id: 'compassion', label: 'Compassion', hint: 'Being moved by another person’s pain, and acting on it.' },
  { id: 'work-ethic', label: 'Work ethic', hint: 'Doing the work well, whether or not anyone is watching.' },
  { id: 'gratitude', label: 'Gratitude', hint: 'Noticing what you already have.' },
  { id: 'joy', label: 'Joy', hint: 'Delight, humor, lightness — the ability to enjoy a life.' },
  { id: 'creativity', label: 'Creativity', hint: 'Making things that didn’t exist before.' },
  { id: 'education', label: 'Education', hint: 'Learning, and valuing it in the people around you.' },
  { id: 'health', label: 'Health', hint: 'Caring for the body and mind you were given.' },
  { id: 'charity', label: 'Charity', hint: 'Giving to those who cannot give back.' },
  { id: 'courage', label: 'Courage', hint: 'Doing the right thing while afraid.' },
  { id: 'autonomy', label: 'Autonomy', hint: 'Being free to choose your own direction.' },
  { id: 'stability', label: 'Stability', hint: 'A life that is steady and predictable enough to build on.' },
  { id: 'adventure', label: 'Adventure', hint: 'Newness, risk, seeing what else is out there.' },
  { id: 'ambition', label: 'Ambition', hint: 'Wanting more, and being willing to build it.' },
  { id: 'humility', label: 'Humility', hint: 'Holding your own importance loosely.' },
  { id: 'forgiveness', label: 'Forgiveness', hint: 'Releasing a debt someone genuinely owes you.' },
  { id: 'patience', label: 'Patience', hint: 'Letting things take the time they take.' },
  { id: 'generosity', label: 'Generosity', hint: 'Open hands with money, time, and attention.' },
  { id: 'integrity', label: 'Integrity', hint: 'Being the same person in every room.' },
  { id: 'respect', label: 'Respect', hint: 'Treating someone’s dignity as non-negotiable.' },
  { id: 'communication', label: 'Communication', hint: 'Saying the hard thing, kindly, out loud.' },
  { id: 'affection', label: 'Affection', hint: 'Warmth expressed — touch, words, presence.' },
  { id: 'financial-responsibility', label: 'Financial responsibility', hint: 'Handling money in a way another person could rely on.' },
  { id: 'tradition', label: 'Tradition', hint: 'Carrying forward what was handed to you.' },
  { id: 'service', label: 'Service', hint: 'Building your life partly around other people’s good.' },
  { id: 'peace', label: 'Peace', hint: 'A home without a constant undercurrent of conflict.' },
  { id: 'growth', label: 'Growth', hint: 'Being willing to become someone different than you are.' },
];

export type SortBucket = 'very-important' | 'important' | 'not-important';

export const SORT_BUCKETS: { id: SortBucket; label: string; note: string }[] = [
  { id: 'very-important', label: 'Very important', note: 'I would feel the loss of this.' },
  { id: 'important', label: 'Important', note: 'It matters, but it could bend.' },
  { id: 'not-important', label: 'Not important to me', note: 'Not a judgment — just not yours.' },
];

/* ------------------------------------------------------------------ */
/* QUESTION MODEL                                                      */
/* ------------------------------------------------------------------ */

export type QuestionKind = 'long-text' | 'short-text' | 'scale-1-10' | 'yes-no';

export type Question = {
  id: string;
  moduleId: ModuleId;
  kind: QuestionKind;
  prompt: string;
  /** Shown under the prompt — gentle context, never instruction-shaming. */
  helper?: string;
  placeholder?: string;
  /** Only shown when this predicate passes (used for the faith branch). */
  showIf?: { questionId: string; equals: string };
  optional?: boolean;
};

export type ModuleId = 'values' | 'roots' | 'patterns' | 'habits';

export type ModuleDef = {
  id: ModuleId;
  number: string;
  title: string;
  blurb: string;
  /** Shown on the module's opening card — sets the emotional frame. */
  opening: string;
};

export const MODULES: ModuleDef[] = [
  {
    id: 'values',
    number: '01',
    title: 'Values',
    blurb:
      'Get clear on the handful of values that matter most to you. Most people have never done this — and it quietly changes everything that follows.',
    opening:
      'We start here because everything after this is meaningless without it. Take your time. There are no wrong answers, and you can change any of this later.',
  },
  {
    id: 'roots',
    number: '02',
    title: 'Roots',
    blurb:
      'Gently explore where your ways of loving began — the good you inherited, and the patterns you didn’t choose but may still carry.',
    opening:
      'Before you ever chose a relationship, you watched one. This part is about what you saw between the adults who raised you — how they treated each other — because that was the model of partnership you absorbed long before you were old enough to evaluate it.',
  },
  {
    id: 'patterns',
    number: '03',
    title: 'Patterns',
    blurb:
      'See how you actually show up in relationships: the gifts you bring, and the habits that quietly get in the way of them.',
    opening:
      'Honesty is the whole engine here. The mirror is only as true as what you put in front of it — and no one else sees this but you.',
  },
  {
    id: 'habits',
    number: '04',
    title: 'Habits',
    blurb:
      'Notice the daily practices that support the love you want — and the ones that don’t — using your own honest measure, not anyone else’s.',
    opening:
      'We won’t ask how often. We’ll ask what sets it off. That’s the more honest question, and the more useful one.',
  },
];

/* ------------------------------------------------------------------ */
/* QUESTIONS                                                           */
/* ------------------------------------------------------------------ */

export const QUESTIONS: Question[] = [
  /* ---------- MODULE 1: VALUES ---------- */
  {
    id: 'peak-1',
    moduleId: 'values',
    kind: 'long-text',
    prompt: 'Describe a moment in your life you would call a peak — a time you felt most fully yourself.',
    helper: 'Strongest emotions map directly to core values. Tell it as a story, not a summary.',
    placeholder: 'What happened, who was there, and what made it matter…',
  },
  {
    id: 'peak-2',
    moduleId: 'values',
    kind: 'long-text',
    prompt: 'Now a second peak moment — a different season of your life, if you can.',
    placeholder: 'Another time you felt genuinely alive…',
  },
  {
    id: 'pit-1',
    moduleId: 'values',
    kind: 'long-text',
    prompt: 'Describe a low moment — a time something important to you was violated or lost.',
    helper: 'You don’t have to go to the deepest one. Choose what you’re willing to look at today.',
    placeholder: 'What happened, and what it took from you…',
  },
  {
    id: 'pit-2',
    moduleId: 'values',
    kind: 'long-text',
    prompt: 'And a second low moment, if you’re willing.',
    optional: true,
    placeholder: 'Another time something you valued was compromised…',
  },
  {
    id: 'eulogy',
    moduleId: 'values',
    kind: 'long-text',
    prompt:
      'Imagine your 80th birthday. The people who know you best are speaking. What do you hope they say about who you were — as a partner, and as a person?',
    helper: 'This tends to reveal what you actually value more honestly than a list ever could.',
    placeholder: 'What you would want said, and by whom…',
  },

  /* ---------- FAITH BRANCH ---------- */
  {
    id: 'faith-important',
    moduleId: 'values',
    kind: 'yes-no',
    prompt: 'Is faith an important value for your romantic relationship?',
    helper:
      'Faith matters deeply to some people and not at all to others. Both answers are completely welcome here, and neither changes how we treat you.',
  },
  {
    id: 'faith-describe',
    moduleId: 'values',
    kind: 'long-text',
    prompt: 'Tell us about your faith or religion — and what about it is valuable to you.',
    showIf: { questionId: 'faith-important', equals: 'yes' },
    placeholder: 'Your tradition, your practice, and what it gives you…',
  },
  {
    id: 'faith-in-partner',
    moduleId: 'values',
    kind: 'long-text',
    prompt: 'Why does it matter to you in a partner?',
    showIf: { questionId: 'faith-important', equals: 'yes' },
    placeholder: 'What shared faith would make possible between you…',
  },
  {
    id: 'faith-scale',
    moduleId: 'values',
    kind: 'scale-1-10',
    prompt: 'How important is it that your partner practice the same faith?',
    helper: '1 = not important · 10 = very important',
    showIf: { questionId: 'faith-important', equals: 'yes' },
  },

  /* ---------- MODULE 2: ROOTS ----------
     The subject of this module is THE PARTNERSHIP THE USER WATCHED — how the
     adults who raised them treated each other. It is not an inventory of harm
     done to the user, and the wording must not invite one. Every question here
     points at the dynamic between the two adults; the payoff is the final
     question, where the user considers which of those dynamics they carried
     forward without choosing to. */
  {
    id: 'roots-home',
    moduleId: 'roots',
    kind: 'long-text',
    prompt:
      'Describe an ordinary evening in the home you grew up in, with the adults who raised you both in the room.',
    helper:
      'Not a big occasion — a normal Tuesday. Concrete detail helps more than adjectives.',
    placeholder: 'Where each of them was, what they were doing, what the room was like…',
  },
  {
    id: 'roots-affection',
    moduleId: 'roots',
    kind: 'long-text',
    prompt: 'How did they show affection to each other?',
    helper:
      'Between the two of them, not toward you. Words, touch, teasing, small courtesies — or none of it. All of those are real answers.',
    placeholder: 'What you actually saw pass between them…',
  },
  {
    id: 'roots-conflict',
    moduleId: 'roots',
    kind: 'long-text',
    prompt: 'When they disagreed, what happened?',
    helper: 'Most people can picture this one instantly. Loud, silent, settled, or buried?',
    placeholder: 'How a disagreement between them actually went…',
  },
  {
    id: 'roots-repair',
    moduleId: 'roots',
    kind: 'long-text',
    prompt: 'And afterward — how did they come back to each other, if they did?',
    helper:
      'Repair is the part of partnership most people never got to watch, and the part most couples most need. If you never saw it, that is worth knowing too.',
    placeholder: 'What happened after the disagreement was over…',
  },
  {
    id: 'roots-decisions',
    moduleId: 'roots',
    kind: 'long-text',
    prompt: 'How were decisions made between them — money, work, where to live, how to raise you?',
    helper: 'Who deferred, who decided, and whether it seemed to sit well with both of them.',
    placeholder: 'How the two of them actually ran things…',
  },
  {
    id: 'roots-parent-1-good',
    moduleId: 'roots',
    kind: 'long-text',
    prompt: 'Name some genuinely great qualities in the first of them.',
    helper: 'We start with the good on purpose. Almost everyone brought something real.',
    placeholder: 'What you can honestly admire in them…',
  },
  {
    id: 'roots-parent-1-hard',
    moduleId: 'roots',
    kind: 'long-text',
    prompt:
      'And which of their character or personality traits do you believe were not conducive to a healthy relationship?',
    helper:
      'Traits, not verdicts — and we mean as a partner. This is not an invitation to blame them. It is an invitation to see clearly.',
    placeholder: 'What made partnership harder — for them, or for the person with them…',
  },
  {
    id: 'roots-parent-2-good',
    moduleId: 'roots',
    kind: 'long-text',
    prompt: 'Now the same for the second — the qualities you can genuinely acknowledge.',
    optional: true,
    placeholder: 'What was good in them…',
  },
  {
    id: 'roots-parent-2-hard',
    moduleId: 'roots',
    kind: 'long-text',
    prompt: 'And the traits in them you believe were not conducive to relationship.',
    optional: true,
    placeholder: 'What made partnership harder…',
  },
  {
    id: 'roots-model',
    moduleId: 'roots',
    kind: 'long-text',
    prompt: 'What did their relationship teach you a partnership is supposed to look like?',
    helper:
      'Not what you believe now — what you absorbed then, before anyone asked your opinion.',
    placeholder: 'The picture you ended up with…',
  },
  {
    id: 'roots-inheritance',
    moduleId: 'roots',
    kind: 'long-text',
    prompt:
      'Looking at what you just wrote — do you see any of those same dynamics showing up in how you show up in a relationship now?',
    helper:
      'Almost everyone does, and noticing it is not a failure. It is the first thing that makes it changeable. Many people carry an inherited pattern for years without ever having named it.',
    placeholder: 'Be as honest as you can be today…',
  },

  /* ---------- MODULE 3: PATTERNS ---------- */
  {
    id: 'patterns-loved',
    moduleId: 'patterns',
    kind: 'long-text',
    prompt: 'What traits did you genuinely love in your last partner?',
    placeholder: 'What drew you, and what kept drawing you…',
  },
  {
    id: 'patterns-didnt-support',
    moduleId: 'patterns',
    kind: 'long-text',
    prompt: 'What traits did you discover did not support the relationship?',
    helper: 'Traits, not verdicts. What was hard to live alongside?',
    placeholder: 'What you learned the cost of…',
  },
  {
    id: 'patterns-your-gifts',
    moduleId: 'patterns',
    kind: 'long-text',
    prompt: 'Honestly — what makes you a great partner? What gifts do you bring?',
    helper: 'Being able to name this is not arrogance. A person who can’t name it can’t offer it either.',
    placeholder: 'What someone is genuinely lucky to receive from you…',
  },
  {
    id: 'patterns-your-damage',
    moduleId: 'patterns',
    kind: 'long-text',
    prompt: 'Honestly — what traits in yourself damaged your last relationship?',
    helper: 'This is the hardest question in the method, and the most valuable one. Nobody sees this but you.',
    placeholder: 'What you did, not what was done to you…',
  },
  {
    id: 'patterns-blocks',
    moduleId: 'patterns',
    kind: 'long-text',
    prompt:
      'Are there practices or beliefs that stop you from offering complete trust, love, and honesty?',
    placeholder: 'What you hold back, and what you think it protects…',
  },
  {
    id: 'patterns-conflict-now',
    moduleId: 'patterns',
    kind: 'long-text',
    prompt: 'When you and a partner are in conflict, what do you actually do?',
    helper: 'Not what you believe you should do. What you do at 11pm on a bad night.',
    placeholder: 'Withdraw, escalate, fix, go quiet, leave, over-explain…',
  },

  /* ---------- MODULE 4: HABITS ---------- */
  {
    id: 'habits-supporting',
    moduleId: 'habits',
    kind: 'long-text',
    prompt: 'What daily practices in your life support the love you say you want?',
    placeholder: 'The ordinary things you do that make you better to be near…',
  },
  {
    id: 'habits-reached-for',
    moduleId: 'habits',
    kind: 'long-text',
    prompt: 'And what do you reach for when things get hard?',
    helper:
      'Everyone reaches for something. Work, a screen, a drink, a person, silence, food, the gym. There is no shame in the answer.',
    placeholder: 'What you turn to, honestly…',
  },
  {
    id: 'habits-trigger',
    moduleId: 'habits',
    kind: 'long-text',
    prompt: 'What sets that off? Describe the last time it happened.',
    helper:
      'We ask about the trigger rather than the frequency, because the trigger is the honest measure — and the one you can actually work with.',
    placeholder: 'What happened just before…',
  },
  {
    id: 'habits-cost',
    moduleId: 'habits',
    kind: 'long-text',
    prompt: 'By your own measure — not anyone else’s — is it costing you anything?',
    placeholder: 'Your own honest assessment…',
  },
  {
    id: 'habits-change',
    moduleId: 'habits',
    kind: 'long-text',
    prompt: 'If one habit of yours changed, which one would most change the love in your life?',
    placeholder: 'The one you already know…',
  },
];

export function questionsForModule(moduleId: ModuleId): Question[] {
  return QUESTIONS.filter((q) => q.moduleId === moduleId);
}

export function isQuestionVisible(q: Question, answers: Record<string, string>): boolean {
  if (!q.showIf) return true;
  return answers[q.showIf.questionId] === q.showIf.equals;
}
