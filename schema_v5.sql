-- ============================================================================
-- Schema v5: Favorite-Spalte für Rezepte
-- ============================================================================

alter table public.recipes add column if not exists favorite boolean default false;
