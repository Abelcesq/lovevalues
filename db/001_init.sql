-- ============================================================================
-- LOVE VALUES — SCHEMA 001
--
-- This database holds IDENTITY AND BILLING. It does not hold answers, and the
-- point of this file is that it *cannot*.
--
-- Hard rule 8 and open decision 5 both say the privacy wall must be enforced
-- at the data layer rather than promised in prose. Three things enforce it
-- here, and a test in tests/schema.test.mjs checks all three against a live
-- database rather than trusting this comment:
--
--   1. NO UNBOUNDED COLUMN EXISTS. Every character column is varchar(n) with
--      a deliberate n. There is no `text`, no `jsonb`, no array. A module's
--      worth of prose has nowhere to go — it would not fit in any column in
--      any table. This is the structural guarantee, and it is the reason the
--      OAuth token columns are varchar(4096) rather than the `text` the
--      adapter documentation uses: a real token fits comfortably, a person's
--      four modules of answers do not.
--
--   2. THE COLUMN SET IS AN ALLOWLIST. The test enumerates every column in
--      this database and fails on anything it does not recognise. Adding an
--      `answers` table, or a `notes` column to `users`, breaks the build. You
--      have to change the test on purpose, in a diff someone reviews, which
--      is exactly the friction this rule is asking for.
--
--   3. Column names are boring on purpose. Nothing here invites reuse as a
--      general-purpose store.
--
-- CAMELCASE WARNING: the quoted identifiers below ("userId", "emailVerified",
-- "sessionToken", "providerAccountId") are required verbatim by the Auth.js
-- Postgres adapter. They look wrong beside the snake_case columns and they
-- are not a style slip — renaming any of them silently breaks sign-in, with
-- an error that surfaces as "user not found" rather than anything pointing at
-- a column name. Leave them.
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id                SERIAL PRIMARY KEY,
  -- 100 chars is a generous human name and far too small for prose.
  name              VARCHAR(100),
  -- 254 is the maximum length of an email address per RFC 5321.
  email             VARCHAR(254) UNIQUE,
  "emailVerified"   TIMESTAMPTZ,
  -- An avatar URL from an OAuth provider.
  image             VARCHAR(2048),
  -- bcrypt output is always 60 chars. NULL for accounts that only ever sign
  -- in through Google or Meta — those users have no password to steal.
  password_hash     VARCHAR(255),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id                    SERIAL PRIMARY KEY,
  "userId"              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                  VARCHAR(32) NOT NULL,
  provider              VARCHAR(64) NOT NULL,
  "providerAccountId"   VARCHAR(255) NOT NULL,
  -- Bounded deliberately — see note 1 above. Real tokens are well under this.
  refresh_token         VARCHAR(4096),
  access_token          VARCHAR(4096),
  id_token              VARCHAR(4096),
  expires_at            BIGINT,
  token_type            VARCHAR(64),
  scope                 VARCHAR(512),
  session_state         VARCHAR(255),
  UNIQUE (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS sessions (
  id                SERIAL PRIMARY KEY,
  "userId"          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sessionToken"    VARCHAR(255) NOT NULL UNIQUE,
  expires           TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_token (
  identifier        VARCHAR(254) NOT NULL,
  token             VARCHAR(255) NOT NULL,
  expires           TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Billing state. Deliberately separate from `users` so that reading identity
-- never requires reading payment state, and so a future billing change does
-- not touch the table sign-in depends on.
CREATE TABLE IF NOT EXISTS subscriptions (
  id                        SERIAL PRIMARY KEY,
  "userId"                  INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  -- 'trial' | 'monthly' | 'lifetime' | 'none'
  plan                      VARCHAR(32) NOT NULL DEFAULT 'none',
  -- 'active' | 'trialing' | 'past_due' | 'canceled' | 'none'
  status                    VARCHAR(32) NOT NULL DEFAULT 'none',
  trial_ends_at             TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  stripe_customer_id        VARCHAR(255),
  stripe_subscription_id    VARCHAR(255),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS accounts_user_idx      ON accounts("userId");
CREATE INDEX IF NOT EXISTS sessions_user_idx      ON sessions("userId");
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions("userId");
