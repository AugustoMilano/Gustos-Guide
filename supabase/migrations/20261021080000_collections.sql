-- House collections. Public read. Only the house owner writes, via is_house_owner().
-- Titles are short labels. blurb stays null unless the owner types a note.
-- Cheap eats is not stored here. It is every open place with price $, computed from the catalog.
-- Apply in the Supabase SQL editor. supabase/schema.sql carries the same tables.

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  city text not null check (city in ('seattle', 'eastside', 'la')),
  title text not null check (char_length(title) between 1 and 40 and title = btrim(title)),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and slug <> 'cheap-eats'),
  blurb text check (blurb is null or (char_length(blurb) between 1 and 280 and blurb = btrim(blurb))),
  position int not null default 0 check (position >= 0),
  created_by uuid not null references public.profiles (id),
  updated_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city, slug)
);

create table if not exists public.collection_places (
  collection_id uuid not null references public.collections (id) on delete cascade,
  place_id text not null check (char_length(place_id) between 1 and 200),
  position int not null default 0 check (position >= 0),
  updated_by uuid not null references public.profiles (id),
  primary key (collection_id, place_id)
);

create unique index if not exists collections_city_title_idx on public.collections (city, lower(title));
create index if not exists collections_city_position_idx on public.collections (city, position);
create index if not exists collection_places_order_idx on public.collection_places (collection_id, position);

alter table public.collections enable row level security;
alter table public.collection_places enable row level security;

drop policy if exists "collections_select" on public.collections;
drop policy if exists "collections_insert" on public.collections;
drop policy if exists "collections_update" on public.collections;
drop policy if exists "collections_delete" on public.collections;
drop policy if exists "collection_places_select" on public.collection_places;
drop policy if exists "collection_places_insert" on public.collection_places;
drop policy if exists "collection_places_update" on public.collection_places;
drop policy if exists "collection_places_delete" on public.collection_places;

create policy "collections_select" on public.collections for select
  using (true);

create policy "collections_insert" on public.collections for insert to authenticated
  with check (
    public.is_house_owner()
    and created_by = auth.uid()
    and updated_by = auth.uid()
  );

create policy "collections_update" on public.collections for update to authenticated
  using (public.is_house_owner())
  with check (public.is_house_owner() and updated_by = auth.uid());

create policy "collections_delete" on public.collections for delete to authenticated
  using (public.is_house_owner());

create policy "collection_places_select" on public.collection_places for select
  using (true);

create policy "collection_places_insert" on public.collection_places for insert to authenticated
  with check (public.is_house_owner() and updated_by = auth.uid());

create policy "collection_places_update" on public.collection_places for update to authenticated
  using (public.is_house_owner())
  with check (public.is_house_owner() and updated_by = auth.uid());

create policy "collection_places_delete" on public.collection_places for delete to authenticated
  using (public.is_house_owner());

revoke all on table public.collections from public, anon, authenticated;
grant select on table public.collections to anon, authenticated;
grant insert, update, delete on table public.collections to authenticated;

revoke all on table public.collection_places from public, anon, authenticated;
grant select on table public.collection_places to anon, authenticated;
grant insert, update, delete on table public.collection_places to authenticated;
