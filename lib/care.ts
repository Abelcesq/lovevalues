/**
 * DUTY OF CARE — distress detection and support routing.
 *
 * This product asks people about childhood, failed relationships, and what they
 * reach for when they are hurting. Some of them will be in real trouble while
 * they answer. This module is the path that puts help in front of them.
 *
 * Three design constraints, each of which is easy to get wrong:
 *
 * 1. IT MUST NOT CRY WOLF. The Roots module asks people to describe the
 *    partnership they grew up watching — how the two adults who raised them
 *    treated each other. Plenty of those answers describe a marriage that did
 *    not work, told plainly and in the past tense. That is the method working,
 *    not a person in trouble. A screen that fires there fires constantly on
 *    ordinary correct input, and users learn within minutes to dismiss it.
 *    So the patterns below key on PRESENT-TENSE RISK, not past-tense history.
 *    "he hits me" is a signal; "they fought constantly" is a normal answer.
 *
 * 2. IT MUST NEVER BLOCK. No modal, no interruption, no deleting or refusing
 *    their text. A dialog that traps someone mid-sentence about their worst
 *    memory is its own harm. The prompt is a quiet card beneath the field that
 *    they can dismiss, and dismissing it is respected.
 *
 * 3. IT MUST NOT PHONE HOME. All screening happens in the browser. Nothing is
 *    transmitted, stored, or logged — not the match, not the level, not the
 *    text. A distress flag is the last thing that should generate a network
 *    request, and a user who suspects it might will simply stop being honest.
 *
 * This is a routing mechanism, not an assessment. It does not measure anyone's
 * risk and must never be described as though it does.
 */

/**
 * The notice shown once, before the first question.
 *
 * CEO-authored, 2026-07-27, revised by him 2026-08-01, and it is canonical —
 * do not paraphrase it, and do not "tighten" it. Its wording is his, including
 * the grammar; it is reproduced exactly as written. It does a specific job the
 * rest of the app cannot: it tells someone *in advance* that feelings may
 * surface, that this is normal, and that asking for help is itself an act of
 * self-love rather than a failure. Every other care surface in this product is
 * reactive; this one is the only one that arrives before anything has gone
 * wrong.
 *
 * ONE THING A FUTURE EDITOR SHOULD KNOW, because it is a real tension and not
 * an oversight: the 2026-08-01 revision leans further into faith than the
 * original did — it now states that God's love is freely given and that a
 * faith-based approach is a powerful perspective. This notice is shown to
 * EVERY user before the first question, including people who hold no faith and
 * before Module 1 has asked them anything about it. Hard rule 7 says faith is
 * honoured deeply for those who hold it and never imposed on those who do not.
 * The CEO was told this and chose this wording deliberately; it is his product
 * and his call. Do not quietly soften it back — if it needs to change, that is
 * a decision for him, not a tidy-up.
 *
 * It deliberately does not live on /support. Someone reaching that page may be
 * in distress right now, and an opening paragraph about "the process of
 * identifying values" would make them read past the thing they came for.
 */
export const PRE_JOURNEY_CARE = `Although this process of identifying values is intended as a discovery and educational tool to discover our values, it may be possible that feelings or insecurities may come up. Be mindful of the feelings and know that feelings regarding our experience are normal. When the feelings become uneasy or too much, know that there are resources to talk to someone that are available now. Please seek professional help if you feel you need to talk to someone. Our goal and purpose is to have you know that faith is not only believing in God but it is also believing and knowing that each of us is loved unconditionally and that God's love is freely given. This is why a faith-based approach to life can be such a powerful perspective. Asking for guidance in moments of sadness, uncomfortable feelings or despair is a concrete way to practice self-love, especially in these moments.`;

export type CareLevel = "none" | "gentle" | "urgent" | "safety";

export type Resource = {
  region: string;
  name: string;
  contact: string;
  detail: string;
  href?: string;
};

/** Immediate-crisis resources. */
export const CRISIS_RESOURCES: Resource[] = [
  {
    region: "United States & Canada",
    name: "988 Suicide & Crisis Lifeline",
    contact: "Call or text 988",
    detail:
      "Free, confidential, 24/7. You do not have to be suicidal to call — distress is enough.",
    href: "https://988lifeline.org",
  },
  {
    region: "United States",
    name: "Crisis Text Line",
    contact: "Text HOME to 741741",
    detail: "If speaking out loud feels like too much, this is text-only.",
    href: "https://www.crisistextline.org",
  },
  {
    region: "United Kingdom & Ireland",
    name: "Samaritans",
    contact: "Call 116 123",
    detail: "Free, 24/7. They will not judge you and they will not rush you.",
    href: "https://www.samaritans.org",
  },
  {
    region: "Anywhere in the world",
    name: "Find a Helpline",
    contact: "findahelpline.com",
    detail:
      "A directory of free, confidential support lines in over 130 countries.",
    href: "https://findahelpline.com",
  },
];

/** Safety resources — for someone who may not be safe with another person. */
export const SAFETY_RESOURCES: Resource[] = [
  {
    region: "United States",
    name: "National Domestic Violence Hotline",
    contact: "Call 1-800-799-7233, or text START to 88788",
    detail:
      "Free and confidential, 24/7. They can talk through options with you — you do not have to have decided anything.",
    href: "https://www.thehotline.org",
  },
  {
    region: "United Kingdom",
    name: "National Domestic Abuse Helpline",
    contact: "Call 0808 2000 247",
    detail: "Free, 24/7, run by Refuge.",
    href: "https://www.nationaldahelpline.org.uk",
  },
  {
    region: "Anywhere in the world",
    name: "Find a Helpline",
    contact: "findahelpline.com",
    detail: "Search by country for domestic-violence and crisis support.",
    href: "https://findahelpline.com",
  },
];

/**
 * Present-tense risk to self. Deliberately high-precision: every pattern here
 * describes something happening now or intended, not something remembered.
 */
const URGENT_PATTERNS: RegExp[] = [
  /\b(kill|killing|hurt|hurting|harm|harming)\s+myself\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend (my life|my own life|it all)\b/i,
  /\btake my own life\b/i,
  /\b(want|wanted|wish|wishing) (to|i could) (die|be dead|not exist|disappear forever)\b/i,
  /\b(don't|do not) want to (live|be here|be alive|wake up|exist)\b/i,
  /\b(everyone|they|you|he|she)('d| would)? (be|are) better off (without me|if i (was|were) (gone|dead))\b/i,
  /\bbetter off dead\b/i,
  /\b(cut|cutting|burn|burning) myself\b/i,
  /\bno reason to (live|go on|keep going)\b/i,
  /\bplan(ning)? to (die|end it)\b/i,
];

/**
 * Present-tense hopelessness. Softer signal, softer response — this offers a
 * door rather than urging someone through it.
 */
const GENTLE_PATTERNS: RegExp[] = [
  /\b(can't|cannot|can not) (go on|keep going|do this anymore|take (it|this) anymore|cope)\b/i,
  /\b(feel|feeling|am) (so |completely |totally )?(hopeless|worthless|empty inside)\b/i,
  /\bnothing (matters|helps|works) anymore\b/i,
  /\bwhat'?s the point (of|in) (anything|living|going on)\b/i,
  /\b(drinking|using) (every day|to cope|to get through)\b/i,
  /\bfalling apart\b/i,
];

/**
 * Present-tense danger from another person. Past-tense forms are deliberately
 * excluded — this module routes people to help, and describing childhood abuse
 * in the past tense is the Roots module doing its job.
 */
const SAFETY_PATTERNS: RegExp[] = [
  /\b(he|she|they|my (partner|husband|wife|boyfriend|girlfriend|ex))\s+(hits|hurts|chokes|threatens|beats|strangles)\s+me\b/i,
  /\b(am|i'?m|feel|feeling)\s+(afraid|scared|terrified)\s+(of|for)\s+(him|her|them|my (partner|husband|wife|boyfriend|girlfriend))\b/i,
  /\b(afraid|scared|frightened) (for|of) my (life|safety)\b/i,
  /\bnot safe (at home|in my home|with (him|her|them))\b/i,
  /\b(won't|will not|does not|doesn't) let me (leave|go|see|have)\b/i,
];

/**
 * Straight-apostrophe every curly variant before matching.
 *
 * This is not cosmetic. iOS, macOS, Word, and — critically — voice dictation
 * all emit U+2019 (’) rather than the ASCII apostrophe. Since this product
 * actively encourages people to speak their answers, curly apostrophes are the
 * COMMON case here, not the edge case. Without this, "he won’t let me leave"
 * silently fails to match while "he won't let me leave" matches, which is the
 * worst possible failure mode: invisible, and biased toward the input method
 * we most want people to use.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ՚`´]/g, "'")
    .replace(/\s+/g, " ");
}

/**
 * Screen a piece of writing for signals that someone may need real human help.
 *
 * Returns a routing level, nothing more. This is not an assessment and carries
 * no judgment about the person — it decides which door to offer, and the user
 * decides whether to walk through it.
 */
export function screenForDistress(text: string): CareLevel {
  /* No meaningful length floor. The shortest disclosures — "he hits me",
     "I want to die" — are the ones that matter most, and an earlier version of
     this function silently ignored both because it required 12 characters. */
  if (!text || text.trim().length < 6) return "none";
  const t = normalize(text);

  if (URGENT_PATTERNS.some((re) => re.test(t))) return "urgent";
  if (SAFETY_PATTERNS.some((re) => re.test(t))) return "safety";
  if (GENTLE_PATTERNS.some((re) => re.test(t))) return "gentle";
  return "none";
}

/** The words shown for each level. Warm, unhurried, and never alarmed. */
export const CARE_COPY: Record<
  Exclude<CareLevel, "none">,
  { title: string; body: string; cta: string }
> = {
  urgent: {
    title: "Before you go any further — please talk to a person.",
    body: "Something you wrote suggests you may be carrying more than anyone should carry alone. This is a piece of software, and there are moments it has no business being the thing you turn to. This is one of them. Nothing here is lost, and you can come back whenever you want.",
    cta: "Find someone to talk to",
  },
  safety: {
    title: "If you are not safe, that comes first.",
    body: "Something you wrote suggests you may not be safe with someone. That matters more than anything on this screen. There are people who will talk it through with you without pushing you toward any decision.",
    cta: "See confidential support",
  },
  gentle: {
    title: "This is heavy. You don’t have to carry it alone.",
    body: "These questions go to tender places, and it is completely reasonable for that to be hard. If it would help to say any of this to an actual person, there are people who will listen — free, confidential, and without judgment.",
    cta: "See who you can talk to",
  },
};
