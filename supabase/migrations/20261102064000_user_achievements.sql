-- Achievements: the date each badge was first earned, per user. Insert-only; never updated.
create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null check (char_length(badge_id) between 1 and 120),
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
alter table public.user_achievements enable row level security;
create policy "own achievements read" on public.user_achievements for select to authenticated using (auth.uid() = user_id);
create policy "own achievements insert" on public.user_achievements for insert to authenticated with check (auth.uid() = user_id);
-- No update policy: an earned date never changes once stored.
