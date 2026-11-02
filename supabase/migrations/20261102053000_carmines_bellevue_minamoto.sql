-- Augusto, Nov 1, 2026: Carmine's Bellevue 8.7 (was 9.4), Minamoto 8.3 (was 9.4). Seattle Carmine's 8.8 (was 9.5).

insert into public.house_scores (place_id, score, updated_by)
values
  ('carmine-s', 8.8, '6b6b61b0-983d-4772-9d80-836d3c43c235'::uuid),
  ('carmines', 8.7, '6b6b61b0-983d-4772-9d80-836d3c43c235'::uuid),
  ('minamoto', 8.3, '6b6b61b0-983d-4772-9d80-836d3c43c235'::uuid)
on conflict (place_id) do update
set score = excluded.score,
    updated_by = excluded.updated_by,
    updated_at = now();
