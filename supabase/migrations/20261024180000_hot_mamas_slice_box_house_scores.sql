-- Gusto's Score: Hot Mama's Pizza 7.6, Slice Box Pizza 7.0.
-- updated_by is whoever last scored place_id maiz. No row is written if that score is missing.

insert into public.house_scores (place_id, score, updated_by)
select seed.place_id, seed.score, owner.updated_by
from public.house_scores owner
join (values
  ('hot-mamas-pizza'::text, 7.6::numeric),
  ('slice-box-pizza'::text, 7.0::numeric)
) as seed(place_id, score) on true
where owner.place_id = 'maiz'
on conflict (place_id) do update
set score = excluded.score,
    updated_by = excluded.updated_by,
    updated_at = now();
