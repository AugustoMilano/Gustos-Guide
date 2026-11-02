-- Augusto, Nov 1, 2026: both Daniel's Broiler locations 9.0 (Seattle was 9.6, Bellevue was 8.8).
insert into public.house_scores (place_id, score, updated_by)
values
  ('daniel-s-broiler', 9.0, '6b6b61b0-983d-4772-9d80-836d3c43c235'::uuid),
  ('daniels-broiler', 9.0, '6b6b61b0-983d-4772-9d80-836d3c43c235'::uuid)
on conflict (place_id) do update
set score = excluded.score,
    updated_by = excluded.updated_by,
    updated_at = now();
