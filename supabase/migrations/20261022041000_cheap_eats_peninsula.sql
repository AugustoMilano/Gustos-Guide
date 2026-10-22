-- Cheap eats after the Bay Area split.
-- Apply 20261022040000_collections_city_peninsula.sql first.
--
-- San Francisco keeps its stored Cheap eats row. Yogurt Park (Berkeley) was
-- folded into San Francisco because the East Bay has only 4 places, under the
-- 8-place line, and Berkeley is closer to San Francisco than to the Peninsula.
-- This statement does not update that row, so a list Augusto already edited
-- stays as he left it.
--
-- The Peninsula and South Bay has 12 places and none priced $. No Cheap eats
-- row is seeded. A later edit can add one; on conflict does nothing below
-- so a row he creates first is never replaced.

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
