-- ============================================================
--  Gewürz Manager – Migration v3: Haushalte & Mehrnutzer
--  Kann mehrfach ausgeführt werden (idempotent)
-- ============================================================

-- ── Tabellen anlegen ──────────────────────────────────────────────────────────

create table if not exists public.households (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null default 'Mein Haushalt',
  invite_code text        not null unique,
  created_by  uuid        references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid        not null references public.households(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  role         text        not null default 'member',
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- ── RLS aktivieren ────────────────────────────────────────────────────────────

alter table public.households        enable row level security;
alter table public.household_members enable row level security;

-- ── Policies für households ───────────────────────────────────────────────────

drop policy if exists "Haushalt suchen"     on public.households;
drop policy if exists "Haushalt erstellen"  on public.households;
drop policy if exists "Haushalt umbenennen" on public.households;

create policy "Haushalt suchen" on public.households
  for select to authenticated using (true);

create policy "Haushalt erstellen" on public.households
  for insert to authenticated with check (true);

create policy "Haushalt umbenennen" on public.households
  for update to authenticated
  using (id in (select household_id from public.household_members where user_id = auth.uid()));

-- ── Policies für household_members ───────────────────────────────────────────

drop policy if exists "Eigene Mitgliedschaft sehen" on public.household_members;
drop policy if exists "Haushalt beitreten"          on public.household_members;
drop policy if exists "Haushalt verlassen"          on public.household_members;

create policy "Eigene Mitgliedschaft sehen" on public.household_members
  for select to authenticated using (user_id = auth.uid());

create policy "Haushalt beitreten" on public.household_members
  for insert to authenticated with check (user_id = auth.uid());

create policy "Haushalt verlassen" on public.household_members
  for delete to authenticated using (user_id = auth.uid());

-- ── household_id zu Datentabellen hinzufügen ─────────────────────────────────

alter table public.spices
  add column if not exists household_id uuid references public.households(id) on delete cascade;

alter table public.shopping_items
  add column if not exists household_id uuid references public.households(id) on delete cascade;

alter table public.storage_locations
  add column if not exists household_id uuid references public.households(id) on delete cascade;

-- ── RLS-Policies für spices ───────────────────────────────────────────────────

drop policy if exists "Haushalt lesen"         on public.spices;
drop policy if exists "Haushalt einfügen"      on public.spices;
drop policy if exists "Haushalt aktualisieren" on public.spices;
drop policy if exists "Haushalt löschen"       on public.spices;

create policy "Haushalt lesen" on public.spices
  for select to authenticated
  using (
    household_id is null
    or household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

create policy "Haushalt einfügen" on public.spices
  for insert to authenticated
  with check (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "Haushalt aktualisieren" on public.spices
  for update to authenticated
  using (
    household_id is null
    or household_id in (select household_id from public.household_members where user_id = auth.uid())
  )
  with check (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "Haushalt löschen" on public.spices
  for delete to authenticated
  using (
    household_id is null
    or household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

-- ── RLS-Policies für shopping_items ──────────────────────────────────────────

drop policy if exists "Haushalt lesen"         on public.shopping_items;
drop policy if exists "Haushalt einfügen"      on public.shopping_items;
drop policy if exists "Haushalt aktualisieren" on public.shopping_items;
drop policy if exists "Haushalt löschen"       on public.shopping_items;

create policy "Haushalt lesen" on public.shopping_items
  for select to authenticated
  using (
    household_id is null
    or household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

create policy "Haushalt einfügen" on public.shopping_items
  for insert to authenticated
  with check (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "Haushalt aktualisieren" on public.shopping_items
  for update to authenticated
  using (
    household_id is null
    or household_id in (select household_id from public.household_members where user_id = auth.uid())
  )
  with check (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "Haushalt löschen" on public.shopping_items
  for delete to authenticated
  using (
    household_id is null
    or household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

-- ── RLS-Policies für storage_locations ───────────────────────────────────────

drop policy if exists "Haushalt lesen"         on public.storage_locations;
drop policy if exists "Haushalt einfügen"      on public.storage_locations;
drop policy if exists "Haushalt aktualisieren" on public.storage_locations;
drop policy if exists "Haushalt löschen"       on public.storage_locations;

create policy "Haushalt lesen" on public.storage_locations
  for select to authenticated
  using (
    household_id is null
    or household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

create policy "Haushalt einfügen" on public.storage_locations
  for insert to authenticated
  with check (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "Haushalt aktualisieren" on public.storage_locations
  for update to authenticated
  using (
    household_id is null
    or household_id in (select household_id from public.household_members where user_id = auth.uid())
  )
  with check (household_id in (select household_id from public.household_members where user_id = auth.uid()));

create policy "Haushalt löschen" on public.storage_locations
  for delete to authenticated
  using (
    household_id is null
    or household_id in (select household_id from public.household_members where user_id = auth.uid())
  );
