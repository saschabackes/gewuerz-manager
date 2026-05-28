-- ============================================================
--  Gewürz Manager – Migration v2: Lagerorte
--  Im Supabase SQL-Editor ausführen (Database → SQL Editor)
-- ============================================================

-- Neue Tabelle für Lagerorte
create table public.storage_locations (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  description text,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

-- Row Level Security
alter table public.storage_locations enable row level security;

create policy "Haushalt lesen"         on public.storage_locations for select     to authenticated using (true);
create policy "Haushalt einfügen"      on public.storage_locations for insert     to authenticated with check (true);
create policy "Haushalt aktualisieren" on public.storage_locations for update     to authenticated using (true);
create policy "Haushalt löschen"       on public.storage_locations for delete     to authenticated using (true);

-- Lagerort-Spalte zur Gewürz-Tabelle hinzufügen
alter table public.spices
  add column location_id uuid references public.storage_locations(id) on delete set null;
