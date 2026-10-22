-- Move Yogurt Park from San Francisco Cheap eats to East Bay.
-- Apply 20261022050000_collections_city_bay.sql first.
--
-- The original San Francisco seed is exactly two places: yogurt-park at
-- position 0 and el-porteno-empanadas at position 1, title Cheap eats, blurb
-- null. That list is still unedited only when those facts still hold.
-- An edited San Francisco list is left alone, and an East Bay Cheap eats
-- row that already exists is left alone.

do $$
declare
  owner_id uuid;
  sf_id uuid;
  eb_id uuid;
  place_count int;
  yogurt_pos int;
  porte_pos int;
begin
  select id
  into owner_id
  from public.profiles
  where is_owner
  order by created_at
  limit 1;

  if owner_id is null then
    return;
  end if;

  select c.id
  into sf_id
  from public.collections c
  where c.city = 'sf'
    and c.slug = 'cheap-eats'
    and c.title = 'Cheap eats'
    and c.blurb is null;

  if sf_id is null then
    return;
  end if;

  select count(*)
  into place_count
  from public.collection_places
  where collection_id = sf_id;

  select position
  into yogurt_pos
  from public.collection_places
  where collection_id = sf_id
    and place_id = 'yogurt-park';

  select position
  into porte_pos
  from public.collection_places
  where collection_id = sf_id
    and place_id = 'el-porteno-empanadas';

  if place_count is distinct from 2
    or yogurt_pos is distinct from 0
    or porte_pos is distinct from 1 then
    return;
  end if;

  if exists (
    select 1
    from public.collections
    where city = 'eastbay'
      and slug = 'cheap-eats'
  ) then
    return;
  end if;

  insert into public.collections (city, title, slug, blurb, position, created_by, updated_by)
  values ('eastbay', 'Cheap eats', 'cheap-eats', null, 0, owner_id, owner_id)
  returning id into eb_id;

  insert into public.collection_places (collection_id, place_id, position, updated_by)
  values (eb_id, 'yogurt-park', 0, owner_id);

  delete from public.collection_places
  where collection_id = sf_id
    and place_id = 'yogurt-park';

  update public.collection_places
  set position = 0,
      updated_by = owner_id
  where collection_id = sf_id
    and place_id = 'el-porteno-empanadas';
end $$;
