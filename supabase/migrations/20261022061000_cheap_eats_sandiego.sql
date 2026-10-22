-- Stored Cheap eats for San Diego.
-- No place on this list has a published $ band from Yelp or Foursquare, so the row has no places.
-- Running this again does not replace a list that is already stored.
-- Apply 20261022060000_collections_city_sandiego.sql first so city 'sandiego' is allowed.

with owner as (
  select id
  from public.profiles
  where is_owner
  order by created_at
  limit 1
)
insert into public.collections (city, title, slug, blurb, position, created_by, updated_by)
select 'sandiego', 'Cheap eats', 'cheap-eats', null, 0, owner.id, owner.id
from owner
on conflict (city, slug) do nothing;
