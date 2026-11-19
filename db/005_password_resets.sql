-- ============================================================================
-- LOVE VALUES — SCHEMA 005: PASSWORD RESETS
--
-- Until now there was no way back. Forget your password and you were locked
-- out permanently — no link, no route, nothing. The only reason it had not
-- surfaced is that the app had one user, who owns the Heroku console. A
-- stranger has no such rescue.
--
-- WHAT IS STORED IS A HASH, NEVER THE TOKEN. The token goes in the email and
-- nowhere else. Stored raw, anyone who could read this table — a backup, a
-- log, a misplaced psql session — could take over every account with a live
-- reset. Hashed, the table is worthless to them: it is the same argument as
-- password_hash in 001, applied to the thing that can REPLACE a password.
--
-- SHA-256 rather than bcrypt here, deliberately. bcrypt is slow on purpose
-- because a password is low-entropy and guessable. These tokens are 32 random
-- bytes; there is nothing to guess, and a slow hash on a public endpoint is
-- an invitation to exhaust the dyno instead.
--
-- Still bounded varchar throughout, so the privacy wall in 001 holds.
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_resets (
  -- 64 hex characters: a SHA-256 digest, exactly.
  token_hash  VARCHAR(64) PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  -- Set when spent. A reset link works ONCE: an email can be forwarded,
  -- quoted in a support thread, or sit in a shared inbox for years.
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_resets_user_idx ON password_resets(user_id);
