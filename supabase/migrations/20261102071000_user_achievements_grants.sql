-- Signed-in users could not read or store their earned dates: the table had no select/insert grant.
-- RLS still limits every row to its owner.
grant select, insert on table public.user_achievements to authenticated;
