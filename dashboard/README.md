# dashboard

Next.js 16 farmer and buyer dashboard for HarvestLynk. Provides authenticated interfaces for listing management, order tracking, wallet operations, virtual account setup, in-app messaging with price offers, real-time notifications, and AI crop disease scanning.

---

## Requirements

- Node.js 20+
- pnpm 9+
- A running instance of `backend-express` (default `http://localhost:4000`)

---

## Setup

```bash
cd dashboard
pnpm install
cp .env.local.example .env.local   # fill in values
pnpm dev                            # http://localhost:3000
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `BACKEND_URL` | Internal URL of the Express API used by the Next.js server-side proxy (default `http://localhost:4000`) |
| `NEXT_PUBLIC_BACKEND_URL` | Public backend URL used for WebSocket connections in the browser |
| `NEXT_PUBLIC_API_URL` | URL of the `ai_crop_handler` FastAPI service (e.g. `http://localhost:8000`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID for the Google sign-in button |
| `NEXT_PUBLIC_DEV_BYPASS_AUTH` | Set to `true` to skip authentication in development with a hard-coded farmer user |

---

## Scripts

```bash
pnpm dev     # next dev — http://localhost:3000
pnpm build   # next build
pnpm start   # next start (after build)
pnpm lint    # eslint
```

---

## Architecture

### API Proxy

The dashboard **never calls the Express API directly from the browser**. Every API call goes through a Next.js catch-all route handler:

```
dashboard/src/app/api/v1/[...path]/route.ts
```

This handler proxies to `BACKEND_URL` server-side, forwarding only the `authorization` and `content-type` headers. File uploads are streamed with `duplex: "half"`. This means no CORS configuration is needed on the browser side — all `/api/v1/*` calls resolve to the Next.js app itself.

### API Client

`src/lib/api.ts` is the sole entry point for all backend calls:

- `apiFetch(path, options)` — adds `Authorization: Bearer <token>`, auto-retries once on 401 by calling `/auth/refresh`, deduplicates concurrent refreshes via a shared in-flight promise.
- Access token is stored in module memory and also persisted to `localStorage` key `hl_access_token`.
- Refresh token is persisted to `localStorage` key `hl_refresh_token`.
- `clearTokens()` removes auth state, user cache, and farmer verification keys from localStorage.
- Money helpers: `koboToNaira(kobo)`, `nairaToKobo(naira)`, `formatNaira(kobo)` — all backend amounts arrive in kobo.

### Authentication

`src/context/AuthContext.tsx` manages the auth lifecycle:

- Hydrates from `hl_user_cache` in localStorage for a fast initial paint.
- On mount, calls `/auth/refresh` to validate the session and load a fresh profile.
- Supports Google OAuth via `@react-oauth/google`.
- `NEXT_PUBLIC_DEV_BYPASS_AUTH=true` injects a hard-coded farmer dev user to skip the login flow during development.

### Real-Time Notifications

`src/hooks/useNotifications.ts` opens a WebSocket connection to `NEXT_PUBLIC_BACKEND_URL/ws?token=<accessToken>` and dispatches incoming notification events to the notification context.

### Messaging & Chat

`src/hooks/useChat.ts` manages the chat state for a single conversation:

- Polls for new messages every 5 seconds when the conversation is open.
- Sends text messages and structured price offer messages via the `/chat` API.
- Tracks unread conversation count via `useChatUnread` for the sidebar badge.

`src/components/MessagesListPage.tsx` — shared list of conversations (farmer and buyer).
`src/components/ConversationDetailPage.tsx` — individual chat thread with message bubbles, offer cards, expiry countdown, and the send-offer panel (farmer only).

---

## Pages

### Auth
| Route | Description |
|---|---|
| `/login` | Email + Google login |
| `/signup/buyer` | Buyer registration |
| `/signup/farmer` | Farmer registration |
| `/verify-email` | Handles Supabase email verification redirect |
| `/verify-email-sent` | Post-signup confirmation screen |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset via Supabase link |
| `/callback` | Google OAuth callback handler |

### Farmer Dashboard (`/dashboard/farmer/*`)
| Route | Description |
|---|---|
| `/` | Overview / stats |
| `/farm` | Farm profile and listing management |
| `/marketplace` | Browse public marketplace |
| `/messages` | Conversations list |
| `/messages/[id]` | Individual conversation with buyer |
| `/orders` | Received orders, status management |
| `/wallet` | Wallet balance, transactions, withdrawals |
| `/profile` | Profile editing, verification uploads |
| `/notifications` | Notification centre |
| `/ai-crop-doctor` | AI crop disease scanner |

### Buyer Dashboard (`/dashboard/buyer/*`)
| Route | Description |
|---|---|
| `/` | Overview / stats |
| `/marketplace` | Browse listings, add to cart |
| `/messages` | Conversations list |
| `/messages/[id]` | Individual conversation with farmer; accept price offers |
| `/checkout` | Order checkout via Nomba payment |
| `/orders` | Order history and tracking |
| `/wallet` | Wallet balance, virtual account, transactions |
| `/profile` | Profile editing |
| `/notifications` | Notification centre |
| `/scan` | Crop scan history |

---

## Tech Stack

| Technology | Version |
|---|---|
| Next.js | 16 |
| React | 19 |
| TypeScript | 5 |
| Tailwind CSS | 4 |
| Framer Motion | 12 |
| Remix Icon | 4 |
| `@react-oauth/google` | 0.13 |
