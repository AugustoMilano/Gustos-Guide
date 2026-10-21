-- Stored Cheap eats for San Francisco.
-- Open places priced $ on a Yelp price band. None of these have a house score.
-- Order is Yelp rating, then Yelp review count, then name.
-- Two places qualify. Running this again does not replace a list that is already stored.
-- Apply 20261021200000_collections_city_sf.sql first so city 'sf' is allowed.

with owner as (
  select id
  from public.profiles
  where is_owner
  order by created_at
  limit 1
),
inserted as (
  insert into public.collections (city, title, slug, blurb, position, created_by, updated_by)
  select 'sf', 'Cheap eats', 'cheap-eats', null, 0, owner.id, owner.id
  from owner
  on conflict (city, slug) do nothing
  returning id, city
)
insert into public.collection_places (collection_id, place_id, position, updated_by)
select inserted.id, seed.place_id, seed.position, owner.id
from inserted
join owner on true
join (values
  ('yogurt-park', 0),
  ('el-porteno-empanadas', 1)
) as seed(place_id, position) on true;
