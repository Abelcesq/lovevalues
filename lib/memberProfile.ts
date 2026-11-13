/**
 * THE MEMBER PROFILE — the one definition of what a profile is.
 *
 * The form renders from these lists, the API validates against them, and a
 * matcher will compare against them. Three copies of "what counts as a
 * relationship type" would drift within a month, and the symptom would be a
 * value that saves fine and then silently never matches anything.
 *
 * No 'use client' and no server-only import, on purpose: this file is read on
 * both sides. Keep it that way — a database import here would break the form.
 *
 * ON THE WORDING OF THE OPTIONS. These are read by someone deciding whether
 * this product is for them, often in the first two minutes. Three rules:
 *
 *   · Every list that touches identity has a way to decline. "Prefer not to
 *     say" is a real answer, not a gap, and a person who is made to pick a
 *     religion to continue has been told something about the product.
 *   · Hard rule 7 applies directly to `RELIGIONS`: faith is honoured for
 *     those who hold it and never imposed on those who do not, so "not
 *     religious" sits in the same list as every faith, in the same type.
 *   · Gender is a short list with an open option rather than two boxes. The
 *     cost of the longer list is nothing; the cost of the short one is a
 *     person closing the tab.
 */

export type Option = { id: string; label: string };

/** How a member describes themselves. */
export const GENDERS: Option[] = [
  { id: "woman", label: "Woman" },
  { id: "man", label: "Man" },
  { id: "non-binary", label: "Non-binary" },
  { id: "other", label: "Another way" },
  { id: "unsaid", label: "Prefer not to say" },
];

/** Who they are hoping to meet. Deliberately includes "anyone". */
export const SEEKING: Option[] = [
  { id: "women", label: "Women" },
  { id: "men", label: "Men" },
  { id: "non-binary", label: "Non-binary people" },
  { id: "anyone", label: "Anyone" },
];

export const RELATIONSHIP_TYPES: Option[] = [
  { id: "long-term", label: "Long-term relationship" },
  { id: "friends", label: "Friendship" },
  { id: "casual", label: "Something casual" },
  { id: "unsure", label: "Still working that out" },
];

export const WANTS_CHILDREN: Option[] = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "undecided", label: "Undecided" },
  { id: "have-and-want-more", label: "I have children and want more" },
  { id: "have-and-done", label: "I have children and am not having more" },
];

/**
 * Faith. Ordered by rough global size rather than by any judgement, with the
 * two non-answers at the end where someone will look for them.
 *
 * "Spiritual but not religious" and "Not religious" are both here because
 * they are genuinely different answers to this question, and a product that
 * collapses them has already misread a large part of its audience.
 */
export const RELIGIONS: Option[] = [
  { id: "christian", label: "Christian" },
  { id: "catholic", label: "Catholic" },
  { id: "muslim", label: "Muslim" },
  { id: "hindu", label: "Hindu" },
  { id: "buddhist", label: "Buddhist" },
  { id: "jewish", label: "Jewish" },
  { id: "sikh", label: "Sikh" },
  { id: "spiritual", label: "Spiritual, not religious" },
  { id: "other", label: "Another faith" },
  { id: "none", label: "Not religious" },
  { id: "unsaid", label: "Prefer not to say" },
];

/**
 * Things people do, grouped so a long list stays scannable.
 *
 * Ids are stable and stored; labels can be reworded freely. Never reuse an id
 * for a different thing — a member who picked "art" should not wake up having
 * picked something else.
 */
export const ACTIVITY_GROUPS: { group: string; items: Option[] }[] = [
  {
    group: "Active",
    items: [
      { id: "sports", label: "Sports" },
      { id: "gym", label: "Gym & fitness" },
      { id: "running", label: "Running" },
      { id: "hiking", label: "Hiking" },
      { id: "cycling", label: "Cycling" },
      { id: "yoga", label: "Yoga" },
      { id: "baseball", label: "Baseball" },
      { id: "basketball", label: "Basketball" },
      { id: "football", label: "Football" },
      { id: "golf", label: "Golf" },
      { id: "swimming", label: "Swimming" },
      { id: "fishing", label: "Fishing" },
      { id: "camping", label: "Camping" },
    ],
  },
  {
    group: "Creative",
    items: [
      { id: "music", label: "Music" },
      { id: "live-music", label: "Live music" },
      { id: "art", label: "Art" },
      { id: "painting", label: "Painting" },
      { id: "photography", label: "Photography" },
      { id: "writing", label: "Writing" },
      { id: "dance", label: "Dancing" },
      { id: "theatre", label: "Theatre" },
      { id: "film", label: "Film" },
      { id: "reading", label: "Reading" },
    ],
  },
  {
    group: "Together",
    items: [
      { id: "dining", label: "Dining out" },
      { id: "cooking", label: "Cooking" },
      { id: "coffee", label: "Coffee" },
      { id: "travel", label: "Travel" },
      { id: "museums", label: "Museums" },
      { id: "volunteering", label: "Volunteering" },
      { id: "faith-community", label: "Faith community" },
      { id: "family-time", label: "Family time" },
      { id: "board-games", label: "Board games" },
      { id: "gardening", label: "Gardening" },
      { id: "animals", label: "Animals & pets" },
      { id: "learning", label: "Learning something new" },
    ],
  },
];

export const ACTIVITIES: Option[] = ACTIVITY_GROUPS.flatMap((g) => g.items);

/** The most activities one member may choose. A profile where everything is
    ticked says nothing, and an unbounded list is an unbounded write. */
export const MAX_ACTIVITIES = 12;

/** The minimum age to hold a profile. Not negotiable and not configurable. */
export const MIN_AGE = 18;

export type MemberProfile = {
  displayName: string;
  gender: string;
  seeking: string;
  city: string;
  country: string;
  /** ISO yyyy-mm-dd, or "" if not given. Never an age — see db/002. */
  dateOfBirth: string;
  religion: string;
  relationshipType: string;
  wantsChildren: string;
  activities: string[];
  visibleInMatching: boolean;
};

export const EMPTY_MEMBER_PROFILE: MemberProfile = {
  displayName: "",
  gender: "",
  seeking: "",
  city: "",
  country: "",
  dateOfBirth: "",
  religion: "",
  relationshipType: "",
  wantsChildren: "",
  activities: [],
  visibleInMatching: false,
};

/**
 * Whole years old on a given day.
 *
 * Counts birthdays rather than dividing elapsed milliseconds: a year is not a
 * fixed number of days, and the division approach puts people born on 29
 * February a day out and everyone else a day out once every four years. At a
 * threshold of exactly 18 that is the difference between admitting a minor
 * and turning away an adult.
 */
export function ageOn(dateOfBirth: string, today = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  /* Reject a date the calendar does not have — 31 February parses happily in
     a Date and silently becomes 3 March. */
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== mo - 1 ||
    probe.getUTCDate() !== d
  ) {
    return null;
  }

  let age = today.getFullYear() - y;
  const hadBirthday =
    today.getMonth() + 1 > mo ||
    (today.getMonth() + 1 === mo && today.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

const idsOf = (list: Option[]) => new Set(list.map((o) => o.id));
const GENDER_IDS = idsOf(GENDERS);
const SEEKING_IDS = idsOf(SEEKING);
const RELIGION_IDS = idsOf(RELIGIONS);
const RELATIONSHIP_IDS = idsOf(RELATIONSHIP_TYPES);
const CHILDREN_IDS = idsOf(WANTS_CHILDREN);
const ACTIVITY_IDS = idsOf(ACTIVITIES);

export type Validation =
  | { ok: true; value: MemberProfile }
  | { ok: false; field: keyof MemberProfile; message: string };

/**
 * Clean and check one submitted profile.
 *
 * EVERY FIELD IS OPTIONAL EXCEPT THE AGE CHECK. A half-filled profile is a
 * normal state — someone fills this in over days — and a form that refuses to
 * save until it is complete loses the parts they did write. The one thing
 * that is never optional is that a date of birth, IF GIVEN, belongs to an
 * adult.
 *
 * Returns a cleaned value rather than mutating: the caller writes exactly
 * what comes back, never what came in.
 */
export function validateProfile(
  raw: Partial<MemberProfile>,
  today = new Date(),
): Validation {
  const str = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";

  const oneOf = (v: unknown, ids: Set<string>) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s && ids.has(s) ? s : "";
  };

  const dateOfBirth = str(raw.dateOfBirth, 10);
  if (dateOfBirth) {
    const age = ageOn(dateOfBirth, today);
    if (age === null) {
      return {
        ok: false,
        field: "dateOfBirth",
        message: "That date doesn’t look right. Please use the date picker.",
      };
    }
    if (age < MIN_AGE) {
      return {
        ok: false,
        field: "dateOfBirth",
        message: `You need to be ${MIN_AGE} or over to use Love Values.`,
      };
    }
    if (age > 120) {
      return {
        ok: false,
        field: "dateOfBirth",
        message: "That date of birth doesn’t look right.",
      };
    }
  }

  /* Unknown ids are dropped rather than rejected. A stale tab posting an
     activity that has since been renamed should not fail someone's whole
     save, and an id that is not on the list cannot mean anything downstream
     anyway. */
  const activities = Array.isArray(raw.activities)
    ? Array.from(
        new Set(
          raw.activities
            .filter((a): a is string => typeof a === "string")
            .map((a) => a.trim())
            .filter((a) => ACTIVITY_IDS.has(a)),
        ),
      ).slice(0, MAX_ACTIVITIES)
    : [];

  return {
    ok: true,
    value: {
      displayName: str(raw.displayName, 60),
      gender: oneOf(raw.gender, GENDER_IDS),
      seeking: oneOf(raw.seeking, SEEKING_IDS),
      city: str(raw.city, 80),
      country: str(raw.country, 60),
      dateOfBirth,
      religion: oneOf(raw.religion, RELIGION_IDS),
      relationshipType: oneOf(raw.relationshipType, RELATIONSHIP_IDS),
      wantsChildren: oneOf(raw.wantsChildren, CHILDREN_IDS),
      activities,
      visibleInMatching: raw.visibleInMatching === true,
    },
  };
}

/** Turn a stored id back into something to read. */
export function labelFor(list: Option[], id: string): string {
  return list.find((o) => o.id === id)?.label ?? "";
}

/** Which of the listed fields are still blank, for the "complete your
    profile" nudge. Activities count as one. */
export function missingFields(p: MemberProfile): number {
  const checks = [
    p.displayName,
    p.gender,
    p.seeking,
    p.city,
    p.country,
    p.dateOfBirth,
    p.religion,
    p.relationshipType,
    p.wantsChildren,
    p.activities.length ? "x" : "",
  ];
  return checks.filter((c) => !c).length;
}
