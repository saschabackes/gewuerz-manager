-- ============================================================================
-- Schema v4: Freezer + Cellar nach Supabase (Migration von localStorage)
-- ============================================================================

-- ── Freezer ─────────────────────────────────────────────────────────────────

create table public.freezer_storages (
  id            text primary key,
  household_id  uuid not null references public.households(id) on delete cascade,
  label         text not null,
  emoji         text default '📦',
  compartments  jsonb default '[]'::jsonb,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

create table public.freezer_items (
  id              text primary key,
  household_id    uuid not null references public.households(id) on delete cascade,
  name            text not null,
  category        text default 'sonstiges',
  storage_id      text,
  compartment_id  text,
  portions        int default 1,
  portion_size    text default '',
  frozen_at       date,
  expiry_date     date,
  note            text default '',
  photo_data      text,
  needs_restock   boolean default false,
  created_at      timestamptz default now()
);

-- ── Cellar ──────────────────────────────────────────────────────────────────

create table public.cellar_racks (
  id            text primary key,
  household_id  uuid not null references public.households(id) on delete cascade,
  label         text not null,
  emoji         text default '🍷',
  slots         jsonb default '[]'::jsonb,
  conditions    jsonb default '{"temperature":"normal","light":"mixed","humidity":"normal","vibration":"still"}'::jsonb,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

create table public.cellar_bottles (
  id              text primary key,
  household_id    uuid not null references public.households(id) on delete cascade,
  name            text not null,
  winery          text default '',
  vintage         int,
  region          text default '',
  country         text default '',
  grape           text default '',
  color           text default 'rot',
  wine_type       text default 'wein',
  sweetness       text default '',
  classification  text default '',
  alcohol         text default '',
  alcohol_free    boolean default false,
  drink_from      int,
  drink_until     int,
  rack_id         text,
  slot            text default '',
  count           int default 1,
  price_eur       numeric,
  retailer        text default '',
  purchase_date   text default '',
  link            text default '',
  barcode         text default '',
  rating          int default 0,
  tasting_notes   text default '',
  taste_profile   jsonb default '{}'::jsonb,
  aromas          jsonb default '[]'::jsonb,
  pairings        jsonb default '[]'::jsonb,
  restock         boolean default false,
  note            text default '',
  photo_data      text,
  history         jsonb default '[]'::jsonb,
  archived        boolean default false,
  bought          text default '',
  created_at      timestamptz default now()
);

-- ── Indizes ─────────────────────────────────────────────────────────────────

create index idx_freezer_storages_household on public.freezer_storages(household_id);
create index idx_freezer_items_household    on public.freezer_items(household_id);
create index idx_cellar_racks_household     on public.cellar_racks(household_id);
create index idx_cellar_bottles_household   on public.cellar_bottles(household_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.freezer_storages enable row level security;
alter table public.freezer_items    enable row level security;
alter table public.cellar_racks     enable row level security;
alter table public.cellar_bottles   enable row level security;

-- Freezer Storages
create policy "freezer_storages_select" on public.freezer_storages
  for select to authenticated
  using (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "freezer_storages_insert" on public.freezer_storages
  for insert to authenticated
  with check (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "freezer_storages_update" on public.freezer_storages
  for update to authenticated
  using (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "freezer_storages_delete" on public.freezer_storages
  for delete to authenticated
  using (household_id in (select household_id from public.household_members where user_id = auth.uid()));

-- Freezer Items
create policy "freezer_items_select" on public.freezer_items
  for select to authenticated
  using (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "freezer_items_insert" on public.freezer_items
  for insert to authenticated
  with check (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "freezer_items_update" on public.freezer_items
  for update to authenticated
  using (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "freezer_items_delete" on public.freezer_items
  for delete to authenticated
  using (household_id in (select household_id from public.household_members where user_id = auth.uid()));

-- Cellar Racks
create policy "cellar_racks_select" on public.cellar_racks
  for select to authenticated
  using (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "cellar_racks_insert" on public.cellar_racks
  for insert to authenticated
  with check (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "cellar_racks_update" on public.cellar_racks
  for update to authenticated
  using (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "cellar_racks_delete" on public.cellar_racks
  for delete to authenticated
  using (household_id in (select household_id from public.household_members where user_id = auth.uid()));

-- Cellar Bottles
create policy "cellar_bottles_select" on public.cellar_bottles
  for select to authenticated
  using (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "cellar_bottles_insert" on public.cellar_bottles
  for insert to authenticated
  with check (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "cellar_bottles_update" on public.cellar_bottles
  for update to authenticated
  using (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "cellar_bottles_delete" on public.cellar_bottles
  for delete to authenticated
  using (household_id in (select household_id from public.household_members where user_id = auth.uid()));
