# ErrandEconomy API — Backend README

## Overview

REST API for the ErrandEconomy app. Built with **Express + TypeScript**, uses **Turso (libSQL/SQLite)** as the database, **better-auth** for authentication, and **M-Pesa Daraja** for mobile payments.

**Base URL:** `http://localhost:3001`

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | Express 4 |
| Language | TypeScript 5 |
| Database | Turso (libSQL) via `@libsql/client` |
| Auth | better-auth 1.2.9 (email/password + Bearer token) |
| Payments | M-Pesa Daraja STK Push |
| Validation | Zod |

---

## Setup

### 1. Environment variables

Copy `.env.example` to `.env` and fill in the values:

```env
LIBSQL_URL=libsql://your-db.aws-us-east-1.turso.io
LIBSQL_AUTH_TOKEN=

BETTER_AUTH_SECRET=change-me-to-a-random-32-char-string
BETTER_AUTH_URL=http://localhost:3001
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081,exp://localhost:8081

# M-Pesa Daraja
MPESA_API_URL=https://sandbox.safaricom.co.ke
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_PASSKEY=
MPESA_SHORTCODE=
MPESA_CALLBACK_URL=https://your-api-domain.com/api/wallet/mpesa-callback
```

### 2. Database setup

Run the schema against your Turso database, then run the better-auth migration:

```bash
turso db shell <db-name> < apps/api/schema.sql
npx better-auth migrate        # from apps/api/
```

After migrating, add the `is_agent` column to the auth user table:

```sql
ALTER TABLE user ADD COLUMN is_agent INTEGER NOT NULL DEFAULT 0;
```

### 3. Install & run

```bash
cd apps/api
npm install
npm run dev      # ts-node-dev with hot reload
npm run build    # compile to dist/
npm start        # run compiled output
```

---

## Authentication

Uses **better-auth** with email/password. Auth routes are mounted at `/api/auth/*` and handled entirely by better-auth — refer to [better-auth docs](https://better-auth.com) for sign-up, sign-in, sign-out, etc.

Sessions can be passed as a **Bearer token** (via `Authorization: Bearer <token>` header) or as a **cookie**.

### `GET /api/session`

Returns the current authenticated user and session from the provided token/cookie.

**Response:**
```json
{
  "user": { "id": "...", "email": "...", "name": "...", "is_agent": 0 },
  "session": { ... }
}
```

Returns `401` if not authenticated.

---

## Endpoints

### Health

#### `GET /health`
Returns `{ "ok": true }`. No auth required.

---

### Errands — `/api/errands`

#### `GET /api/errands`
List all errands, joined with sender and agent names.

**Response:** Array of errand objects:
```json
[
  {
    "id": "abc123",
    "title": "Buy groceries",
    "description": "...",
    "category": "Shopping",
    "budget": 500,
    "fee": 100,
    "sender_id": "user_id",
    "agent_id": null,
    "pickup_location": "...",
    "delivery_location": "...",
    "status": "pending",
    "proof_image_url": null,
    "created_at": "...",
    "updated_at": "...",
    "sender_name": "Alice",
    "agent_name": null
  }
]
```

---

#### `POST /api/errands`
Create a new errand. Escrows `budget + fee` from the sender's wallet.

**Body:**
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "budget": 500,
  "fee": 100,
  "sender_id": "user_id (required)",
  "pickup_location": "string (optional)",
  "delivery_location": "string (optional)",
  "category": "Shopping (optional, default: Shopping)"
}
```

**Response:** `201` with the created errand object.

**Errors:**
- `400` — missing required fields or insufficient wallet balance
- `500` — DB error

---

#### `POST /api/errands/update`
Update an errand's status. Handles escrow release and dispute refunds.

**Body:**
```json
{
  "errandId": "string (required)",
  "status": "string (required)",
  "agentId": "string (optional — set when agent accepts)",
  "proofImageUrl": "string (optional — set when agent uploads proof)"
}
```

**Status flow:**

| Status | Effect |
|---|---|
| `in_progress` | Agent sets when they accept; `agentId` gets locked in |
| `proof_uploaded` | Agent sets with `proofImageUrl` |
| `confirmed` | Sender confirms delivery → fee released to agent's wallet |
| `disputed` | Sender disputes → full `budget + fee` refunded to sender |

---

### Wallet — `/api/wallet`

#### `GET /api/wallet?userId=<userId>`
Fetch a user's wallet balance and last 50 transactions.

**Response:**
```json
{
  "wallet": { "user_id": "...", "balance": 1500.0, "created_at": "..." },
  "transactions": [
    { "id": "...", "wallet_id": "...", "amount": 500, "type": "deposit", "errand_id": null, "created_at": "..." }
  ]
}
```

Transaction `type` values: `deposit`, `withdrawal`, `escrow_hold`, `payment_release`, `dispute_refund`

---

#### `POST /api/wallet/topup`
Initiate an M-Pesa STK push to top up the wallet.

**Body:**
```json
{
  "userId": "string",
  "phone": "07XXXXXXXX",
  "amount": 500
}
```

**Response:**
```json
{ "checkoutRequestId": "ws_CO_..." }
```

The client can poll `GET /api/wallet?userId=...` to detect when the balance updates after the callback.

---

#### `POST /api/wallet/mpesa-callback`
Safaricom calls this after payment completes. Do not call this from the client — it's for Safaricom's servers only. Always responds `200` with `{ "ResultCode": 0 }`.

---

#### `POST /api/wallet`
Internal/legacy: direct deposit or withdrawal (no M-Pesa). Useful for testing.

**Body:**
```json
{
  "userId": "string",
  "amount": 500,
  "type": "deposit | withdrawal"
}
```

---

### Agent — `/api/agent`

#### `POST /api/agent/apply`
Submit (or re-submit) an agent application with KYC documents.

**Body:**
```json
{
  "userId": "string",
  "idImageUrl": "https://...",
  "selfieImageUrl": "https://...",
  "mpesaNumber": "07XXXXXXXX or 01XXXXXXXX"
}
```

**Response:** `201` with the application object. Status starts as `pending`.

---

#### `GET /api/agent/status?userId=<userId>`
Check the current application status for a user.

**Response:**
```json
{ "status": "none | pending | approved | rejected" }
```

---

#### `POST /api/agent/approve`
Internal admin endpoint — approve or reject an application.

**Body:**
```json
{
  "userId": "string",
  "approved": true
}
```

On approval, sets `is_agent = true` on the user record.

---

## Database Schema Summary

| Table | Purpose |
|---|---|
| `user` | Managed by better-auth. Has extra `is_agent` column. |
| `session`, `account`, `verification` | Managed by better-auth |
| `wallets` | One row per user, holds balance |
| `transactions` | Ledger entries (deposits, withdrawals, escrow, etc.) |
| `errands` | Errand listings |
| `agent_applications` | KYC applications for agents |
| `mpesa_requests` | Pending STK push requests, cleaned up after callback |

---

## CORS

The API accepts requests from origins listed in `ALLOWED_ORIGINS` (comma-separated). Requests with no `Origin` header (mobile apps, native HTTP clients) are always allowed. Credentials (cookies) are supported.
