-- A collection holds 25 places. Existing rows stay; the 26th insert is rejected.
-- Apply in the Supabase SQL editor. supabase/schema.sql carries the same trigger.

create or replace function public.limit_collection_places()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  -- Re-saving a place already on the list is not a new row.
  if exists (
    select 1
    from public.collection_places
    where collection_id = new.collection_id
      and place_id = new.place_id
  ) then
    return new;
  end if;
  select count(*) into n
  from public.collection_places
  where collection_id = new.collection_id;
  if n >= 25 then
    raise exception '25 places is the limit.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists collection_places_limit on public.collection_places;
create trigger collection_places_limit
  before insert on public.collection_places
  for each row execute function public.limit_collection_places();

revoke all on function public.limit_collection_places() from public, anon, authenticated;
