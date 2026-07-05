# HarvestLynk

HarvestLynk is an agriculture marketplace platform that connects Nigerian farmers directly with buyers. It provides a produce listing and ordering system, an escrow-style wallet with Nomba payment integration, real-time WebSocket notifications, farmer identity verification, and an AI-powered crop disease classifier.

---

## Repository Structure

This repository is **not** a single monorepo workspace. Each subdirectory is an independently installable project with its own `package.json` and lockfile. Always `cd` into the relevant directory before running commands.

```
backend-express/   Express 5 REST API + WebSocket server (TypeScript, ESM)
dashboard/         Next.js 16 farmer & buyer dashboard
landing-page/      Next.js 16 public marketing site
ai_crop_handler/   FastAPI crop disease image classifier (Python / TensorFlow)
```

---

## Projects

### `backend-express/` — REST API & WebSocket Server

The core backend, written in TypeScript with Express 5. All API routes are mounted at `/api/v1`. Authentication is Supabase-based with Bearer tokens. Money values are stored as integers in **kobo** (smallest NGN unit) throughout the database.

See [`backend-express/README.md`](./backend-express/README.md) for setup, environment variables, API reference, and test instructions.

**Quick start:**
```bash
cd backend-express
pnpm install
cp .env.example .env   # fill in values
pnpm db:migrate
pnpm dev               # http://localhost:4000
```

---

### `dashboard/` — Farmer & Buyer Dashboard

Next.js 16 application serving the authenticated dashboard for both farmers and buyers. API calls are proxied server-side to `BACKEND_URL` via a Next.js catch-all route handler — the browser never calls the Express API directly.

See [`dashboard/README.md`](./dashboard/README.md) for setup and environment variables.

**Quick start:**
```bash
cd dashboard
pnpm install
cp .env.local.example .env.local   # fill in values
pnpm dev                            # http://localhost:3000
```

---

### `landing-page/` — Marketing Site

Next.js 16 public-facing marketing site. Links into the dashboard for signup/login CTAs via `NEXT_PUBLIC_APP_URL`.

See [`landing-page/README.md`](./landing-page/README.md) for setup.

**Quick start:**
```bash
cd landing-page
pnpm install
pnpm dev   # http://localhost:3001
```

---

### `ai_crop_handler/` — Crop Disease Classifier

Standalone FastAPI service that classifies crop disease from an uploaded image using a TensorFlow model. Requires Python 3.13+ and `uv`.

See [`ai_crop_handler/README.md`](./ai_crop_handler/README.md) for setup and model details.

**Quick start:**
```bash
cd ai_crop_handler
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## Running the Full Stack Locally

Start each service in a separate terminal:

| Terminal | Command | Default URL |
|---|---|---|
| 1 | `cd backend-express && pnpm dev` | `http://localhost:4000` |
| 2 | `cd dashboard && pnpm dev` | `http://localhost:3000` |
| 3 | `cd landing-page && pnpm dev` | `http://localhost:3001` |
| 4 | `cd ai_crop_handler && uv run uvicorn main:app --reload` | `http://localhost:8000` |

The dashboard proxies all `/api/v1/*` calls to the backend at `BACKEND_URL` (default `http://localhost:4000`). The AI service is called directly from the browser at `NEXT_PUBLIC_API_URL`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API server | Express 5, TypeScript (ESM), Drizzle ORM, PostgreSQL |
| Auth | Supabase Auth (email + Google OAuth) |
| Payments | Nomba (checkout, virtual accounts, payouts) |
| File uploads | Cloudinary |
| Real-time | Native WebSocket (`ws`) |
| Dashboard | Next.js 16, React 19, Tailwind CSS 4, Framer Motion |
| Landing page | Next.js 16, React 19, Tailwind CSS 4, Framer Motion |
| AI service | FastAPI, TensorFlow (CPU), Pillow, uvicorn |
| Testing | Vitest, Supertest (backend only) |

---

## Key Conventions

- **Money:** all backend money fields are integers in **kobo**. Use `koboToNaira` / `nairaToKobo` helpers in `dashboard/src/lib/api.ts` for display conversion. Never store naira floats in the database.
- **Auth:** Bearer token only — no cookies. `Authorization: Bearer <accessToken>` on every protected request.
- **API prefix:** all routes are versioned under `/api/v1/`.
- **Database:** PostgreSQL via Drizzle ORM. Run `pnpm db:migrate` after pulling new migrations.
- **Tests:** backend tests truncate all tables before each test and require a real PostgreSQL instance. Do not run them against a production database.

---

## Environment Variables

See each subdirectory's README or `.env.example` file for the full variable list. The minimum set to get the backend running:

```
DATABASE_URL        PostgreSQL connection string
SUPABASE_URL        Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET          Secret for local token signing
NOMBA_CLIENT_ID
NOMBA_CLIENT_SECRET
NOMBA_PARENT_ACCOUNT_ID
NOMBA_WEBHOOK_SECRET
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```
