# Savvy Rilla FX API (MVP v0.1)

Immaculate, SSP‑first FX API built with Next.js (App Router), TypeScript, and Supabase.
Ready to deploy on Vercel. Uses the Savvy Rilla logo across docs and Open Graph.

## Quick start
1. Copy `.env.example` → `.env.local` and fill values.
2. `npm i`
3. `npm run dev`

## Deploy
- Push to GitHub → Import to Vercel → Add env vars (both Preview & Production).
- Point `fx.savvyrilla.tech` CNAME to `cname.vercel-dns.com`.
- Seed rates via `/api/v1/admin/rates` (CSV or JSON).

## Endpoints
- `GET /api/v1/currencies`
- `GET /api/v1/latest?base=SSP&symbols=USD,EUR`
- `GET /api/v1/convert?from=USD&to=SSP&amount=100`
- `GET /api/v1/timeseries?start=YYYY-MM-DD&end=YYYY-MM-DD&base=SSP&symbols=USD`
- `GET /api/v1/status`
- `POST /api/v1/admin/rates` (CSV or JSON) — header: `x-internal-admin-token`
- `POST /api/v1/admin/recompute` — refreshes materialized view

## SQL
Run `supabase/sql/001_init.sql` in Supabase SQL editor.

---

© Savvy Rilla Technologies
