-- ============================================================================
-- LOVE VALUES — SCHEMA 007: CONNECTIONS, BLOCKS, REPORTS
--
-- The safety layer for member-to-member contact. It exists BEFORE any member
-- can see another member, and that ordering is the point.
--
-- Taken from the shape already proven in the thedotx members app, where
-- blocking and reporting are not a later addition to a directory — every
-- listing query filters through them, in both directions. Love Values will
-- match people on their values, which is more intimate than a professional
-- directory, so the ordering matters more here, not less.
--
-- Nothing in this file touches the four modules. Hard rule 8 says the
-- compatibility engine sees general traits only, never childhood or
-- past-relationship content, and the structural guarantee still holds: there
-- is no column in this database large enough to hold a person's answers.
-- ============================================================================

-- A connection is DOUBLE CONSENT BY CONSTRUCTION. A request is not a
-- connection; only 'accepted' is. Nothing may message, or see more than a
-- public profile, on the strength of a row that is merely 'pending'.
CREATE TABLE IF NOT EXISTS connections (
  id            SERIAL PRIMARY KEY,
  requester_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 'pending' | 'accepted' | 'declined'
  status        VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at  TIMESTAMPTZ,
  -- One request per direction. Without this, a refused suitor can re-request
  -- endlessly, and "declined" means nothing.
  UNIQUE (requester_id, addressee_id),
  -- Nobody connects to themselves.
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS connections_addressee_idx
  ON connections(addressee_id, status);

-- A block is ONE-SIDED TO CREATE AND TWO-SIDED IN EFFECT. The person who
-- blocks disappears from the blocked person's view as well as the reverse —
-- a block that only mutes leaves the blocker visible to someone they wanted
-- away from, which is the opposite of what they asked for.
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON blocks(blocked_id);

-- A report is a WORKLIST ITEM, not an email someone forgets. It has a status
-- so that "we looked at this" is a fact in the database rather than a memory.
--
-- reporter_id is nullable ON DELETE SET NULL: a person who reports someone
-- and then deletes their account must not take the report with them. The
-- report is about the reported person's conduct and outlives the reporter.
CREATE TABLE IF NOT EXISTS reports (
  id           SERIAL PRIMARY KEY,
  reporter_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reported_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- A fixed category id, not prose. See lib/community.ts.
  reason       VARCHAR(32) NOT NULL,
  -- Bounded like everything else. Enough to say what happened, nowhere near
  -- enough to become a general-purpose store.
  detail       VARCHAR(500),
  -- 'open' | 'reviewing' | 'actioned' | 'dismissed'
  status       VARCHAR(16) NOT NULL DEFAULT 'open',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status, created_at);
