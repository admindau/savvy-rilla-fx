-- Savvy Rilla FX — Supabase Schema (consolidated)

create extension if not exists pgcrypto;

create table if not exists public.currencies (
  code text primary key,
  name text not null,
  decimals int not null default 2,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  priority int not null default 1,
  created_at timestamptz default now()
);

create table if not exists public.fx_rates (
  id bigserial primary key,
  rate_date date not null,
  base text not null references public.currencies(code) on delete restrict,
  quote text not null references public.currencies(code) on delete restrict,
  rate numeric(20,8) not null check (rate > 0),
  source_id uuid not null references public.sources(id) on delete restrict,
  unique (rate_date, base, quote, source_id)
);

create index if not exists fx_rates_idx on public.fx_rates (rate_date, base, quote);

drop materialized view if exists public.fx_latest;
create materialized view public.fx_latest as
select distinct on (r.base, r.quote)
  r.rate_date, r.base, r.quote, r.rate, r.source_id
from public.fx_rates r
join public.sources s on s.id = r.source_id
where r.rate_date = current_date
order by r.base, r.quote, s.priority asc, r.id desc
with no data;

create unique index if not exists fx_latest_unique on public.fx_latest (base, quote);

insert into public.currencies(code, name) values
  ('SSP','South Sudanese Pound'),
  ('USD','US Dollar'),
  ('EUR','Euro'),
  ('GBP','Pound Sterling'),
  ('KES','Kenyan Shilling'),
  ('UGX','Ugandan Shilling'),
  ('ETB','Ethiopian Birr'),
  ('SDG','Sudanese Pound'),
  ('EGP','Egyptian Pound'),
  ('ZAR','South African Rand')
on conflict (code) do nothing;

insert into public.sources(key, label, priority)
values ('official_ssp','Official SSP Daily',1)
on conflict (key) do update set label = excluded.label, priority = excluded.priority;

alter table public.currencies enable row level security;
drop policy if exists p_public_currencies on public.currencies;
create policy p_public_currencies on public.currencies
for select to anon, authenticated using (true);

-- Initial refresh (non-concurrent is fine for first run)
refresh materialized view public.fx_latest;
