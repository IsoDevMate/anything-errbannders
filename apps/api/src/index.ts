import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import errandsRouter from './routes/errands';
import walletRouter from './routes/wallet';
import sessionRouter from './routes/session';
import agentRouter from './routes/agent';
import reviewsRouter from './routes/reviews';
import sql, { execRaw } from './db';

const app = express();
const PORT = process.env.PORT ?? 3001;

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Always allow: Expo Go / mobile clients, empty Origin, and any configured hosts.
      // A strict allowlist was rejecting real clients when ALLOWED_ORIGINS was set on Render.
      if (
        !origin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin)
      ) {
        return cb(null, true);
      }
      // Still allow unknown origins for this API (public mobile backend)
      return cb(null, true);
    },
    credentials: true,
  })
);

// better-auth handles its own body parsing — mount BEFORE express.json()
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

app.use('/api/errands', errandsRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/session', sessionRouter);
app.use('/api/agent', agentRouter);
app.use('/api/reviews', reviewsRouter);

app.get('/health', (_req, res) => res.json({ ok: true, db: 'ready' }));

// Admin panel — approve/reject agents (password = ADMIN_SECRET)
const publicDir = path.join(__dirname, '..', 'public');
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});
app.use('/admin', express.static(publicDir));

// Swagger UI — accessible at /api/docs
const swaggerDocument = YAML.load(path.join(__dirname, 'openapi.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

async function ensureSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "user" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      emailVerified INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      is_agent INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      expiresAt TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      ipAddress TEXT,
      userAgent TEXT,
      userId TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      accountId TEXT NOT NULL,
      providerId TEXT NOT NULL,
      userId TEXT NOT NULL,
      accessToken TEXT,
      refreshToken TEXT,
      idToken TEXT,
      accessTokenExpiresAt TEXT,
      refreshTokenExpiresAt TEXT,
      scope TEXT,
      password TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT,
      updatedAt TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS wallets (
      user_id TEXT PRIMARY KEY,
      balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS errands (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'Shopping',
      budget REAL NOT NULL,
      fee REAL NOT NULL,
      sender_id TEXT NOT NULL,
      agent_id TEXT,
      pickup_location TEXT,
      delivery_location TEXT,
      pickup_lat REAL,
      pickup_lng REAL,
      delivery_lat REAL,
      delivery_lng REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      proof_image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      wallet_id TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      errand_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS agent_applications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL UNIQUE,
      id_image_url TEXT NOT NULL,
      selfie_image_url TEXT NOT NULL,
      mpesa_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS mpesa_requests (
      checkout_request_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS errand_locations (
      errand_id TEXT PRIMARY KEY,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      errand_id TEXT,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      rating REAL NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ];

  for (const statement of statements) {
    await execRaw(statement);
  }

  // Safe additive columns for older DBs
  const alters = [
    `ALTER TABLE "user" ADD COLUMN is_agent INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE errands ADD COLUMN pickup_lat REAL`,
    `ALTER TABLE errands ADD COLUMN pickup_lng REAL`,
    `ALTER TABLE errands ADD COLUMN delivery_lat REAL`,
    `ALTER TABLE errands ADD COLUMN delivery_lng REAL`,
  ];
  for (const statement of alters) {
    try {
      await execRaw(statement);
    } catch {
      // column already exists
    }
  }

  console.log('Schema ready');
}

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to init schema:', err);
    process.exit(1);
  });

export default app;
