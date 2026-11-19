-- ============================================================================
-- LOVE VALUES — SCHEMA 006: REPORT CREDITS
--
-- The right to generate one reflection, recorded on the server.
--
-- It lived in the browser (lib/reports.ts, which says so at the top): the
-- $29.99 report was unlocked by a value in localStorage, which anyone could
-- set from devtools in about four seconds. That was an honest MVP position
-- while nothing could verify a payment. The Stripe webhook can now, so the
-- entitlement belongs where the money is confirmed.
--
-- ONE ROW PER PURCHASE, consumed once. Not a counter on the user: a counter
-- cannot say which payment paid for what, cannot be reconciled against
-- Stripe, and quietly loses an increment if two webhook deliveries race.
--
-- stripe_session_id IS UNIQUE, and that is what makes the webhook safe to
-- retry. Stripe delivers at least once and will resend the same event after a
-- timeout; without this, one payment could mint two credits.
-- ============================================================================

CREATE TABLE IF NOT EXISTS report_credits (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 'first' | 'update' — what was charged, for reconciliation.
  kind              VARCHAR(16) NOT NULL DEFAULT 'first',
  -- 'paid' | 'unconfigured' — see lib/reports.ts. A grant made because
  -- Stripe is not switched on must never be counted as revenue.
  reason            VARCHAR(16) NOT NULL DEFAULT 'paid',
  -- The Checkout Session that paid for it. UNIQUE so a redelivered webhook
  -- cannot mint a second credit for one payment.
  stripe_session_id VARCHAR(255) UNIQUE,
  granted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS report_credits_user_idx
  ON report_credits(user_id, consumed_at);
