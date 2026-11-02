-- Rolls & Rolls Plus Sushi (Downtown Bellevue), Gusto's Score 6.7 from Augusto, Nov 1, 2026.

insert into public.house_scores (place_id, score, updated_by)
values ('rolls-and-rolls', 6.7, '6b6b61b0-983d-4772-9d80-836d3c43c235'::uuid)
on conflict (place_id) do update
set score = excluded.score,
    updated_by = excluded.updated_by,
    updated_at = now();
