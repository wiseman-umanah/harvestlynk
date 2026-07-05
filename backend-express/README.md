# backend-express

Express 5 REST API and WebSocket server for HarvestLynk. Written in TypeScript with ESM modules. Handles authentication (via Supabase), marketplace listings, orders with escrow, wallet and payouts (via Nomba), virtual accounts, real-time notifications over WebSocket, and crop scan persistence.

---

## Requirements

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- A [Supabase](https://supabase.com) project (for Auth)
- A [Nomba](https://nomba.com) account (for payments)
- A [Cloudinary](https://cloudinary.com) account (for file uploads)

---

## Setup

```bash
cd backend-express
pnpm install
cp .env.example .env    # then fill in all values
pnpm db:migrate         # apply all pending migrations
pnpm dev                # starts on http://localhost:4000
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | HTTP port (default `4000`) |
| `FRONTEND_URL` | Dashboard origin, used in Supabase email redirect links |
| `APP_URL` | This API's own public URL |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (must also be configured in Supabase) |
| `JWT_SECRET` | Secret for local token signing (`signAccessToken`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `NOMBA_CLIENT_ID` | Nomba OAuth client ID |
| `NOMBA_CLIENT_SECRET` | Nomba OAuth client secret |
| `NOMBA_PARENT_ACCOUNT_ID` | Nomba parent account ID |
| `NOMBA_SUB_ACCOUNT_ID` | Nomba sub-account ID (optional) |
| `NOMBA_WEBHOOK_SECRET` | Secret used to verify Nomba webhook signatures |
| `NOMBA_ENV` | `sandbox` or `production` (default `sandbox`) |
| `SMTP_HOST` | SMTP host for transactional email |
| `SMTP_PORT` | SMTP port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From address for sent emails |

---

## Scripts

```bash
pnpm dev          # nodemon + tsx hot reload
pnpm build        # tsc → dist/
pnpm start        # run compiled dist/index.js
pnpm test         # vitest run (all tests, once)
pnpm test:watch   # vitest watch mode
pnpm db:generate  # generate a SQL migration from schema changes
pnpm db:migrate   # apply pending migrations
pnpm db:push      # push schema directly to DB (dev only, no migration file)
pnpm db:studio    # open Drizzle Studio in browser
```

---

## Architecture

### Entry Points

- **`src/index.ts`** — creates the HTTP server, attaches the WebSocket handler (`initWsServer`), and starts Express.
- **`src/app.ts`** — configures middleware in order: CORS → raw body capture (webhook path) → JSON/urlencoded parsing → rate limiter → health check → Swagger UI → versioned routes → error handler.

### Routes (`/api/v1`)

| Prefix | Resource |
|---|---|
| `/auth` | Signup, login, Google OAuth, email verification, password reset, refresh, logout |
| `/users` | User profiles, current user, stats, verification uploads, liveness, ratings |
| `/marketplace` | Public listing browse/detail; farmer listing CRUD, image upload |
| `/orders` | Create order, buyer/farmer order lists, status transitions, delivery confirmation, cancellation, dispute, rating |
| `/payments` | Nomba webhook handler (`POST /nomba-webhook`) |
| `/wallet` | Balance, transactions, ledger, bank list, bank verification, withdrawal/payout |
| `/virtual-accounts` | Buyer virtual account creation, retrieval, suspension |
| `/notifications` | List, unread count, mark read, mark all read |
| `/scans` | Crop scan result persistence and history |

### Authentication

Authentication is **Supabase Auth + Bearer token** — no cookies.

- `POST /auth/signup` and `/auth/login` delegate to Supabase Auth and return `{ accessToken, refreshToken }`.
- Every protected route reads `Authorization: Bearer <token>` and calls `getSupabaseAdmin().auth.getUser(token)`.
- The local `users` table is the app profile/role store. The Supabase user email maps to the local row.
- Google OAuth is supported via `/auth/google` using Supabase's `signInWithIdToken`.

### Money Convention

All money fields in the database are **integers in kobo** (1 NGN = 100 kobo):

- `wallets.availableBalance`, `pendingBalance`, `totalPaidIn`, `totalPaidOut`
- `orders.totalAmount`, `listings.pricePerUnit`, `listings.totalPrice`
- `payments.amount`, `payouts.grossAmount`, `payouts.netAmount`

Never store naira floats in the database. Convert only at the API response boundary using `koboToNaira` / `nairaToKobo` in the dashboard.

### Order State Machine

```
pending_payment → payment_confirmed → processing → ready_for_pickup → completed
                                   ↘ cancellation_requested → cancelled
pending_payment → cancelled
payment_confirmed → refund_pending → refunded
any paid state → disputed
```

- Farmer can only advance: `payment_confirmed → processing` and `processing → ready_for_pickup`.
- Farmer cannot process an unpaid order.
- Buyer can cancel before payment or request cancellation after payment (farmer must accept/reject).
- Disputes freeze escrow in farmer `pendingBalance`.
- Admin/agent resolves disputes via `PATCH /:id/resolve-dispute`.

### Real-Time Notifications

WebSocket endpoint is `/ws`. The client passes the Supabase access token as `?token=...` (browsers cannot set headers on WebSocket handshakes). An in-memory `Map<userId, Set<WebSocket>>` tracks connected clients per user. Notifications are written to the database and then pushed live when the user is connected.

### Payments (Nomba)

- **Checkout:** `createCheckoutLink` generates a hosted payment page. The Nomba webhook at `POST /api/v1/payments/nomba-webhook` processes `payment_success`, `payment_failed`, `payout_success`, `payout_failed`, and virtual account deposit events.
- **Virtual accounts:** buyers can create a dedicated NGN bank account number via Nomba. Deposits to that account credit the buyer's wallet.
- **Payouts:** farmers withdraw via `POST /wallet/withdraw`. The transfer is initiated via Nomba and completed/failed from the webhook.
- **Idempotency:** the webhook handler checks for an existing `payments` record with the same `nombaReference` before crediting escrow.

---

## Database

Managed with [Drizzle ORM](https://orm.drizzle.team). Schema lives in `src/db/schema.ts`.

### Key Tables

| Table | Purpose |
|---|---|
| `users` | Farmer/buyer profiles, role, verification state, bank details, trust score |
| `wallets` | Per-user wallet with available/pending balances |
| `wallet_ledger_entries` | Immutable ledger of every balance-changing event |
| `transactions` | User-visible debit/credit history |
| `listings` | Farmer produce listings with price (kobo), quantity, status |
| `orders` | Buyer orders referencing a listing, farmer, and buyer |
| `payments` | Nomba/wallet payment records per order |
| `payouts` | Farmer payout/transfer records |
| `virtual_accounts` | Buyer Nomba virtual bank accounts |
| `notifications` | Persisted notification records |
| `scans` | Crop disease scan results uploaded by farmers |

### Migrations

```bash
pnpm db:generate   # diff schema.ts against DB → new SQL file in drizzle/
pnpm db:migrate    # apply all unapplied migrations
```

---

## Testing

Tests use [Vitest](https://vitest.dev) + [Supertest](https://github.com/ladjs/supertest) against a **real PostgreSQL database**. There are no database mocks. The test setup truncates all tables before each test and after the full run.

### Running Tests

```bash
pnpm test                                              # all files, once
pnpm exec vitest run src/tests/orders.test.ts         # single file
pnpm test:watch                                        # watch mode
```

### Test Files

| File | Coverage |
|---|---|
| `auth.test.ts` | Signup, email verification, change-password |
| `users.test.ts` | Profile CRUD, stats, ratings |
| `marketplace.test.ts` | Listing browse, filter, CRUD |
| `orders.test.ts` | Create order, status transitions, delivery confirmation, rating |
| `orders-escrow.test.ts` | Cancel, refund, dispute, cancellation request/response, resolve dispute |
| `payments.test.ts` | Nomba webhook: payment success, idempotency, payment failed, payout success/failure |
| `wallet.test.ts` | Balance, transactions, ledger, bank verify, withdrawal, idempotency, payout requery |
| `notifications.test.ts` | List, unread count, mark read, mark all read |
| `virtual-accounts.test.ts` | Create, get, suspend |

**Important:** do not run tests against a production database. The global `beforeEach` wipes all data.

### Auth Mocking

Every test file mocks `../utils/supabase.js` so that `getSupabaseAdmin().auth.getUser(token)` decodes the locally-signed JWT rather than calling Supabase. Test users are seeded directly into the database with `db.insert(users)` — no HTTP signup flow required.

```ts
vi.mock("../utils/supabase.js", () => ({
  getSupabaseAdmin: () => ({
    auth: {
      getUser: async (token: string) => {
        const [, b64] = token.split(".");
        const p = JSON.parse(Buffer.from(b64, "base64url").toString());
        return { data: { user: { email: p.email, email_confirmed_at: new Date().toISOString() } }, error: null };
      },
    },
  }),
  isSupabaseEmailVerified: () => true,
}));
```

---

## Project Structure

```
src/
  app.ts                   Express app configuration
  index.ts                 HTTP + WebSocket server entrypoint
  controllers/             Route handler functions
  db/
    index.ts               Drizzle client
    schema.ts              Full database schema
  middleware/
    auth.ts                authenticate() Bearer token middleware
    rateLimiter.ts         express-rate-limit (production only)
  routes/v1/               Express Router files per resource
  tests/                   Vitest test files + setup
  utils/
    jwt.ts                 signAccessToken, verifyAccessToken
    nomba.ts               Nomba API client (checkout, transfer, virtual accounts)
    notifications.ts       createNotification helper
    supabase.ts            getSupabaseAdmin() wrapper
    wsServer.ts            WebSocket server and pushToUser()
drizzle/                   SQL migration files
```
