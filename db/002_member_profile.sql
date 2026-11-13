-- ============================================================================
-- LOVE VALUES — SCHEMA 002: THE MEMBER PROFILE
--
-- The first data this product stores about a person beyond identity and
-- billing, and it exists because of a direction decision: members will be
-- matched to each other on their values (CEO, 2026-11-13). Matching is
-- impossible against data that lives only in one person's browser, so a
-- profile has to be on the server. The answers do not, and still are not.
--
-- THE LINE THIS FILE DRAWS, which is hard rule 8 made physical:
--
--   ON THE SERVER (here): who you are and what you are looking for — the
--   facts you would tell a stranger across a table in the first five minutes.
--
--   NEVER ON THE SERVER: anything written in the four modules. Your values
--   work, your parents' marriage, your last relationship, your habits, your
--   reflection. Those stay in your browser.
--
-- Every guarantee in 001 still holds and was checked against this file:
--
--   1. NO UNBOUNDED COLUMN. Every character column is varchar(n) with a
--      deliberate n, and the largest here is 80. There is no text, no jsonb,
--      no array. A module's worth of prose does not fit anywhere in this
--      database, which is the structural reason the privacy wall holds rather
--      than merely being promised.
--
--      This is also why `activities` is its own table rather than an array or
--      a comma-joined string. A varchar(40) per row cannot be made to hold a
--      paragraph; a varchar(1000) list could.
--
--      It is why there is NO BIO COLUMN. A free-text "about me" is the single
--      most natural place for this wall to erode, and nobody asked for one.
--      If one is ever added it should be a tight varchar and a deliberate
--      decision, not a convenience.
--
--   2. THE COLUMN SET IS STILL AN ALLOWLIST. tests/schema.test.mjs enumerates
--      every column in the database and fails on anything it does not know.
--      These tables were added to that list on purpose, in a reviewable diff.
--
--   3. VALUES ARE VALIDATED IN lib/memberProfile.ts, NOT BY CHECK CONSTRAINTS.
--      One list of genders or religions, shared by the form, the API and any
--      future matcher, beats the same list in three places plus a migration
--      every time it grows. The columns stay bounded; what may go in them is
--      one TypeScript module.
-- ============================================================================

CREATE TABLE IF NOT EXISTS member_profiles (
  -- The user IS the key. One profile per account, gone when the account is.
  user_id             INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- What other members would see. Separate from users.name, which is the
  -- billing name: plenty of people will not want their surname on a dating
  -- profile, and that is a reasonable thing to want.
  display_name        VARCHAR(60),

  gender              VARCHAR(32),
  seeking             VARCHAR(32),

  city                VARCHAR(80),
  country             VARCHAR(60),

  -- Stored as a date, never as an age. An age is wrong within a year of
  -- being written and there is no way to tell when it went stale.
  -- Eighteen-or-over is enforced in lib/memberProfile.ts on every write.
  date_of_birth       DATE,

  religion            VARCHAR(64),
  relationship_type   VARCHAR(32),
  wants_children      VARCHAR(16),

  -- Nobody is matchable until they say so. Defaults to FALSE, so filling in a
  -- profile is never the same act as agreeing to be shown to strangers.
  visible_in_matching BOOLEAN NOT NULL DEFAULT FALSE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_activities (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- An id from the fixed list in lib/memberProfile.ts, e.g. 'travel'.
  activity  VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id, activity)
);

-- Matching will ask "who else is near this person", so the lookup it will do
-- most is worth an index now while the table is empty.
CREATE INDEX IF NOT EXISTS member_profiles_location_idx
  ON member_profiles (country, city);
