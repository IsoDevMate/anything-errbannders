# ErrandEconomy — Backend build prompt (trust + maps + profile features)

Copy-paste this prompt into Cursor / Claude / your backend agent when extending
`apps/api` (Render: `https://anything-errbannders.onrender.com`).

---

## Context

We are building a **personal errand economy** (lightweight TaskRabbit) for Nairobi.

**Trust problem (core product):**
Senders need confidence agents will not steal luxury goods, poison food/meds,
tamper with deliveries, or get paid unfairly after a dispute. Agents need fair
payout after proof. Money moves via **wallet escrow + M-Pesa**, not NFC cards (Phase 2).

**Already live:**
- better-auth email/password (`/api/auth/*`) + bearer tokens
- Errands CRUD + escrow hold/release/dispute (`/api/errands`)
- Wallet top-up / deposit / withdraw (`/api/wallet`)
- Agent KYC apply/status/approve (`/api/agent`)
- Live GPS push/poll (`POST/GET /api/errands/:id/location`)
- Reviews list/create (`/api/reviews`)
- Local SQLite fallback on Render unless `USE_TURSO=true`
- Swagger at `/api/docs`

**Mobile:** Expo app calls `EXPO_PUBLIC_API_URL`. Auth uses native email form.
Create-errand locations use Google Places (if `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`)
or OpenStreetMap Nominatim, and send `pickup_lat/lng` + `delivery_lat/lng`.

---

## Build these next (priority order)

### 1) Persist map coordinates on errands (if not already)
Columns on `errands`: `pickup_lat`, `pickup_lng`, `delivery_lat`, `delivery_lng`.
Accept them on `POST /api/errands`. Detail map must prefer these over geocoding text.

### 2) Live GPS (must stay rock-solid)
- Agent (`in_progress`): mobile watches GPS → `POST /api/errands/:id/location` every ~3s
- Sender: polls `GET /api/errands/:id/location` every ~4s
- Keep in-memory fallback if DB write fails
- Optional later: WebSocket `/ws/errands/:id/location`

### 3) Trust / reputation
**Tables**
```sql
reviews (
  id, errand_id, from_user_id, to_user_id,
  rating REAL CHECK (rating BETWEEN 1 AND 5),
  comment, created_at
)
```
**Endpoints**
- `GET /api/reviews?userId=` → `{ average, reviews[] }`
- `POST /api/reviews` after `confirmed` only (one review per errand/direction)
- On agent `approved`, set `user.is_agent = 1`
- Optional: `GET /api/users/:id/trust` → `{ is_agent, rating, completed_count, disputes }`

### 4) Profile listing data the mobile already navigates to
| Mobile screen | Backend needed |
|---|---|
| Notifications | `GET/PUT /api/notifications/preferences?userId=` + later Expo push tokens |
| My Reviews | `GET /api/reviews?userId=` (done) |
| Identity Verification | `GET /api/agent/status` + apply (done); admin approve queue |
| QR Pass | Client-generated today; optional `GET /api/users/:id/pass` signed JWT |
| Help Center | Static on mobile; optional CMS later |

### 5) Dispute fairness (sender vs agent)
- `POST /api/errands/update` with `disputed` already refunds sender
- Add: `dispute_reason`, `dispute_evidence_urls[]`, admin `POST /api/disputes/:id/resolve` `{ winner: 'sender'|'agent', note }`
- Never pay both; log ledger row `dispute_refund` or `payment_release`

### 6) Proof of work
- Agent uploads receipt / delivery photo → `proof_image_url` + status `completed`
- Sender sees proof before Confirm & Pay
- Optional: multiple proof images table `errand_proofs`

### 7) Auto-release escrow
- Cron/job: if status=`completed` and `updated_at` older than 2 hours with no dispute → set `confirmed` and release fee

### 8) M-Pesa
- Keep STK top-up + callback
- Add agent payout to M-Pesa on `confirmed` (B2C) using stored `mpesa_number` from agent application

### 9) Notifications
- Store Expo push token: `POST /api/devices { userId, token, platform }`
- Emit on: accept, location started, proof uploaded, dispute, payout

---

## Trust UX rules (do not break)

1. Create errand blocked unless wallet >= budget + fee  
2. Funds leave sender immediately (escrow_hold)  
3. Agent paid only on confirm (or admin resolve / auto-release)  
4. Dispute refunds sender pending review  
5. Agents need approved KYC before accepting high-value errands (enforce `is_agent`)  
6. No OTP mid-queue — pre-authorize agent at accept time  

---

## Google Maps integration (mobile + optional backend)

**Mobile (preferred):**
- Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (Places + Maps SDK / Directions if needed)
- Enable APIs: Places API, Maps SDK for Android/iOS, (optional) Geocoding
- Restrict key by bundle id / SHA-1
- Without key, app already falls back to Nominatim search (Kenya)

**Optional backend proxy (hides key):**
- `GET /api/places/autocomplete?q=`
- `GET /api/places/details?placeId=`
- Server calls Google with `GOOGLE_MAPS_SERVER_KEY`

Store selected place as:
```json
{
  "pickup_location": "Naivas, Westlands, Nairobi",
  "pickup_lat": -1.2672,
  "pickup_lng": 36.8148,
  "delivery_location": "...",
  "delivery_lat": -1.2921,
  "delivery_lng": 36.789
}
```

---

## Live GPS acceptance checklist

1. User A creates errand with map-picked pickup + delivery  
2. User B (approved agent) taps Accept → status `in_progress`  
3. B’s phone grants location → marker moves on A’s map within ~5s  
4. B uploads proof → A confirms → fee released  
5. Both can rate via `/api/reviews`  

---

## Out of scope for MVP

- Physical NFC payment cards / Visa issuing  
- Vendor QR checkout network  
- Full background-check vendor APIs (Smile/Onfido) — stub with ID+selfie first  

---

## Implementation notes for this repo

- Root API: `apps/api`  
- Deploy: Render service `anything-errbannders`  
- After schema changes, push to `main`; Render auto-builds `npm run build`  
- Do **not** enable Turso until `USE_TURSO=true` and credentials are valid (Turso currently returns HTTP 400)  
