-- Reorder stored Cheap eats by Gusto's Score, high to low.
-- Unscored places stay after every scored place, in their previous order.
-- Ties keep the previous order.
-- Snapshot of the live house_scores table plus the 2026-10-22 batch scores.
-- updated_by is whoever last scored place_id maiz. No row is written if that score is missing.

update public.collection_places as cp
set position = seed.position,
    updated_by = owner.updated_by
from public.collections as c
join public.house_scores as owner on owner.place_id = 'maiz'
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
    ('seattle', 'tall-grass-bakery', 10),
    ('seattle', 'cobb-s-pike-place-popcorn', 11),
    ('seattle', 'copper-tree-coffee-house', 12),
    ('seattle', 'bell-s-cookie-co', 13),
    ('seattle', 'baxter-frost', 14),
    ('seattle', 'pufftown-bakehouse', 15),
    ('seattle', 'chung-chun-rice-dog', 16),
    ('seattle', 'monorail-espresso', 17),
    ('seattle', 'the-shop-by-porter', 18),
    ('seattle', 'fuji-bakery', 19),
    ('seattle', 'petit-pierre-bakery', 20),
    ('seattle', 'olympia-coffee', 21),
    ('seattle', 'kitchen-market', 22),
    ('seattle', 'cheba-hut-toasted-subs', 23),
    ('seattle', 'franz-bakery-outlet', 24)
) as seed(city, place_id, position)
  on seed.city = c.city
 and c.slug = 'cheap-eats'
where cp.collection_id = c.id
  and cp.place_id = seed.place_id;
