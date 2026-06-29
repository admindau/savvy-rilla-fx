# Savvy Rilla FX API

Savvy Rilla FX API is a Next.js 16 application that provides public, read-only foreign exchange data and market summaries for the South Sudanese Pound (SSP) against key global and regional currencies.

Live deployment: `https://fx.savvyrilla.tech`

## Platform context

This project uses a shared Supabase database with other Savvy Rilla products, including:

- Gorilla Ledger: `https://gl.savvyrilla.tech`
- EAMU FX: `https://eamu.savvyrilla.tech`
- Savvy Rilla FX API: `https://fx.savvyrilla.tech`

Because the Supabase instance is shared, database changes must be treated as platform-level changes. Do not rename, delete, or change shared tables, columns, Row Level Security policies, functions, triggers, storage buckets, or auth-related configuration without checking the impact on all three applications.

See:

- `docs/SHARED_SUPABASE_GUARDRAILS.md`
- `docs/DB_OWNERSHIP_MAP.md`

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase JavaScript client
- Tailwind CSS v4
- Recharts / Chart.js
- Vercel deployment

## Public API endpoints

Base URL:

```bash
https://fx.savvyrilla.tech/api/v1
```

Current public endpoints:

```text
GET /currencies
GET /rates/latest?base=SSP
GET /rates/{quote}/latest?base=SSP
GET /rates/history?base=SSP&quote=USD&days=30
GET /rates/recent?base=SSP&quote=USD&limit=10
GET /summary/market?base=SSP&quote=USD
GET /summary/insights
GET /export/rates?base=SSP&quote=USD&from=2025-01-01&to=2025-12-31&format=csv
```

Supporting endpoints:

```text
GET /api/health
GET /api/cron/fx/daily
```

Admin endpoints exist under `/api/admin/*` and must remain isolated to FX-owned tables only.

## Local setup

Install dependencies:

```bash
pnpm install
```

Create local environment file:

```bash
cp .env.example .env.local
```

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FX_ADMIN_PASSWORD=
FX_CRON_SECRET=
```

Run the development server:

```bash
pnpm dev
```

Open:

```bash
http://localhost:3000
```

## Build and lint

```bash
pnpm lint
pnpm build
```

## Deployment notes

The production deployment is hosted on Vercel. Production environment variables should be managed through the Vercel project settings, not committed to source control.

Never commit or share:

- `.env.local`
- `.env.production`
- `.next/`
- `node_modules/`
- `.git/`
- Vercel project metadata

## Database safety rules

Before applying any database migration or changing Supabase configuration:

1. Identify whether the change affects FX-only tables, shared tables, auth, storage, RLS, functions, triggers, or scheduled jobs.
2. Check whether Gorilla Ledger or EAMU FX may depend on the same object.
3. Prefer additive changes over destructive changes.
4. Never remove or rename columns without a compatibility plan.
5. Test the FX site after the change.
6. Test the other shared-database applications after the change where relevant.
7. Document the change in the appropriate project notes.

## FX-owned tables currently referenced by this app

Based on the current codebase, this application references:

- `fx_daily_rates`
- `fx_daily_rates_default`
- `fx_sources`
- `currencies`

See `docs/DB_OWNERSHIP_MAP.md` for details.
