-- Run this once against your Neon/Postgres database to set up all tables.
-- better-auth creates its own tables (user, session, account, verification)
-- via its own migration — run `npx better-auth migrate` from apps/api first.

CREATE TABLE IF NOT EXISTS wallets (
  user_id   TEXT PRIMARY KEY,
  balance   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS errands (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT NOT NULL DEFAULT 'Shopping',
  budget           NUMERIC(12, 2) NOT NULL,
  fee              NUMERIC(12, 2) NOT NULL,
  sender_id        TEXT NOT NULL,
  agent_id         TEXT,
  pickup_location  TEXT,
  delivery_location TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | in_progress | completed | confirmed | disputed
  proof_image_url  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id   TEXT NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL,
  type        TEXT NOT NULL,   -- deposit | withdrawal | escrow_hold | payment_release | dispute_refund
  errand_id   UUID REFERENCES errands(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on errands
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS errands_updated_at ON errands;
CREATE TRIGGER errands_updated_at
  BEFORE UPDATE ON errands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- M-Pesa pending STK push requests
CREATE TABLE IF NOT EXISTS mpesa_requests (
  checkout_request_id TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  amount              NUMERIC(12, 2) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_agent BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS agent_applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL UNIQUE,
  id_image_url     TEXT NOT NULL,
  selfie_image_url TEXT NOT NULL,
  mpesa_number     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS agent_applications_updated_at ON agent_applications;
CREATE TRIGGER agent_applications_updated_at
  BEFORE UPDATE ON agent_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
