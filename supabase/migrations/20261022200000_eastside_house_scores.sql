-- Augusto's Gusto's Scores for Eastside rooms added 2026-10-22.
-- updated_by is whoever last scored place_id maiz. No row is written if that score is missing.

insert into public.house_scores (place_id, score, updated_by)
select seed.place_id, seed.score, owner.updated_by
from public.house_scores owner
join (values
  ('la-mar-bellevue'::text, 9.8::numeric),
  ('ascend-prime-steak-and-sushi'::text, 9.7::numeric),
  ('daniels-broiler'::text, 9.6::numeric),
  ('cantina-monarca'::text, 9.4::numeric),
  ('carmines'::text, 9.4::numeric),
  ('minamoto'::text, 9.4::numeric),
  ('water-grill-bellevue'::text, 9.4::numeric),
  ('cantinetta-bellevue'::text, 9.3::numeric),
  ('stk-bellevue'::text, 8.5::numeric),
  ('earls-kitchen-bar'::text, 8.1::numeric),
  ('barons-sino-kitchen-and-bar'::text, 8.0::numeric),
  ('farzi-cafe'::text, 7.7::numeric),
  ('hokkaido-ramen-santouka'::text, 7.5::numeric),
  ('japonessa'::text, 7.4::numeric),
  ('desi-tadka'::text, 7.3::numeric),
  ('dough-zone-bellevue'::text, 7.1::numeric),
  ('rolls-and-rolls'::text, 6.8::numeric),
  ('ezells-famous-chicken'::text, 6.8::numeric),
  ('fern-thai-on-main'::text, 6.7::numeric),
  ('fob-poke-bar-bellevue'::text, 6.9::numeric),
  ('pagliacci-pizza'::text, 6.9::numeric),
  ('central-bar-restaurant'::text, 6.5::numeric),
  ('broiler-bay'::text, 6.5::numeric),
  ('wild-ginger'::text, 5.7::numeric),
  ('castilla'::text, 4.8::numeric),
  ('civility-and-unrest'::text, 4.7::numeric),
  ('kura-revolving-sushi'::text, 4.6::numeric),
  ('520-bar-and-grill'::text, 4.2::numeric),
  ('joey-bellevue'::text, 4.2::numeric),
  ('semicolon-cafe'::text, 3.5::numeric),
  ('spark-pizza'::text, 8.9::numeric),
  ('a-ma-chicken-rice'::text, 8.2::numeric),
  ('jacks-bbq'::text, 7.2::numeric),
  ('just-poke-redmond'::text, 7.2::numeric),
  ('noburu-ramen-and-sushi'::text, 7.0::numeric),
  ('kobuta-and-ookami-redmond'::text, 6.4::numeric),
  ('matador-redmond'::text, 5.9::numeric),
  ('el-encanto'::text, 8.1::numeric),
  ('vinason-pho-kitchen'::text, 7.3::numeric),
  ('the-box'::text, 7.3::numeric),
  ('island-soul-kirkland'::text, 7.1::numeric),
  ('cactus-kirkland'::text, 6.8::numeric),
  ('shawns-cafe-and-bakery'::text, 8.3::numeric),
  ('paparepas'::text, 7.6::numeric),
  ('the-coalman'::text, 7.0::numeric),
  ('naan-n-curry'::text, 6.9::numeric),
  ('xochi'::text, 6.9::numeric)
) as seed(place_id, score) on owner.place_id = 'maiz'
on conflict (place_id) do update
set score = excluded.score,
    updated_by = excluded.updated_by,
    updated_at = now();
