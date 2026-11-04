-- Pullman and Moscow Gusto's Scores given by Augusto, Nov 3, 2026 (32 places).
-- Dutch Bros Coffee (Moscow) removed for good the same day.
-- updated_by is whoever last scored place_id maiz. No row is written if that score is missing.

insert into public.house_scores (place_id, score, updated_by)
select seed.place_id, seed.score, owner.updated_by
from public.house_scores owner
join (values
  ('paradise-creek-brewery'::text, 6.8::numeric),
  ('crybaby-cafe', 6.9),
  ('panhandle-cone-coffee', 8.7),
  ('tin-tan-tacos', 6.0),
  ('tokyo-seoul', 6.5),
  ('the-breakfast-club', 8.6),
  ('mingles-bar-and-grill', 6.8),
  ('valhalla-bar-and-grill', 7.0),
  ('mela-bangladeshi-cuisine', 7.0),
  ('hunga-dunga', 6.3),
  ('roost-coffee-market', 7.6),
  ('einstein-bros-bagels', 6.6),
  ('heros-n-sports', 7.1),
  ('the-emporium', 6.0),
  ('humble-burger', 7.4),
  ('porch-light-pizza', 6.4),
  ('one-world-cafe', 6.9),
  ('the-coug', 7.5),
  ('the-old-european-restaurant', 6.8),
  ('ferdinand-s-ice-cream-shoppe', 9.0),
  ('south-fork-public-house', 6.1),
  ('the-black-cypress', 8.9),
  ('rico-s-public-house', 7.8),
  ('knead-cafe-patisserie', 8.7),
  ('maialina-pizzeria-napoletana', 7.8),
  ('la-casa-lopez', 8.5),
  ('beef-company', 8.2),
  ('taqueria-las-torres', 7.2),
  ('lodgepole', 7.3),
  ('moscow-bagel-and-deli', 8.2),
  ('doms-donuts', 7.0),
  ('the-land', 7.1)
) as seed(place_id, score) on true
where owner.place_id = 'maiz'
on conflict (place_id) do update
set score = excluded.score,
    updated_by = excluded.updated_by,
    updated_at = now();

delete from public.house_scores
where place_id = 'dutch-bros-coffee';
