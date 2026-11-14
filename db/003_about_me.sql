-- ============================================================================
-- LOVE VALUES — SCHEMA 003: ABOUT ME
--
-- The first free-text column in this database, added deliberately and argued
-- for rather than slipped in (CEO, 2026-11-14). db/002 left it out on purpose
-- and said why: a free-text "about me" is the single most natural place for
-- the privacy wall to erode. That objection has not gone away, so the column
-- is built to make the erosion impossible rather than merely discouraged.
--
--   · varchar(400), not text, not varchar(4000). Four hundred characters is a
--     real paragraph and a half — enough to say something true about yourself,
--     and nowhere near enough to hold a module of answers. The guarantee in
--     001 is that a person's written work does not FIT anywhere in this
--     database, and 400 keeps that true.
--
--   · It is the ONLY free-text column, and it should stay that way. A second
--     one is how a bounded schema becomes a general-purpose store.
--
--   · It is a profile field, not a journal. The four modules stay in the
--     browser. Nothing in the app may copy an answer into here, and nothing
--     should ever offer to.
--
-- Anyone adding a third free-text column: read 001's header first, then say
-- in the migration why the thing you are storing cannot be bounded.
-- ============================================================================

ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS about_me VARCHAR(400);
