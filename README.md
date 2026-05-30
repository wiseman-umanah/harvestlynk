# HarvestLynk

HarvestLynk is an agriculture-focused digital platform that connects farmers, buyers, and verified agricultural agents through smart verification, marketplace tools, and AI-powered farm support services.

## Monorepo Structure

```
harvestlynk/
├── backend-express/     # Express 5 REST API + WebSocket server (TypeScript)
├── dashboard/           # Next.js farmer & buyer dashboard (TypeScript)
├── landing-page/        # Public marketing site
├── ai_crop_handler/     # AI crop disease detection service (Python)
└── backend/             # Legacy NestJS backend (deprecated)
```

## Features

- **Farmer Dashboard** — list produce, manage orders, track earnings, view wallet, AI crop doctor
- **Buyer Dashboard** — browse marketplace, place orders, track deliveries, manage wallet
- **Smart Verification** — NIN document upload + AI liveness check for farmer identity
- **Marketplace** — paginated listings with image upload, price negotiation, escrow-backed orders
- **Real-time Notifications** — WebSocket push for order updates, payment events, system alerts
- **Wallet & Withdrawals** — balance tracking, bank withdrawal requests (Nigerian banks)
- **AI Crop Doctor** — upload crop photo to get disease diagnosis

## Quick Start

### Prerequisites
- Node.js 22+, pnpm 10+
- PostgreSQL 15+
- Cloudinary account

### 1. Backend

```bash
cd backend-express
cp .env.example .env   # fill in values
pnpm install
pnpm db:push           # apply schema to database
pnpm dev               # starts on http://localhost:4000
```

### 2. Dashboard

```bash
cd dashboard
cp .env.local.example .env.local   # fill in values
pnpm install
pnpm dev               # starts on http://localhost:3000
```

See each service's README for full setup and deployment instructions.

## Tech Stack

| Layer | Technology |
|---|---|
| API | Express 5, TypeScript 6, ESM |
| ORM | Drizzle ORM + PostgreSQL |
| Auth | JWT (httpOnly cookie) |
| Real-time | WebSocket (`ws`) |
| File storage | Cloudinary |
| Frontend | Next.js 14, Tailwind CSS |
| Deployment | Docker (backend), Vercel / any Node host (dashboard) |
