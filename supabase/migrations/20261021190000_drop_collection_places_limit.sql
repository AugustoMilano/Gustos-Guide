-- Lift the 25-place block. It is a target for house collections, not a rule.
-- Already applied in production as 20261021170000_collection_places_limit.sql.
-- Existing rows stay. Nothing rejects a longer collection.

drop trigger if exists collection_places_limit on public.collection_places;
drop function if exists public.limit_collection_places();
