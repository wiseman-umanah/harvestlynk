# landing-page

Next.js 16 public marketing site for HarvestLynk. A static-first site presenting the platform to prospective farmers and buyers with a hero, features breakdown, how-it-works section, and CTAs linking into the dashboard.

---

## Requirements

- Node.js 20+
- pnpm 9+

---

## Setup

```bash
cd landing-page
pnpm install
cp .env.local.example .env.local   # or set NEXT_PUBLIC_APP_URL directly
pnpm dev                            # http://localhost:3001
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Base URL of the dashboard app. CTAs (Sign up, Get started) link to `${NEXT_PUBLIC_APP_URL}/signup/farmer` and `/signup/buyer`. |

---

## Scripts

```bash
pnpm dev     # next dev — http://localhost:3001
pnpm build   # next build
pnpm start   # next start (after build)
pnpm lint    # eslint
```

---

## Page Structure

`src/app/page.tsx` composes the full landing page from these section components in order:

| Component | Content |
|---|---|
| `Navbar` | Navigation with logo, links, and sign-in/sign-up buttons |
| `Hero` | Headline, sub-headline, primary CTA |
| `Features` | Platform feature highlights |
| `HowItWorks` | Step-by-step flow for farmers and buyers |
| `ForFarmers` | Farmer-specific value propositions |
| `ForBuyers` | Buyer-specific value propositions |
| `TrustSection` | Verification and escrow trust signals |
| `Footer` | Links and legal |

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
