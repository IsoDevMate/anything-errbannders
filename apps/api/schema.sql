-- Run once against your Turso database:
--   turso db shell <db-name> < schema.sql
--
-- better-auth creates its own tables (user, session, account, verification)
-- via: npx better-auth migrate   (from apps/api)

CREATE TABLE IF NOT EXISTS wallets (
  user_id    TEXT PRIMARY KEY,
  balance    REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS errands (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title             TEXT NOT NULL,
  description       TEXT,
  category          TEXT NOT NULL DEFAULT 'Shopping',
  budget            REAL NOT NULL,
  fee               REAL NOT NULL,
  sender_id         TEXT NOT NULL,
  agent_id          TEXT,
  pickup_location   TEXT,
  delivery_location TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  proof_image_url   TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  wallet_id  TEXT NOT NULL,
  amount     REAL NOT NULL,
  type       TEXT NOT NULL,
  errand_id  TEXT REFERENCES errands(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_applications (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id          TEXT NOT NULL UNIQUE,
  id_image_url     TEXT NOT NULL,
  selfie_image_url TEXT NOT NULL,
  mpesa_number     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mpesa_requests (
  checkout_request_id TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  amount              REAL NOT NULL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add is_agent column to better-auth user table if not exists
-- Run this separately after better-auth migrate:
-- ALTER TABLE user ADD COLUMN is_agent INTEGER NOT NULL DEFAULT 0;
