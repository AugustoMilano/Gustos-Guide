-- Burgermaster on NE Northup Way is the Bellevue room (Northwest Bellevue).
-- updated_by is whoever last scored place_id maiz. No row is written if that score is missing.

insert into public.house_scores (place_id, score, updated_by)
select 'burgermaster', 6.8, owner.updated_by
from public.house_scores owner
where owner.place_id = 'maiz'
on conflict (place_id) do update
set score = excluded.score,
    updated_by = excluded.updated_by,
    updated_at = now();
