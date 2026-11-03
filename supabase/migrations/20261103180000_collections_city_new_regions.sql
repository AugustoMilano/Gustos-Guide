-- Allow Vancouver, Portland, New York, Pullman, and Moscow on house collections.
-- Apply after 20261022060000_collections_city_sandiego.sql.

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
  check (city in ('seattle', 'eastside', 'la', 'sf', 'eastbay', 'peninsula', 'northbay', 'sandiego', 'vancouver', 'portland', 'nyc', 'pullman', 'moscow'));
