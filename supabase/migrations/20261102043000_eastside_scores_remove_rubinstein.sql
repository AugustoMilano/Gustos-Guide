-- Eastside Gusto's Scores given by Augusto by voice, Nov 1, 2026.
-- Rubinstein Bagels (Downtown Redmond) removed for good the same day.
-- updated_by is whoever last scored place_id maiz. No row is written if that score is missing.

insert into public.house_scores (place_id, score, updated_by)
select seed.place_id, seed.score, owner.updated_by
from public.house_scores owner
join (values
  ('tavern-hall'::text, 7.4::numeric),
  ('13-coins', 5.8),
  ('din-tai-fung-bellevue', 8.7),
  ('farine-bakery', 6.8),
  ('third-culture-coffee', 6.5),
  ('falafel-fresh', 7.3),
  ('moss-bay-hall', 6.8),
  ('mowood', 7.5),
  ('the-british-pantry', 6.5),
  ('beachhouse-bar-and-grill', 6.7),
  ('ginza', 7.1),
  ('monsoon-bellevue', 6.2),
  ('postdoc-brewing', 8.0),
  ('bellevue-brewing', 7.4),
  ('lexperience-paris', 7.0),
  ('ramen-nori', 8.1)
) as seed(place_id, score) on true
where owner.place_id = 'maiz'
on conflict (place_id) do update
set score = excluded.score,
    updated_by = excluded.updated_by,
    updated_at = now();

delete from public.house_scores
where place_id = 'rubinstein-bagels';
