# HarvestLynk Backend API

Express 5 REST API with WebSocket support powering the HarvestLynk platform.

## Stack

- **Runtime** — Node.js 22, TypeScript 6, ESM (`"type": "module"`, NodeNext)
- **Framework** — Express 5
- **Database** — PostgreSQL via Drizzle ORM (`postgres` driver)
- **Auth** — JWT stored in `httpOnly` cookie (`sameSite: lax`), Bearer token fallback for tests
- **Real-time** — WebSocket server (`ws`) at `/ws` — cookie auth on upgrade
- **File uploads** — Cloudinary via `multer` (memory storage)
- **Validation** — Zod
- **Tests** — Vitest + Supertest (156 tests)

## Local Development

### Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL running locally

### Setup

```bash
pnpm install
```

Create a `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/harvestlynk
JWT_SECRET=your-secret-here
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
NOMBA_CLIENT_ID=your-nomba-client-id
NOMBA_CLIENT_SECRET=your-nomba-client-secret
NOMBA_PARENT_ACCOUNT_ID=your-nomba-parent-account-id
NOMBA_SUB_ACCOUNT_ID=your-nomba-sub-account-id
NOMBA_ENV=sandbox
NOMBA_WEBHOOK_SECRET=your-nomba-webhook-secret
PORT=4000
CORS_ORIGINS=http://localhost:3000
```

Apply the database schema:

```bash
pnpm db:push
```

Start the development server (auto-restarts on file change):

```bash
pnpm dev
```

The API is available at `http://localhost:4000`.

### Database Commands

```bash
pnpm db:push       # push schema changes directly to the database
pnpm db:generate   # generate SQL migration files
pnpm db:migrate    # run pending migrations
pnpm db:studio     # open Drizzle Studio (visual DB browser)
```

### Running Tests

```bash
pnpm test          # run all tests once
pnpm test:watch    # watch mode
```

Tests run against a real PostgreSQL database (no mocks). Set `DATABASE_URL` to a test database before running.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret used to sign JWTs |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `NOMBA_CLIENT_ID` | Yes | Nomba client ID used for access token requests |
| `NOMBA_CLIENT_SECRET` | Yes | Nomba client secret used for access token requests |
| `NOMBA_PARENT_ACCOUNT_ID` | Yes | Nomba parent account ID used in `accountId` headers |
| `NOMBA_SUB_ACCOUNT_ID` | No | Optional Nomba sub-account ID used for scoped checkout/transfer payloads |
| `NOMBA_ENV` | No | Nomba environment (`sandbox` or `production`, default: `sandbox`) |
| `NOMBA_WEBHOOK_SECRET` | No | Secret used to verify Nomba webhook HMAC signatures |
| `PORT` | No | HTTP port (default: `4000`) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `http://localhost:3000`) |
| `NODE_ENV` | No | Set to `production` in prod; disables morgan logging |

## API Reference

All authenticated endpoints require the `jwt` cookie (set on login) or an `Authorization: Bearer <token>` header.

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Register a new user |
| POST | `/api/auth/login` | No | Sign in, sets `jwt` cookie |
| POST | `/api/auth/sign-in/email` | No | Alias for login |
| GET | `/api/auth/get-session` | Yes | Return current session user |
| POST | `/api/auth/sign-out` | Yes | Clear `jwt` cookie |

### Users — `/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Yes | Current user profile + wallet |
| GET | `/users/me/stats` | Yes | Dashboard stats (farmer or buyer) |
| POST | `/users/avatar` | Yes | Upload profile picture |
| POST | `/users/liveness-check` | Yes | AI liveness verification (selfie upload) |
| POST | `/users/verify-nin` | Yes | Upload NIN document |
| POST | `/users/upload-ownership-doc` | Yes | Upload land ownership document |
| GET | `/users/liveness-check` | Yes | Get liveness check status |
| GET | `/users/:id` | Yes | Get user by ID |
| GET | `/users/` | Yes | List all users |
| GET | `/users/:id/ratings` | No | Get farmer ratings and average score |

### Wallet — `/wallet`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/wallet/banks` | No | List supported Nigerian banks |
| GET | `/wallet/balance` | Yes | Current wallet balance |
| GET | `/wallet/transactions` | Yes | Transaction history |
| POST | `/wallet/verify-bank` | Yes | Verify bank account number |
| POST | `/wallet/withdraw` | Yes | Request a withdrawal |

### Marketplace — `/marketplace`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/marketplace/listings` | No | Paginated listings `{ data, page, limit, total }` |
| GET | `/marketplace/listings/:id` | No | Single listing |
| GET | `/marketplace/listings/my` | Yes (farmer) | Current farmer's listings |
| POST | `/marketplace/listings` | Yes (farmer) | Create listing |
| PATCH | `/marketplace/listings/:id` | Yes (farmer) | Update own listing |
| DELETE | `/marketplace/listings/:id` | Yes (farmer) | Delete own listing |
| POST | `/marketplace/upload` | Yes | Upload listing image |

### Orders — `/orders`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/orders` | Yes (buyer) | Place an order |
| GET | `/orders/buyer` | Yes (buyer) | Buyer's orders |
| GET | `/orders/my` | Yes (farmer) | Farmer's received orders |
| PATCH | `/orders/:id/confirm-delivery` | Yes (buyer) | Confirm delivery received |
| PATCH | `/orders/:id/status` | Yes (farmer) | Advance order status |
| PATCH | `/orders/:id/cancel` | Yes | Cancel order (buyer or farmer) |
| POST | `/orders/:id/rate` | Yes (buyer) | Rate a completed order |

Order status flow:
```
pending_payment → payment_confirmed → processing → ready_for_pickup → delivered → completed
                                                                    ↘ cancelled
```

### Notifications — `/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | Yes | All notifications |
| GET | `/notifications/unread-count` | Yes | `{ count: number }` |
| PATCH | `/notifications/:id/read` | Yes | Mark one as read |
| PATCH | `/notifications/read-all` | Yes | Mark all as read |

### Scans — `/scans`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/scans` | Yes | Upload crop image for AI diagnosis |
| GET | `/scans/my` | Yes | Current user's scan history |

## WebSocket

Connect to `ws://localhost:4000/ws`.

Authentication: the server reads the `jwt` cookie from the upgrade request headers. As a fallback, pass the token as a query param: `ws://localhost:4000/ws?token=<jwt>`.

On connect, the server sends `{ "type": "connected" }`.

Real-time events pushed to the client:

```json
{ "type": "notification", "notification": { "id": "...", "message": "...", "type": "order|payment|system", "read": false, "created_at": "..." } }
```

## Docker Deployment

The image is built in two stages — a builder stage compiles TypeScript, the runner stage installs only production dependencies. No database credentials are needed at build time (Drizzle has no codegen step unlike Prisma).

```bash
# Build the image (done in CI or on the server — not locally)
docker build -t harvestlynk-backend .

# Run (pass secrets as env vars, never bake them into the image)
docker run -d \
  -p 4000:4000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="your-secret" \
  -e CLOUDINARY_CLOUD_NAME="..." \
  -e CLOUDINARY_API_KEY="..." \
  -e CLOUDINARY_API_SECRET="..." \
  -e CORS_ORIGINS="https://yourdomain.com" \
  harvestlynk-backend
```

The container runs as a non-root user (`appuser`) and exposes port `4000`. A health check hits `GET /health` every 30 seconds.

### Database migrations in production

Run migrations against your production database before starting the new container:

```bash
DATABASE_URL="postgresql://..." pnpm db:migrate
```

Or use `pnpm db:push` for simpler deployments where you don't need migration files.
