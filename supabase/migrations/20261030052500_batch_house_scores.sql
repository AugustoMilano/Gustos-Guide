-- Gusto's Scores set by Augusto, Oct 29, 2026.
-- updated_by is whoever last scored place_id maiz. No row is written if that score is missing.

insert into public.house_scores (place_id, score, updated_by)
select seed.place_id, seed.score, owner.updated_by
from public.house_scores owner
join (values
  ('catch'::text, 9.3::numeric),
  ('la-mar-bellevue', 8.8),
  ('ascend-prime-steak-and-sushi', 9.0),
  ('daniels-broiler', 8.8),
  ('cantina-monarca', 8.1),
  ('water-grill-bellevue', 8.9),
  ('limoncello', 8.4),
  ('cantinetta-bellevue', 8.3)
) as seed(place_id, score) on true
where owner.place_id = 'maiz'
on conflict (place_id) do update
set score = excluded.score,
    updated_by = excluded.updated_by,
    updated_at = now();
