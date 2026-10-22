-- Allow the Peninsula on house collections.
-- East Bay and North Bay are not separate areas: each has fewer than 8 places,
-- so they stay inside San Francisco or the Peninsula. See the cheap-eats migration.

do $$
declare
  cons name;
begin
  for cons in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.collections'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%seattle%'
      and pg_get_constraintdef(con.oid) like '%eastside%'
      and pg_get_constraintdef(con.oid) not like '%slug%'
  loop
    execute format('alter table public.collections drop constraint %I', cons);
  end loop;
end $$;

alter table public.collections
  add constraint collections_city_check
  check (city in ('seattle', 'eastside', 'la', 'sf', 'peninsula'));
