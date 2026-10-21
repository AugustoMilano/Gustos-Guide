-- Owner triage for Quick Score. "Haven't been" is not a public score and
-- not a personal Been / To go mark. Only the house owner can read or write it.
-- Safe to re-run.

create table if not exists public.house_marks (
  place_id text primary key,
  status text not null check (status in ('havent')),
  updated_by uuid not null references public.profiles (id),
  updated_at timestamptz not null default now()
);

alter table public.house_marks enable row level security;

drop policy if exists "house_marks_select" on public.house_marks;
create policy "house_marks_select" on public.house_marks
  for select to authenticated
  using (public.is_house_owner());

drop policy if exists "house_marks_write" on public.house_marks;
create policy "house_marks_write" on public.house_marks
  for all to authenticated
  using (public.is_house_owner())
  with check (public.is_house_owner() and updated_by = auth.uid());

revoke all on table public.house_marks from public, anon, authenticated;
grant select, insert, update, delete on table public.house_marks to authenticated;
