# 🎬 GatePlay — Full Stack Streaming Platform

**Node.js + Express + Clerk Auth + Supabase PostgreSQL**

---

## Project Structure

```
gateplay-fullstack/
├── server/
│   ├── index.js                  ← Express app entry point
│   ├── db/
│   │   └── pool.js               ← PostgreSQL connection pool
│   ├── middleware/
│   │   ├── auth.js               ← Clerk JWT verification + requirePremium
│   │   └── logger.js             ← Content access logger
│   └── routes/
│       ├── auth.js               ← GET /api/auth/me
│       ├── movies.js             ← GET /api/movies/* + POST /:slug/play
│       ├── payment.js            ← POST /api/payment/upgrade
│       └── logs.js               ← GET /api/logs/my + /admin/summary
├── public/
│   ├── index.html                ← Frontend (served by Express)
│   └── styles.css
├── schema.sql                    ← ⭐ Run this in Supabase SQL Editor FIRST
├── .env
└── package.json
```

---

## ⚙️ Setup Instructions

### Step 1 — Run the SQL schema in Supabase

1. Go to [supabase.com](https://supabase.com) → your project → **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `schema.sql`
4. Click **Run**

This creates:
- `users` table (clerk_id, email, role: free/premium)
- `movies` table (pre-seeded with 12 movies)
- `access_logs` table (every play event)
- `payments` table (simulated payment records)
- `premium_access_summary` view

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Configure environment

The `.env` file is already configured:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:...@db.xxx.supabase.co:5432/postgres
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Step 4 — Start the server

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

### Step 5 — Open the app

Visit: **http://localhost:5000**

---

## 🔌 API Reference

All routes are prefixed with `/api`.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/auth/me` | ✅ Required | Returns current user + role from DB |
| DELETE | `/api/auth/me` | ✅ Required | Resets account to free tier |

### Movies

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/movies/all` | Optional | All movies (locked field set per role) |
| GET | `/api/movies/free` | None | Free movies only |
| GET | `/api/movies/premium` | ✅ + Premium | Premium movies only |
| POST | `/api/movies/:slug/play` | ✅ Required | Play a movie. Logs access to DB. Blocks free users on premium content. |

### Payment

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payment/upgrade` | ✅ Required | Upgrade to Premium (simulated). Body: `{ plan, amount }` |
| GET | `/api/payment/history` | ✅ Required | User's payment history |

### Logs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/logs/my` | ✅ Required | Current user's watch history |
| GET | `/api/logs/admin/summary` | ✅ Required | Platform analytics summary |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | DB health check |

---

## 🔐 Authentication Flow

```
Browser                  Express Server              Supabase DB
  │                           │                           │
  │── Clerk sign-in ─────────►│                           │
  │◄── Clerk JWT token ───────│                           │
  │                           │                           │
  │── GET /api/auth/me ───────►│                           │
  │    Authorization: Bearer  │── Clerk.verifyToken() ──► │
  │                           │◄── valid payload ─────────│
  │                           │── upsert user row ───────►│
  │                           │◄── user { role } ─────────│
  │◄── { user, role } ────────│                           │
```

1. User signs in via Clerk (Google / Email)
2. Clerk issues a signed JWT
3. Frontend includes JWT as `Authorization: Bearer <token>` on every API call
4. Backend verifies JWT with `Clerk.verifyToken()`
5. User is auto-created in Supabase `users` table on first login
6. User role (`free`/`premium`) is stored in Supabase

---

## 🛡️ Middleware

### `requireAuth`
- Extracts Bearer token from `Authorization` header
- Verifies with Clerk SDK
- Upserts user into `users` table
- Attaches `req.auth` and `req.dbUser` to the request
- Returns **401** if no/invalid token

### `requirePremium`
- Runs after `requireAuth`
- Checks `req.dbUser.role === 'premium'`
- Returns **403** with upgrade hint if not premium

### `logContentAccess`
- Called after a successful `/play` request
- Inserts a row into `access_logs` with user, movie, IP, user-agent, timestamp
- Never crashes the request (silent error handling)

---

## 📊 HTTP Status Codes Used

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Invalid input (bad plan, amount mismatch) |
| 401 | Not authenticated (no/invalid token) |
| 403 | Forbidden (free user accessing premium content) |
| 404 | Movie not found |
| 409 | Conflict (already premium) |
| 500 | Internal server error |
| 503 | Service unavailable (DB disconnected) |

---

## 🎭 User Flow

```
1. Visit http://localhost:5000
2. Click "Sign In" → Clerk modal opens
3. Sign up / Sign in with email or Google
4. JWT synced → backend creates user (role: 'free')
5. Free movies → click → plays instantly + logs access
6. Premium movies → click → "Upgrade to Premium" prompt
7. Click "Upgrade Now" → payment modal (enter any card values)
8. Click "Confirm & Pay" → POST /api/payment/upgrade
9. Backend: records payment + sets role = 'premium' in Supabase
10. Frontend: all premium locks removed
11. Premium movies → click → plays + logs premium access
```
