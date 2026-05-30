# HarvestLynk Dashboard

Next.js 14 dashboard for farmers and buyers on the HarvestLynk platform.

## Stack

- **Framework** — Next.js 14 (App Router)
- **Styling** — Tailwind CSS
- **Auth** — JWT cookie managed by the backend; `AuthContext` wraps the app
- **Real-time** — WebSocket hook (`useNotifications`) with auto-reconnect
- **API layer** — `src/lib/api.ts` — typed wrappers for every backend endpoint

## Local Development

### Prerequisites

- Node.js 22+
- pnpm 10+
- Backend running on `http://localhost:4000`

### Setup

```bash
pnpm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_DEV_BYPASS_AUTH=false
```

Start the dev server:

```bash
pnpm dev
```

Dashboard is at `http://localhost:3000`.

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Backend API base URL (no trailing slash) |
| `NEXT_PUBLIC_DEV_BYPASS_AUTH` | Set to `true` to skip auth and inject a mock farmer session for UI development |

### Auth bypass

Setting `NEXT_PUBLIC_DEV_BYPASS_AUTH=true` injects a hardcoded `DEV_USER` mock farmer session at startup. This lets you work on dashboard UI without running the full auth flow. **Never enable this in production.**

## Project Structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── farmer/          # Farmer-facing pages
│   │   │   ├── page.tsx         # Farmer home / overview
│   │   │   ├── marketplace/     # Manage listings
│   │   │   ├── orders/          # Received orders
│   │   │   ├── wallet/          # Wallet & withdrawals
│   │   │   ├── profile/         # Profile & verification
│   │   │   ├── notifications/   # Notification centre
│   │   │   ├── farm/            # Farm details
│   │   │   └── ai-crop-doctor/  # Crop disease scanner
│   │   └── buyer/           # Buyer-facing pages
│   │       ├── page.tsx         # Buyer home / overview
│   │       ├── marketplace/     # Browse listings
│   │       ├── orders/          # Order history
│   │       ├── wallet/          # Wallet & withdrawals
│   │       ├── profile/         # Buyer profile
│   │       ├── notifications/   # Notification centre
│   │       ├── scan/            # Crop scanner
│   │       ├── farm/            # Farm info
│   │       └── checkout/        # Order checkout
├── components/              # Shared UI components (Topbar, Sidebar, etc.)
├── context/
│   └── AuthContext.tsx      # Global auth state + wallet
├── hooks/
│   └── useNotifications.ts  # REST + WebSocket notification hook
└── lib/
    └── api.ts               # Typed API client for all backend endpoints
```

## API Client

All backend calls go through `src/lib/api.ts`. Each domain has a typed object:

```typescript
import { authApi, usersApi, marketplaceApi, ordersApi, walletApi, notificationsApi, scansApi } from "@/lib/api";

// Examples
const listings = await marketplaceApi.getAllListings({ page: 1, limit: 20 });
const session  = await authApi.getSession();
const stats    = await usersApi.getStats();
```

`apiFetch` sends credentials with every request and throws on non-2xx responses, preferring the `error` field from the response body.

## Real-time Notifications

`useNotifications()` returns:

```typescript
{
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}
```

It fetches the initial list via REST on mount, then opens a WebSocket to `ws(s)://<backend>/ws` for live pushes. The socket reconnects automatically after 4 seconds on disconnect. The `Topbar` component consumes this hook to show the live unread badge.

## Order Statuses

All pages that render order status use this full set:

| Status | Label |
|---|---|
| `pending_payment` | Pending Payment |
| `payment_confirmed` | Payment Confirmed |
| `processing` | Processing |
| `ready_for_pickup` | Ready for Pickup |
| `delivered` | Delivered |
| `completed` | Completed |
| `cancelled` | Cancelled |

## Deployment

The dashboard can be deployed to Vercel, Netlify, or any Node.js host that supports Next.js.

Set these environment variables in your hosting provider's dashboard:

```env
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
NEXT_PUBLIC_DEV_BYPASS_AUTH=false
```

```bash
pnpm build    # type-check + produce .next build
pnpm start    # serve production build locally
```
