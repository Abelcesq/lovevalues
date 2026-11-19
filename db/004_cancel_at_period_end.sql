-- ============================================================================
-- LOVE VALUES — SCHEMA 004: CANCEL AT PERIOD END
--
-- Stripe distinguishes two things this database could not:
--
--   canceled                     — over now, access ends immediately
--   active + cancel_at_period_end — paid until a date, then it stops
--
-- Without the second, a member who cancels on day 3 of a paid month either
-- loses access they paid for or appears to be billed forever, depending on
-- which way the status is read. The billing model in lib/plan.ts is explicit
-- that time already paid for is always honoured, and this column is what lets
-- the app keep that promise.
--
-- Mirrored FROM Stripe by the webhook, never set by us from our own cancel
-- action: a cancellation can also happen in Stripe's own customer portal,
-- where this app never sees the click. Learned from the EZAITASK build, whose
-- billing UI depends on the same flag for its "ends on / reactivate" state.
-- ============================================================================

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;
