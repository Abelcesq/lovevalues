/**
 * Duty-of-care screening tests.
 *
 * The single most important property here is the FALSE-POSITIVE suite below.
 * The Roots module asks people to describe the partnership they grew up
 * watching — how the two adults who raised them treated each other. Many of
 * those answers describe a marriage that plainly did not work. That is the
 * method working, not a person in trouble. If the screen fires on that
 * material it fires constantly on ordinary correct input — users learn within
 * minutes to dismiss it, and the one time it matters it gets dismissed too.
 *
 * A false positive is not a harmless over-caution here. It is the mechanism by
 * which the real signal stops working.
 *
 * Run: npm test
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { screenForDistress } from '../lib/care.ts';

/* ------------------------------------------------------------------ *
 * MUST NOT FIRE — neutral, and painful history told in the past tense.
 * Every one of these is the method working correctly.
 * ------------------------------------------------------------------ */

const MUST_BE_SILENT = [
  // --- Ordinary neutral answers ---
  'We ate dinner together most nights. My mom cooked, my dad worked late, and the TV was always on in the background.',
  'Affection was shown through provision more than words. Nobody said I love you, but the fridge was always full.',
  'Faith matters a lot to me. I grew up in the church and it still grounds how I make decisions.',
  'I bring loyalty and a genuinely good sense of humor. People feel comfortable around me.',
  'I go to the gym most mornings and I read before bed. Those two things keep me steady.',

  // --- The actual shape of Module 2 answers: the parents' partnership,
  //     observed and described. Difficult marriages are a normal answer here. ---
  'They barely spoke to each other. Dinner was the two of them and the sound of forks.',
  'My parents fought constantly. It was loud and it was every week, and then it was over and nobody mentioned it.',
  'They never fought in front of us, which I now think was its own problem — I never once saw them repair anything.',
  'My mother deferred to my father on everything, including things she clearly knew more about.',
  'He was generous with everyone outside the house and short with her inside it.',
  'They stayed together for us. You could feel that they had stopped choosing each other years earlier.',
  'She criticized him in front of company. He would just go quiet and take it.',
  'My dad shut down whenever she raised anything. Days of silence, then it was like nothing happened.',
  'Money was the thing they fought about. He controlled it and she resented it.',
  'They were affectionate — he still opened the car door for her after thirty years. That set a bar for me.',
  'Traits that were not conducive: his temper, and her habit of keeping score for years.',
  'What their relationship taught me is that partnership means one person accommodates and the other decides.',
  'I see it in myself now. I go quiet exactly the way he did, and I hate that I do it.',

  // --- Volunteered past-tense difficulty. Not asked for, still must stay silent. ---
  'My father hit me when he drank. He was a different person sober, and I spent a lot of my childhood watching which one walked through the door.',
  'My mother was cold. She never hurt me physically but I do not remember her ever holding me.',
  'When my parents disagreed, the house went completely silent for days. I learned to make myself very small.',
  'My dad had a temper that scared me. He also taught me to fish and never missed a game. Both of those are true.',
  'I was afraid of him growing up. I am not anymore — he is older now and we are actually okay.',
  'My parents divorced when I was nine and I blamed myself for years.',
  'There was a period where my mom drank every day. It got better when I was in high school.',
  'I felt worthless as a kid. My father made sure I knew I was a disappointment.',
  'I used to want to disappear when they fought. I would hide in the closet until it was over.',
  'Growing up I felt hopeless about ever getting out of that town.',
  'He hit me once, near the end. That was when I finally left.',
  'My ex threatened me during the breakup. It has been three years and I have moved on.',
  'I was not safe in that house as a child. My grandmother eventually took me in.',

  // --- Relationship failure, honestly told. Module 3 working. ---
  'I withdraw in silence when I am hurt. It destroyed my last relationship and I know it.',
  'I cheated. I have never fully forgiven myself for it, but I understand now why I did it.',
  'She said I was emotionally unavailable and she was completely right.',
  'What damaged it was my temper. I would go cold and punish her with silence for days.',
  'I could not give him complete trust because my first husband lied to me for years.',
  'I drank a lot during that relationship. I have not had a drink in two years.',
  'I fell apart after the divorce. Therapy helped more than I expected.',

  // --- Habits module, honestly told ---
  'When things get hard I reach for work. I will put in fourteen hour days rather than sit with a feeling.',
  'I go quiet and scroll my phone for hours. It costs me presence with the people I love.',
  'Honestly, I drink two glasses of wine most evenings. By my own measure it is not costing me anything yet.',

  // --- Short or empty ---
  '',
  '   ',
  'Yes',
  'Trust',
];

test('never fires on ordinary Roots answers or past-tense history', () => {
  const misfires = MUST_BE_SILENT.filter((text) => screenForDistress(text) !== 'none').map(
    (text) => `  [${screenForDistress(text)}] ${text.slice(0, 80)}…`,
  );

  assert.equal(
    misfires.length,
    0,
    `Screening fired on ${misfires.length} answer(s) it must stay silent on.\n` +
      `Each of these is a user telling the truth about their history — which is the ` +
      `entire point of the method.\n\n${misfires.join('\n')}\n`,
  );
});

/* ------------------------------------------------------------------ *
 * MUST FIRE — present-tense risk.
 * ------------------------------------------------------------------ */

test('fires on present-tense risk to self', () => {
  const cases = [
    'I have been thinking about killing myself.',
    'Some days I do not want to be here anymore.',
    'I think everyone would be better off without me.',
    'I want to die.',
    'I have been hurting myself again.',
    'There is no reason to go on.',
    'I keep thinking about how to end my life.',
  ];
  for (const text of cases) {
    assert.equal(screenForDistress(text), 'urgent', `should be urgent: ${text}`);
  }
});

test('fires on present-tense danger from another person', () => {
  const cases = [
    'He hits me when he has been drinking.',
    'My husband threatens me if I talk about leaving.',
    'I am scared of him.',
    'I am not safe at home right now.',
    'He won’t let me leave the house.',
  ];
  for (const text of cases) {
    assert.equal(screenForDistress(text), 'safety', `should be safety: ${text}`);
  }
});

test('offers a gentle door on present-tense hopelessness', () => {
  const cases = [
    'I cannot do this anymore. Every day is the same.',
    'I feel completely hopeless about all of it.',
    'Nothing matters anymore, honestly.',
    'I am drinking every day just to get through it.',
  ];
  for (const text of cases) {
    assert.equal(screenForDistress(text), 'gentle', `should be gentle: ${text}`);
  }
});

/* ------------------------------------------------------------------ *
 * The distinction that matters most: same event, different tense.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Regressions. Each of these shipped broken and was caught by this file.
 * ------------------------------------------------------------------ */

test('regression: curly apostrophes are matched (dictation and iOS emit U+2019)', () => {
  // The input method this product actively promotes is the one that produces
  // curly apostrophes. A straight-quote-only regex silently failed here.
  assert.equal(screenForDistress('He won’t let me leave the house.'), 'safety');
  assert.equal(screenForDistress('I can’t do this anymore, honestly.'), 'gentle');
  assert.equal(screenForDistress('I don’t want to be here anymore.'), 'urgent');
});

test('regression: very short disclosures are not skipped by a length floor', () => {
  // An earlier length guard of 12 characters silently ignored both of these.
  assert.equal(screenForDistress('He hits me.'), 'safety');
  assert.equal(screenForDistress('I want to die'), 'urgent');
});

test('regression: negations spelled out in full are matched', () => {
  assert.equal(screenForDistress('I do not want to be here anymore.'), 'urgent');
  assert.equal(screenForDistress('I cannot do this anymore.'), 'gentle');
});

test('separates past pain from present risk on otherwise identical sentences', () => {
  const pairs = [
    ['He hit me.', 'He hits me.'],
    ['I was afraid of him.', 'I am afraid of him.'],
    ['I wanted to disappear when I was a kid.', 'I want to die.'],
  ];

  for (const [past, present] of pairs) {
    assert.equal(screenForDistress(past), 'none', `past tense must stay silent: ${past}`);
    assert.notEqual(screenForDistress(present), 'none', `present tense must fire: ${present}`);
  }
});
