-- Gusto's Guide social schema. Apply in the Supabase SQL editor.
-- Auth: Supabase email/password. Local mode never touches this database.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  handle text unique not null,
  is_owner boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id)
);

create table if not exists public.place_status (
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id text not null,
  status text not null check (status in ('togo', 'been')),
  updated_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table if not exists public.rankings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id text not null,
  bucket text not null check (bucket in ('loved', 'liked', 'fine', 'didnt')),
  score numeric(3,1) not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('been', 'saved', 'rated', 'list', 'photo')),
  place_id text,
  list_title text,
  body text not null default '',
  score numeric(3,1),
  created_at timestamptz not null default now()
);

create table if not exists public.activity_likes (
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create table if not exists public.activity_comments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  shared boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.list_collaborators (
  list_id uuid not null references public.lists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (list_id, user_id)
);

create table if not exists public.list_places (
  list_id uuid not null references public.lists (id) on delete cascade,
  place_id text not null,
  position int not null default 0,
  primary key (list_id, place_id)
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  place_ids text[] not null default '{}',
  dates date[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.plan_members (
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rsvp text check (rsvp in ('yes', 'no', 'maybe')),
  primary key (plan_id, user_id)
);

create table if not exists public.plan_votes (
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id text,
  vote_date date,
  primary key (plan_id, user_id)
);

create table if not exists public.place_photos (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  is_owner boolean not null default false,
  storage_path text not null,
  width int,
  height int,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.place_status enable row level security;
alter table public.rankings enable row level security;
alter table public.activities enable row level security;
alter table public.activity_likes enable row level security;
alter table public.activity_comments enable row level security;
alter table public.lists enable row level security;
alter table public.list_collaborators enable row level security;
alter table public.list_places enable row level security;
alter table public.plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.plan_votes enable row level security;
alter table public.place_photos enable row level security;

create policy "profiles are readable" on public.profiles for select using (true);
create policy "edit own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "follows are readable" on public.follows for select using (true);
create policy "manage own follows" on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

create policy "status readable" on public.place_status for select using (true);
create policy "edit own status" on public.place_status for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "rankings readable" on public.rankings for select using (true);
create policy "edit own rankings" on public.rankings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "activities readable" on public.activities for select using (true);
create policy "write own activities" on public.activities for insert with check (auth.uid() = user_id);
create policy "delete own activities" on public.activities for delete using (auth.uid() = user_id);

create policy "likes readable" on public.activity_likes for select using (true);
create policy "like as yourself" on public.activity_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "comments readable" on public.activity_comments for select using (true);
create policy "comment as yourself" on public.activity_comments for insert with check (auth.uid() = user_id);
create policy "delete own comments" on public.activity_comments for delete using (auth.uid() = user_id);

create policy "lists readable" on public.lists for select using (true);
create policy "owner edits list" on public.lists for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "collaborators readable" on public.list_collaborators for select using (true);
create policy "list owner manages collaborators" on public.list_collaborators for all using (
  exists (select 1 from public.lists where lists.id = list_id and lists.owner_id = auth.uid())
) with check (
  exists (select 1 from public.lists where lists.id = list_id and lists.owner_id = auth.uid())
);

create policy "list places readable" on public.list_places for select using (true);
create policy "members edit list places" on public.list_places for all using (
  exists (
    select 1 from public.lists
    where lists.id = list_id
      and (lists.owner_id = auth.uid() or exists (
        select 1 from public.list_collaborators c where c.list_id = lists.id and c.user_id = auth.uid()
      ))
  )
) with check (
  exists (
    select 1 from public.lists
    where lists.id = list_id
      and (lists.owner_id = auth.uid() or exists (
        select 1 from public.list_collaborators c where c.list_id = lists.id and c.user_id = auth.uid()
      ))
  )
);

create policy "plans readable" on public.plans for select using (true);
create policy "host edits plan" on public.plans for all using (auth.uid() = host_id) with check (auth.uid() = host_id);

create policy "plan members readable" on public.plan_members for select using (true);
create policy "rsvp yourself" on public.plan_members for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "votes readable" on public.plan_votes for select using (true);
create policy "vote yourself" on public.plan_votes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "photos readable" on public.place_photos for select using (true);
create policy "upload own photo row" on public.place_photos for insert with check (auth.uid() = user_id);
create policy "delete own photo row" on public.place_photos for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('place-photos', 'place-photos', true)
on conflict (id) do nothing;

create policy "public photo reads" on storage.objects for select
  using (bucket_id = 'place-photos');

create policy "users upload own folder" on storage.objects for insert
  with check (
    bucket_id = 'place-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users delete own folder" on storage.objects for delete
  using (
    bucket_id = 'place-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
