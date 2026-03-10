# 🎬 GatePlay — Full-Stack Streaming Platform

> **Node.js · Express · Clerk Auth · Supabase PostgreSQL · Vercel**

GatePlay is a production-ready streaming platform template featuring JWT authentication, role-based access control (free/premium), simulated payments, and a full content-access analytics pipeline.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/adtyaraj4/gateplay)

---

## ✨ Features

| | |
|---|---|
| 🔐 Clerk JWT Auth | Sign in with Google or email — zero session management |
| 🎭 Role-Based Access | `free` / `premium` / `admin` tiers enforced server-side |
| 🗄️ Supabase PostgreSQL | Persistent users, movies, payments & access logs |
| 💳 Simulated Payments | Monthly ($9.99) or yearly ($79.99) upgrade flow |
| 📊 Analytics | Per-user watch history + platform-wide admin summary |
| 🛡️ Production Security | Helmet, rate limiting, CORS, input validation |
| ⚡ Vercel-ready | One-click deploy with `Vercel.json` |

---

## 🗂️ Project Structure

```
gateplay/
├── server/
│   ├── index.js              ← Express app (security, rate-limit, routes)
│   ├── db/
│   │   └── pool.js           ← PostgreSQL connection pool
│   ├── middleware/
│   │   ├── auth.js           ← requireAuth + requirePremium
│   │   └── logger.js         ← Non-blocking access logging
│   └── routes/
│       ├── auth.js           ← GET /api/auth/me, DELETE /api/auth/me
│       ├── movies.js         ← GET /api/movies/* + POST /:slug/play
│       ├── payment.js        ← POST /api/payment/upgrade + history
│       └── logs.js           ← GET /api/logs/my + /admin/summary
├── public/
│   ├── index.html            ← Single-page frontend
│   ├── styles.css            ← Dark-mode design system
│   └── app.js               ← Vanilla JS client (Clerk + API)
├── schema.sql                ← ⭐ Run this in Supabase FIRST
├── .env.example              ← Copy → .env and fill in values
├── Vercel.json               ← Vercel deployment config
└── package.json
```

---

## ⚙️ Local Setup

### 1 — Clone & install

```bash
git clone https://github.com/adtyaraj4/gateplay.git
cd gateplay
npm install
```

### 2 — Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your real keys (see table below).

### 3 — Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New Query**
3. Paste the entire contents of `schema.sql` and click **Run**

This creates the `users`, `movies`, `access_logs`, and `payments` tables, plus seeds 12 movies.

### 4 — Configure Clerk

1. Create an app at [clerk.com](https://clerk.com)
2. Copy your **Publishable Key** and **Secret Key** into `.env`
3. In `public/index.html`, replace `__CLERK_PUBLISHABLE_KEY__` with your key

### 5 — Start

```bash
# Development (auto-restart on save)
npm run dev

# Production
npm start
```

Visit → **http://localhost:5000**

---

## 🔑 Environment Variables

| Variable | Where to find it |
|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → URI |
| `CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `PORT` | Optional, defaults to `5000` |
| `ALLOWED_ORIGINS` | Optional, comma-separated CORS origins |

---

## 🔌 API Reference

All routes are prefixed with `/api`.

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/me` | ✅ | Current user + role |
| `DELETE` | `/auth/me` | ✅ | Reset account to free |

### Movies

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/movies/all` | Optional | All movies (locks premium for free users) |
| `GET` | `/movies/free` | None | Free movies only |
| `GET` | `/movies/premium` | ✅ + Premium | Premium movies only |
| `POST` | `/movies/:slug/play` | ✅ | Play + log access |

### Payment

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/payment/upgrade` | ✅ | Upgrade to premium |
| `GET` | `/payment/history` | ✅ | Payment history |

**Upgrade body:**
```json
{ "plan": "monthly", "amount": 9.99 }
```

### Logs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/logs/my` | ✅ | Watch history (supports `?limit=&offset=`) |
| `GET` | `/logs/admin/summary` | ✅ | Platform analytics |

### Other

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | DB health check |

---

## 🔐 Authentication Flow

```
Browser          Express Server         Supabase DB
  │                    │                     │
  │── Clerk sign-in ──►│                     │
  │◄─ JWT token ───────│                     │
  │                    │                     │
  │── API request ────►│                     │
  │   Bearer <token>   │── verifyToken() ───►│
  │                    │◄─ valid payload ─────│
  │                    │── upsert user ──────►│
  │                    │◄─ { id, role } ──────│
  │◄─ response ────────│                     │
```

---

## 🛡️ Middleware

### `requireAuth`
Verifies Clerk JWT → upserts user into DB → attaches `req.auth` & `req.dbUser`. Returns **401** on failure.

### `requirePremium`
Runs after `requireAuth`. Checks `req.dbUser.role === 'premium'`. Returns **403** with `{ upgrade: true }` hint.

### `logContentAccess`
Fire-and-forget INSERT into `access_logs`. Never crashes the request.

---

## 📊 Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Invalid input |
| 401 | Not authenticated |
| 403 | Premium required |
| 404 | Not found |
| 409 | Already premium |
| 503 | Database unavailable |

---

## 🚀 Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add all environment variables in the Vercel dashboard → Settings → Environment Variables.

---

## 🤝 Contributing

Pull requests are welcome. Please open an issue first for major changes.

## 📄 License

[MIT](LICENSE)
