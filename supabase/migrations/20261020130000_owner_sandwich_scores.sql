-- Augusto's sandwich scores from the old site.
-- Public headline scores are house_scores (anon can select). Catalog gustoScore stays null.
-- Run in the Supabase SQL editor. The owner profile must already exist.

insert into public.house_scores (place_id, score, updated_by)
values
  ('un-bien', 9.4, '6b6b61b0-983d-4772-9d80-836d3c43c235'),
  ('tat-s-delicatessen', 9.1, '6b6b61b0-983d-4772-9d80-836d3c43c235'),
  ('the-other-coast-cafe', 8.8, '6b6b61b0-983d-4772-9d80-836d3c43c235'),
  ('bottega-gabriele', 8.6, '6b6b61b0-983d-4772-9d80-836d3c43c235'),
  ('hushy-s-sandwiches', 8.4, '6b6b61b0-983d-4772-9d80-836d3c43c235'),
  ('saigon-drip-cafe', 8.3, '6b6b61b0-983d-4772-9d80-836d3c43c235'),
  ('layers', 8.1, '6b6b61b0-983d-4772-9d80-836d3c43c235'),
  ('salumi', 8.0, '6b6b61b0-983d-4772-9d80-836d3c43c235')
on conflict (place_id) do update
set score = excluded.score,
    updated_by = excluded.updated_by,
    updated_at = now();
