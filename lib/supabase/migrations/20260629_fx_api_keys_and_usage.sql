-- FX-II-05 — API keys, developer accounts, and usage logs
-- Safe for the shared Savvy Rilla Supabase project: all objects are FX-prefixed.

create table if not exists public.fx_developer_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  company text,
  plan text not null default 'free',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fx_api_keys (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid references public.fx_developer_accounts(id) on delete set null,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  environment text not null default 'live',
  status text not null default 'active',
  scopes text[] not null default array['rates:read', 'summary:read'],
  daily_quota integer not null default 1000,
  monthly_quota integer not null default 30000,
  rate_limit_per_minute integer not null default 120,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fx_api_keys_key_hash_idx on public.fx_api_keys(key_hash);
create index if not exists fx_api_keys_developer_id_idx on public.fx_api_keys(developer_id);
create index if not exists fx_api_keys_status_idx on public.fx_api_keys(status);

create table if not exists public.fx_api_usage_logs (
  id bigint generated always as identity primary key,
  api_key_id uuid references public.fx_api_keys(id) on delete set null,
  developer_id uuid references public.fx_developer_accounts(id) on delete set null,
  request_id text not null,
  method text not null,
  path text not null,
  status_code integer not null,
  duration_ms integer not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists fx_api_usage_logs_api_key_id_created_at_idx
  on public.fx_api_usage_logs(api_key_id, created_at desc);

create index if not exists fx_api_usage_logs_path_created_at_idx
  on public.fx_api_usage_logs(path, created_at desc);

alter table public.fx_developer_accounts enable row level security;
alter table public.fx_api_keys enable row level security;
alter table public.fx_api_usage_logs enable row level security;

-- No broad client policies are created intentionally.
-- These tables are managed through server-side service-role routes only.
