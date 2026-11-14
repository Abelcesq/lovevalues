/**
 * The member profile: the age gate, and what may be written.
 *
 * WHY THIS FILE EXISTS. This is the first data Love Values stores about a
 * person beyond identity and billing, and it is the data a matching engine
 * will act on. Three things here are not cosmetic:
 *
 *   1. THE AGE GATE. An 18+ product that computes age by dividing elapsed
 *      milliseconds is wrong by a day for everyone born on 29 February and
 *      for everyone else once every four years. At a threshold of exactly 18
 *      that is the difference between admitting a minor and turning away an
 *      adult, so the arithmetic is tested directly at the boundary.
 *
 *   2. THE ALLOWLIST. Anything not on the published list of options is
 *      dropped rather than stored. A free-form value saved here would be the
 *      first unbounded prose in a database whose whole privacy argument is
 *      that prose does not fit anywhere in it.
 *
 *   3. EVERY FIELD IS OPTIONAL EXCEPT THE AGE CHECK. People fill a profile in
 *      over days. A validator that refuses a half-filled save loses the parts
 *      they did write, which is how someone learns not to come back.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVITIES,
  MAX_ABOUT_ME,
  EMPTY_MEMBER_PROFILE,
  GENDERS,
  MAX_ACTIVITIES,
  MIN_AGE,
  RELIGIONS,
  ageOn,
  labelFor,
  missingFields,
  validateProfile,
} from "../lib/memberProfile.ts";

const JUL_1_2026 = new Date(2026, 6, 1);

/* ── The age gate ────────────────────────────────────────────────────────── */

test("age counts birthdays, not elapsed milliseconds", () => {
  assert.equal(ageOn("2000-07-01", JUL_1_2026), 26, "birthday today counts");
  assert.equal(ageOn("2000-07-02", JUL_1_2026), 25, "birthday tomorrow does not");
  assert.equal(ageOn("2000-06-30", JUL_1_2026), 26);
});

test("someone turning 18 today is admitted; a day early is not", () => {
  // The exact boundary this product is legally obliged to get right.
  const turns18Today = validateProfile(
    { dateOfBirth: "2008-07-01" },
    JUL_1_2026,
  );
  assert.equal(turns18Today.ok, true, "18 today must be allowed in");

  const turns18Tomorrow = validateProfile(
    { dateOfBirth: "2008-07-02" },
    JUL_1_2026,
  );
  assert.equal(turns18Tomorrow.ok, false);
  assert.match(
    turns18Tomorrow.ok === false ? turns18Tomorrow.message : "",
    new RegExp(String(MIN_AGE)),
  );
});

test("a 29 February birthday is handled", () => {
  // The case the millisecond-division approach gets wrong.
  assert.equal(ageOn("2004-02-29", new Date(2026, 1, 28)), 21);
  assert.equal(ageOn("2004-02-29", new Date(2026, 2, 1)), 22);
});

test("a date the calendar does not have is refused", () => {
  // new Date(2025, 1, 31) silently becomes 3 March. Stored, that would be a
  // date of birth nobody has.
  assert.equal(ageOn("2025-02-31"), null);
  assert.equal(ageOn("2025-13-01"), null);
  assert.equal(ageOn("not-a-date"), null);
  assert.equal(validateProfile({ dateOfBirth: "2025-02-31" }).ok, false);
});

test("an absurd date of birth is refused", () => {
  assert.equal(validateProfile({ dateOfBirth: "1820-01-01" }).ok, false);
});

test("no date of birth at all is fine", () => {
  // Optional means optional. The gate applies to a date that WAS given.
  const r = validateProfile({ displayName: "Sam" });
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.value.dateOfBirth, "");
});

/* ── What may be stored ──────────────────────────────────────────────────── */

test("a value that is not on the list is dropped, not stored", () => {
  const r = validateProfile({ gender: "<script>alert(1)</script>" });
  assert.equal(r.ok, true, "a stale or hostile value must not fail the save");
  assert.equal(r.ok && r.value.gender, "", "and must not be stored");
});

test("every published option is accepted", () => {
  // Guards the inverse bug: a list the validator silently rejects would make
  // a visible option impossible to choose.
  for (const g of GENDERS) {
    const r = validateProfile({ gender: g.id });
    assert.equal(r.ok && r.value.gender, g.id, `gender ${g.id} must save`);
  }
  for (const rel of RELIGIONS) {
    const r = validateProfile({ religion: rel.id });
    assert.equal(r.ok && r.value.religion, rel.id, `religion ${rel.id} must save`);
  }
});

test("activities are de-duplicated, filtered and capped", () => {
  const r = validateProfile({
    activities: [...ACTIVITIES.map((a) => a.id), "travel", "not-a-real-thing"],
  });
  assert.equal(r.ok, true);
  const got = r.ok ? r.value.activities : [];
  assert.equal(got.length, MAX_ACTIVITIES, "the cap is enforced");
  assert.equal(new Set(got).size, got.length, "no duplicates");
  assert.ok(!got.includes("not-a-real-thing"), "unknown ids dropped");
});

test("long text is truncated rather than rejected", () => {
  // The columns are bounded varchars; a 10,000-character name must not reach
  // Postgres and fail the whole save.
  const r = validateProfile({ displayName: "a".repeat(5000) });
  assert.equal(r.ok, true);
  assert.ok(r.ok && r.value.displayName.length <= 60);
});

test("about me is capped at the column width, not rejected", () => {
  // The column is varchar(400). An untruncated 500-character value would be a
  // Postgres error rather than a message, so the cap happens before the write
  // — and someone who wrote a little too much keeps everything else they
  // filled in rather than losing the save.
  const r = validateProfile({ aboutMe: "x".repeat(900) });
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.value.aboutMe.length, MAX_ABOUT_ME);
});

test("about me stays small enough that answers cannot fit in it", () => {
  // The whole privacy argument in db/001 is that a person's written work does
  // not FIT anywhere in this database. A later "let's make it 4000" would
  // quietly end that, so the ceiling is asserted rather than assumed.
  assert.ok(
    MAX_ABOUT_ME <= 500,
    "a free-text field this big stops being a profile field and starts being a store",
  );
});

test("about me is trimmed and counts toward completeness", () => {
  const r = validateProfile({ aboutMe: "  Hello.  " });
  assert.equal(r.ok && r.value.aboutMe, "Hello.");
  assert.equal(
    missingFields({ ...EMPTY_MEMBER_PROFILE, aboutMe: "Hello." }),
    10,
    "filling about me should reduce the missing count by one",
  );
});

test("matching visibility is opt-in and cannot be set by accident", () => {
  // Being listed to strangers is a separate decision from filling in a
  // profile. Anything other than a literal true means no.
  assert.equal(validateProfile({}).ok && validateProfile({}).value.visibleInMatching, false);
  for (const sneaky of ["true", 1, "yes", {}]) {
    const r = validateProfile({ visibleInMatching: sneaky });
    assert.equal(r.ok && r.value.visibleInMatching, false, `${JSON.stringify(sneaky)} is not consent`);
  }
  const yes = validateProfile({ visibleInMatching: true });
  assert.equal(yes.ok && yes.value.visibleInMatching, true);
});

test("the validator returns a clean value, never the input", () => {
  const r = validateProfile({ city: "  Los Angeles  ", country: " USA " });
  assert.equal(r.ok && r.value.city, "Los Angeles");
  assert.equal(r.ok && r.value.country, "USA");
});

test("rubbish input does not throw", () => {
  for (const junk of [{}, { activities: "travel" }, { gender: 7 }, { city: null }]) {
    assert.doesNotThrow(() => validateProfile(junk));
  }
});

/* ── The lists themselves ────────────────────────────────────────────────── */

test("activity ids are unique", () => {
  // Ids are stored. Two activities sharing one would silently merge, and a
  // member who picked one would find they had picked the other.
  const ids = ACTIVITIES.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every identity question offers a way to decline", () => {
  // Hard rule 7 in practice: a person who must name a religion to continue
  // has been told something about this product.
  assert.ok(
    GENDERS.some((g) => g.id === "unsaid"),
    "gender needs a prefer-not-to-say",
  );
  assert.ok(
    RELIGIONS.some((r) => r.id === "unsaid"),
    "religion needs a prefer-not-to-say",
  );
  assert.ok(
    RELIGIONS.some((r) => r.id === "none"),
    "'not religious' must sit in the same list as every faith",
  );
});

test("labels resolve, and an unknown id resolves to nothing", () => {
  assert.equal(labelFor(GENDERS, "woman"), "Woman");
  assert.equal(labelFor(GENDERS, "nonsense"), "");
});

test("an empty profile is counted as entirely incomplete", () => {
  assert.equal(missingFields(EMPTY_MEMBER_PROFILE), 11);
  assert.equal(
    missingFields({ ...EMPTY_MEMBER_PROFILE, city: "Pasadena" }),
    10,
  );
});
