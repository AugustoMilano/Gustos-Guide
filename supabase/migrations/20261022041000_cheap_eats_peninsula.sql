-- Peninsula Cheap eats is not seeded here. None of its places are priced $.
-- Apply 20261022040000_collections_city_peninsula.sql first.
-- Yogurt Park moves in 20261022051000_cheap_eats_eastbay.sql, and only when
-- the San Francisco Cheap eats list is still the original seed.
-- This statement does not insert a row. A Peninsula list created first is not replaced.

insert into public.collections (city, title, slug, blurb, position, created_by, updated_by)
select 'peninsula', 'Cheap eats', 'cheap-eats', null, 0, owner.id, owner.id
from (
  select id
  from public.profiles
  where is_owner
  order by created_at
  limit 1
) as owner
where false
on conflict (city, slug) do nothing;
