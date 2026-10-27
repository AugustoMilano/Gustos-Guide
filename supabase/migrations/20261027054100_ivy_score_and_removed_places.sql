-- The Ivy (Los Angeles) gets Gusto's Score 8.8, the number Augusto gave as Ivy at the Shore.
-- updated_by is whoever last scored place_id maiz. No row is written if that score is missing.
-- The six Seattle places Augusto cut have no published score left to revive.

insert into public.house_scores (place_id, score, updated_by)
select seed.place_id, seed.score, owner.updated_by
from public.house_scores owner
join (values
  ('the-ivy'::text, 8.8::numeric)
) as seed(place_id, score) on true
where owner.place_id = 'maiz'
on conflict (place_id) do update
set score = excluded.score,
    updated_by = excluded.updated_by,
    updated_at = now();

delete from public.house_scores
where place_id in (
  'seattle-meowtropolitan',
  'joe-the-juice',
  'unicorn',
  'pacha-collective',
  'pie-bar',
  'sugar-bakery-cafe'
);
