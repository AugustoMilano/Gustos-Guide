-- Augusto cut these places from Gusto's Guide on Oct 25 2026.
-- Drop any published score so a later import cannot revive the number.

delete from public.house_scores
where place_id in (
  'dark-room',
  'cascadia-pizza',
  'katsu-burger',
  'matts-rotisserie',
  'just-poke-redmond'
);
