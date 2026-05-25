-- ============================================================
--  Gewürz Manager – Datenbankschema
--  Einmal im Supabase SQL-Editor ausführen (Database → SQL Editor)
-- ============================================================

-- Gewürz-Tabelle (geteilter Haushalts-Vorrat)
create table public.spices (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  brand         text,
  image_url     text,
  packaging_type text       not null default 'fertigstreuer',
  amount_grams  numeric,
  units         integer,
  expiry_date   date,
  barcode       text,
  notes         text,
  created_by    uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Einkaufsliste (geteilt)
create table public.shopping_items (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  amount     text,
  checked    boolean     not null default false,
  added_by   uuid        references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Row Level Security aktivieren
alter table public.spices         enable row level security;
alter table public.shopping_items enable row level security;

-- Alle eingeloggten Benutzer dürfen alles sehen und bearbeiten (geteilter Haushalt)
create policy "Haushalt lesen"        on public.spices for select     to authenticated using (true);
create policy "Haushalt einfügen"     on public.spices for insert     to authenticated with check (true);
create policy "Haushalt aktualisieren" on public.spices for update    to authenticated using (true);
create policy "Haushalt löschen"      on public.spices for delete     to authenticated using (true);

create policy "Haushalt lesen"        on public.shopping_items for select     to authenticated using (true);
create policy "Haushalt einfügen"     on public.shopping_items for insert     to authenticated with check (true);
create policy "Haushalt aktualisieren" on public.shopping_items for update    to authenticated using (true);
create policy "Haushalt löschen"      on public.shopping_items for delete     to authenticated using (true);
