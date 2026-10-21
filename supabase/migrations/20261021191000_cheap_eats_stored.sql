-- Let a stored Cheap eats collection replace the computed list.
-- Ranked once from house_scores (high to low, unscored last), then Yelp rating, then Yelp review count.
-- Eastside has 2 open $ places and Los Angeles has 1. Seattle is the top 25 of 144.
-- Running this again does not replace a list that is already stored.

do $$
declare
  cons name;
begin
  for cons in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.collections'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%cheap-eats%'
  loop
    execute format('alter table public.collections drop constraint %I', cons);
  end loop;
end $$;

alter table public.collections drop constraint if exists collections_slug_check;
alter table public.collections
  add constraint collections_slug_check
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

with owner as (
  select id
  from public.profiles
  where is_owner
  order by created_at
  limit 1
),
inserted as (
  insert into public.collections (city, title, slug, blurb, position, created_by, updated_by)
  select cities.city, 'Cheap eats', 'cheap-eats', null, 0, owner.id, owner.id
  from owner
  cross join (values ('seattle'), ('eastside'), ('la')) as cities(city)
  on conflict (city, slug) do nothing
  returning id, city
)
insert into public.collection_places (collection_id, place_id, position, updated_by)
select inserted.id, seed.place_id, seed.position, owner.id
from inserted
join owner on true
join (values
    ('seattle', 'un-bien', 0),
    ('seattle', 'tat-s-delicatessen', 1),
    ('seattle', 'mee-sum-pastry', 2),
    ('seattle', 'the-other-coast-cafe', 3),
    ('seattle', 'bottega-gabriele', 4),
    ('seattle', 'hushy-s-sandwiches', 5),
    ('seattle', 'layers', 6),
    ('seattle', 'anchorhead-coffee', 7),
    ('seattle', 'salumi', 8),
    ('seattle', 'beecher-s-handmade-cheese', 9),
    ('seattle', 'cobb-s-pike-place-popcorn', 10),
    ('seattle', 'copper-tree-coffee-house', 11),
    ('seattle', 'bell-s-cookie-co', 12),
    ('seattle', 'baxter-frost', 13),
    ('seattle', 'pufftown-bakehouse', 14),
    ('seattle', 'chung-chun-rice-dog', 15),
    ('seattle', 'tall-grass-bakery', 16),
    ('seattle', 'monorail-espresso', 17),
    ('seattle', 'the-shop-by-porter', 18),
    ('seattle', 'fuji-bakery', 19),
    ('seattle', 'petit-pierre-bakery', 20),
    ('seattle', 'olympia-coffee', 21),
    ('seattle', 'kitchen-market', 22),
    ('seattle', 'cheba-hut-toasted-subs', 23),
    ('seattle', 'franz-bakery-outlet', 24),
    ('eastside', 'third-culture-coffee', 0),
    ('eastside', 'sushi-zone', 1),
    ('la', 'starbucks-coffee-company-2', 0)
) as seed(city, place_id, position) on seed.city = inserted.city;
