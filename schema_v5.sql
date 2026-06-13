-- ============================================================================
-- Schema v5: Favorite + API-Usage-Tracking
-- ============================================================================

-- Favoriten-Spalte für Rezepte
alter table public.recipes add column if not exists favorite boolean default false;

-- API-Nutzung pro Call tracken
create table if not exists public.api_usage (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  household_id uuid references public.households(id) on delete set null,
  action      text not null,
  detail      text,
  created_at  timestamptz default now()
);

create index if not exists idx_api_usage_user on public.api_usage(user_id);
create index if not exists idx_api_usage_created on public.api_usage(created_at);

-- RLS: nur Service-Role darf schreiben (via Netlify Functions)
alter table public.api_usage enable row level security;

create policy "Service role full access" on public.api_usage
  for all using (true) with check (true);
