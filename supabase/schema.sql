-- Gusto's Guide social schema.
-- Safe to re-run. Apply in the Supabase SQL editor or with psql.
-- The project has RLS on and "automatically expose new tables" off, so this
-- file grants anon/authenticated explicitly and defines every policy.
-- Nothing is world-readable unless a policy below says so.
--
-- After the owner signs up once, mark that account (SQL editor, as postgres):
--   update public.profiles set is_owner = true where id = '<auth user uuid>';
-- The browser cannot set is_owner. A before-insert trigger forces it false,
-- and later updates from authenticated keep the previous value.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  handle text unique not null,
  is_owner boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now()
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
  score numeric(3,1) not null check (score >= 0 and score <= 10),
  updated_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

-- Gusto's Score. Public read. Only profiles.is_owner may write.
create table if not exists public.house_scores (
  place_id text primary key,
  score numeric(3,1) not null check (score >= 0 and score <= 10),
  updated_by uuid not null references public.profiles (id),
  updated_at timestamptz not null default now()
);

-- Quick Score triage. Owner-only. Not a public score and not Been / To go.
create table if not exists public.house_marks (
  place_id text primary key,
  status text not null check (status in ('havent')),
  updated_by uuid not null references public.profiles (id),
  updated_at timestamptz not null default now()
);

-- House collections. Public read. Owner writes via is_house_owner().
-- Cheap eats is not a row: it is every open place priced $.
-- blurb stays null unless the owner writes a note. Titles are short labels.
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  city text not null check (city in ('seattle', 'eastside', 'la')),
  title text not null check (char_length(title) between 1 and 40 and title = btrim(title)),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and slug <> 'cheap-eats'),
  blurb text check (blurb is null or (char_length(blurb) between 1 and 280 and blurb = btrim(blurb))),
  position int not null default 0 check (position >= 0),
  created_by uuid not null references public.profiles (id),
  updated_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city, slug)
);

create table if not exists public.collection_places (
  collection_id uuid not null references public.collections (id) on delete cascade,
  place_id text not null check (char_length(place_id) between 1 and 200),
  position int not null default 0 check (position >= 0),
  updated_by uuid not null references public.profiles (id),
  primary key (collection_id, place_id)
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

create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  visibility text not null default 'private' check (visibility in ('private', 'friends', 'public')),
  cover_place_id text,
  invite_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guide_items (
  guide_id uuid not null references public.guides (id) on delete cascade,
  place_id text not null,
  position int not null default 0,
  primary key (guide_id, place_id)
);

create table if not exists public.guide_collaborators (
  guide_id uuid not null references public.guides (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (guide_id, user_id)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid references public.profiles (id) on delete cascade,
  invite_email text,
  invite_token text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_target check (addressee_id is not null or invite_email is not null or invite_token is not null),
  constraint friendships_not_self check (addressee_id is null or addressee_id <> requester_id)
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  shared boolean not null default false,
  visibility text not null default 'private' check (visibility in ('private', 'friends', 'public')),
  invite_token text,
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
  locked boolean not null default false,
  vibe text,
  invite_token text,
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
  vote_time text,
  primary key (plan_id, user_id)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('been', 'saved', 'rated', 'list', 'photo')),
  place_id text,
  list_id text,
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

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  href text not null default '/',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Columns added after the first version of this file.
alter table public.lists add column if not exists visibility text not null default 'private';
alter table public.lists add column if not exists invite_token text;
alter table public.plans add column if not exists locked boolean not null default false;
alter table public.plans add column if not exists vibe text;
alter table public.plans add column if not exists invite_token text;
alter table public.plan_votes add column if not exists vote_time text;
alter table public.activities add column if not exists list_id text;
alter table public.guides add column if not exists cover_place_id text;
alter table public.guides add column if not exists invite_token text;
alter table public.guides add column if not exists emoji text;
alter table public.guides add column if not exists accent text;
alter table public.guide_items add column if not exists note text;
alter table public.guide_items add column if not exists added_at timestamptz;
alter table public.friendships drop constraint if exists friendships_target;
alter table public.friendships add constraint friendships_target check (
  addressee_id is not null or invite_email is not null or invite_token is not null
);
alter table public.profiles add column if not exists avatar_url text;

alter table public.lists drop constraint if exists lists_visibility_check;
alter table public.lists add constraint lists_visibility_check check (visibility in ('private', 'friends', 'public'));

-- Copy comments forward if an older activity_comments table is present.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'activity_comments'
  ) then
    insert into public.comments (id, activity_id, user_id, body, created_at)
    select id, activity_id, user_id, body, created_at
    from public.activity_comments
    on conflict (id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create unique index if not exists guides_invite_token_idx on public.guides (invite_token) where invite_token is not null;
create unique index if not exists lists_invite_token_idx on public.lists (invite_token) where invite_token is not null;
create unique index if not exists plans_invite_token_idx on public.plans (invite_token) where invite_token is not null;
create unique index if not exists friendships_invite_token_idx on public.friendships (invite_token) where invite_token is not null;
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id))
  where addressee_id is not null and status in ('pending', 'accepted');

create index if not exists place_status_place_idx on public.place_status (place_id);
create index if not exists rankings_place_idx on public.rankings (place_id);
create index if not exists house_scores_updated_idx on public.house_scores (updated_at desc);
create unique index if not exists collections_city_title_idx on public.collections (city, lower(title));
create index if not exists collections_city_position_idx on public.collections (city, position);
create index if not exists collection_places_order_idx on public.collection_places (collection_id, position);
create index if not exists place_photos_place_idx on public.place_photos (place_id);
create index if not exists place_photos_user_idx on public.place_photos (user_id);
create index if not exists place_photos_owner_idx on public.place_photos (place_id) where is_owner;
create index if not exists guides_owner_idx on public.guides (owner_id);
create index if not exists guides_visibility_idx on public.guides (visibility);
create index if not exists guide_items_place_idx on public.guide_items (place_id);
create index if not exists guide_collaborators_user_idx on public.guide_collaborators (user_id);
create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_email_idx on public.friendships (invite_email);
create index if not exists friendships_status_idx on public.friendships (status);
create index if not exists lists_owner_idx on public.lists (owner_id);
create index if not exists list_collaborators_user_idx on public.list_collaborators (user_id);
create index if not exists plans_host_idx on public.plans (host_id);
create index if not exists plan_members_user_idx on public.plan_members (user_id);
create index if not exists activities_user_created_idx on public.activities (user_id, created_at desc);
create index if not exists activities_place_idx on public.activities (place_id);
create index if not exists comments_activity_idx on public.comments (activity_id);
create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers (security definer so policies do not recurse through RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_house_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles where id = auth.uid() and is_owner
  );
$$;

create or replace function public.friends_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select other is not null and auth.uid() is not null and exists (
    select 1 from public.friendships
    where status = 'accepted'
      and (
        (requester_id = auth.uid() and addressee_id = other)
        or (addressee_id = auth.uid() and requester_id = other)
      )
  );
$$;

create or replace function public.can_see_guide(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.guides g
    where g.id = target
      and (
        g.visibility = 'public'
        or g.owner_id = auth.uid()
        or exists (
          select 1 from public.guide_collaborators c
          where c.guide_id = g.id and c.user_id = auth.uid()
        )
        or (g.visibility = 'friends' and public.friends_with(g.owner_id))
      )
  );
$$;

create or replace function public.can_edit_guide(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.guides g
    where g.id = target
      and (
        g.owner_id = auth.uid()
        or exists (
          select 1 from public.guide_collaborators c
          where c.guide_id = g.id and c.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.can_see_list(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lists l
    where l.id = target
      and (
        l.visibility = 'public'
        or l.owner_id = auth.uid()
        or exists (
          select 1 from public.list_collaborators c
          where c.list_id = l.id and c.user_id = auth.uid()
        )
        or (l.visibility = 'friends' and public.friends_with(l.owner_id))
      )
  );
$$;

create or replace function public.can_edit_list(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lists l
    where l.id = target
      and (
        l.owner_id = auth.uid()
        or exists (
          select 1 from public.list_collaborators c
          where c.list_id = l.id and c.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.is_plan_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.plans where id = target and host_id = auth.uid()
  ) or exists (
    select 1 from public.plan_members where plan_id = target and user_id = auth.uid()
  );
$$;

create or replace function public.can_see_activity(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.activities a
    where a.id = target
      and (a.user_id = auth.uid() or public.friends_with(a.user_id))
  );
$$;

create or replace function public.notify_user(target uuid, body text, href text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target is null or target = auth.uid() then
    return;
  end if;
  insert into public.notifications (user_id, body, href)
  values (target, body, coalesce(href, '/'));
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile trigger, owner flag, photo stamp, notification triggers
-- ---------------------------------------------------------------------------

create or replace function public.protect_profile_owner()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.is_owner := false;
    return new;
  end if;
  if new.id is distinct from old.id then
    new.id := old.id;
  end if;
  if new.is_owner is distinct from old.is_owner
     and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    new.is_owner := old.is_owner;
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  n int := 0;
  display text;
  avatar text;
  handle_source text;
begin
  display := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Guest'
  );
  avatar := coalesce(
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data->>'picture'), '')
  );
  if avatar is not null then
    avatar := replace(avatar, '_normal.', '_400x400.');
  end if;
  handle_source := coalesce(
    nullif(trim(new.raw_user_meta_data->>'preferred_username'), ''),
    nullif(trim(new.raw_user_meta_data->>'user_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'username'), '')
  );
  if handle_source is not null then
    -- lower() first. The old order deleted uppercase letters (AugustoTMilano -> ugustoilano).
    base := regexp_replace(regexp_replace(lower(handle_source), '^@', ''), '[^a-z0-9_]+', '', 'g');
  else
    base := regexp_replace(lower(display), '[^a-z0-9]+', '', 'g');
  end if;
  if base is null or base = '' then
    base := 'guest';
  end if;
  base := left(base, 24);
  candidate := base;
  while exists (select 1 from public.profiles where handle = candidate and id <> new.id) loop
    n := n + 1;
    candidate := left(base, 18) || n::text;
  end loop;
  insert into public.profiles (id, name, handle, is_owner, avatar_url)
  values (new.id, left(display, 80), candidate, false, nullif(avatar, ''))
  on conflict (id) do nothing;

  update public.friendships
    set addressee_id = new.id, updated_at = now()
    where invite_email = lower(coalesce(new.email, ''))
      and addressee_id is null
      and status = 'pending'
      and requester_id <> new.id;
  return new;
end;
$$;

create or replace function public.stamp_place_photo()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  new.user_id := auth.uid();
  new.is_owner := public.is_house_owner();
  return new;
end;
$$;

create or replace function public.on_comment_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select user_id into owner from public.activities where id = new.activity_id;
  perform public.notify_user(owner, 'New comment on your post.', '/feed');
  return new;
end;
$$;

create or replace function public.on_friendship_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' and new.addressee_id is not null then
    perform public.notify_user(new.addressee_id, 'New friend request.', '/feed');
  elsif tg_op = 'UPDATE' and new.status = 'pending' and new.addressee_id is not null and old.addressee_id is null then
    perform public.notify_user(new.addressee_id, 'New friend request.', '/feed');
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform public.notify_user(new.requester_id, 'Friend request accepted.', '/feed');
  end if;
  return new;
end;
$$;

create or replace function public.on_plan_member_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_title text;
begin
  if new.user_id = auth.uid() then
    return new;
  end if;
  select title into plan_title from public.plans where id = new.plan_id;
  perform public.notify_user(new.user_id, 'You are invited: ' || coalesce(plan_title, 'a plan') || '.', '/plan/' || new.plan_id::text);
  return new;
end;
$$;

drop trigger if exists profiles_protect_owner on public.profiles;
create trigger profiles_protect_owner
  before insert or update on public.profiles
  for each row execute function public.protect_profile_owner();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists place_photos_stamp on public.place_photos;
create trigger place_photos_stamp
  before insert or update on public.place_photos
  for each row execute function public.stamp_place_photo();

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify
  after insert on public.comments
  for each row execute function public.on_comment_notify();

drop trigger if exists friendships_notify on public.friendships;
create trigger friendships_notify
  after insert or update on public.friendships
  for each row execute function public.on_friendship_notify();

drop trigger if exists plan_members_notify on public.plan_members;
create trigger plan_members_notify
  after insert on public.plan_members
  for each row execute function public.on_plan_member_notify();

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

-- ---------------------------------------------------------------------------
-- Friend and invite RPCs
-- ---------------------------------------------------------------------------

create or replace function public.request_friend(target_handle text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  other uuid;
  existing uuid;
begin
  if me is null then
    raise exception 'Sign in first.';
  end if;
  select id into other from public.profiles where handle = lower(trim(coalesce(target_handle, '')));
  if other is null then
    raise exception 'No one uses that username.';
  end if;
  if other = me then
    raise exception 'That username is you.';
  end if;
  select id into existing from public.friendships
    where status in ('pending', 'accepted')
      and (
        (requester_id = me and addressee_id = other)
        or (requester_id = other and addressee_id = me)
      )
    limit 1;
  if existing is not null then
    return existing;
  end if;
  insert into public.friendships (requester_id, addressee_id, status)
  values (me, other, 'pending')
  returning id into existing;
  return existing;
end;
$$;

create or replace function public.invite_friend_email(target_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  clean text := lower(trim(coalesce(target_email, '')));
  existing uuid;
  token text;
begin
  if me is null then
    raise exception 'Sign in first.';
  end if;
  if clean !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That email does not look right.';
  end if;
  select id into existing from auth.users where lower(email) = clean;
  if existing = me then
    raise exception 'That email is yours.';
  end if;
  if existing is not null then
    perform public.request_friend((select handle from public.profiles where id = existing));
    return null;
  end if;
  token := encode(extensions.gen_random_bytes(16), 'hex');
  insert into public.friendships (requester_id, invite_email, invite_token, status)
  values (me, clean, token, 'pending');
  return token;
end;
$$;

create or replace function public.create_friend_link()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  token text;
begin
  if me is null then
    raise exception 'Sign in first.';
  end if;
  token := encode(extensions.gen_random_bytes(16), 'hex');
  insert into public.friendships (requester_id, invite_token, status)
  values (me, token, 'pending');
  return token;
end;
$$;

create or replace function public.respond_friend(friendship uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  update public.friendships
    set status = case when accept then 'accepted' else 'declined' end,
        updated_at = now()
    where id = friendship
      and addressee_id = auth.uid()
      and status = 'pending';
  if not found then
    raise exception 'That request is not yours.';
  end if;
end;
$$;

create or replace function public.preview_invite(token text)
returns table (kind text, title text)
language sql
stable
security definer
set search_path = public
as $$
  select * from (
    select 'guide'::text, g.title from public.guides g where g.invite_token = token
    union all
    select 'plan'::text, p.title from public.plans p where p.invite_token = token
    union all
    select 'friend'::text, 'Friend request'::text from public.friendships f
      where f.invite_token = token and f.status = 'pending'
  ) invites
  limit 1;
$$;

create or replace function public.accept_invite(token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  found_guide uuid;
  found_plan uuid;
  found_friend uuid;
begin
  if me is null then
    raise exception 'Sign in first.';
  end if;
  select id into found_guide from public.guides where invite_token = token limit 1;
  if found_guide is not null then
    insert into public.guide_collaborators (guide_id, user_id)
    values (found_guide, me)
    on conflict do nothing;
    return 'guide';
  end if;
  select id into found_plan from public.plans where invite_token = token limit 1;
  if found_plan is not null then
    insert into public.plan_members (plan_id, user_id, rsvp)
    values (found_plan, me, 'yes')
    on conflict (plan_id, user_id) do update set rsvp = 'yes';
    return 'plan';
  end if;
  select id into found_friend from public.friendships
    where invite_token = token and status = 'pending' and requester_id <> me
    limit 1;
  if found_friend is not null then
    update public.friendships
      set addressee_id = me, status = 'accepted', updated_at = now()
      where id = found_friend;
    return 'friend';
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.place_status enable row level security;
alter table public.rankings enable row level security;
alter table public.house_scores enable row level security;
alter table public.house_marks enable row level security;
alter table public.collections enable row level security;
alter table public.collection_places enable row level security;
alter table public.place_photos enable row level security;
alter table public.guides enable row level security;
alter table public.guide_items enable row level security;
alter table public.guide_collaborators enable row level security;
alter table public.friendships enable row level security;
alter table public.lists enable row level security;
alter table public.list_collaborators enable row level security;
alter table public.list_places enable row level security;
alter table public.plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.plan_votes enable row level security;
alter table public.activities enable row level security;
alter table public.activity_likes enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

-- Previous policy names, so a re-run replaces an older copy of this file.
drop policy if exists "profiles are readable" on public.profiles;
drop policy if exists "edit own profile" on public.profiles;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "status readable" on public.place_status;
drop policy if exists "edit own status" on public.place_status;
drop policy if exists "place_status_own" on public.place_status;
drop policy if exists "rankings readable" on public.rankings;
drop policy if exists "edit own rankings" on public.rankings;
drop policy if exists "rankings_select" on public.rankings;
drop policy if exists "rankings_write" on public.rankings;
drop policy if exists "house_scores_select" on public.house_scores;
drop policy if exists "house_scores_write" on public.house_scores;
drop policy if exists "house_marks_select" on public.house_marks;
drop policy if exists "house_marks_write" on public.house_marks;
drop policy if exists "collections_select" on public.collections;
drop policy if exists "collections_insert" on public.collections;
drop policy if exists "collections_update" on public.collections;
drop policy if exists "collections_delete" on public.collections;
drop policy if exists "collection_places_select" on public.collection_places;
drop policy if exists "collection_places_insert" on public.collection_places;
drop policy if exists "collection_places_update" on public.collection_places;
drop policy if exists "collection_places_delete" on public.collection_places;
drop policy if exists "activities readable" on public.activities;
drop policy if exists "write own activities" on public.activities;
drop policy if exists "delete own activities" on public.activities;
drop policy if exists "activities_select" on public.activities;
drop policy if exists "activities_insert" on public.activities;
drop policy if exists "activities_delete" on public.activities;
drop policy if exists "likes readable" on public.activity_likes;
drop policy if exists "like as yourself" on public.activity_likes;
drop policy if exists "likes_select" on public.activity_likes;
drop policy if exists "likes_write" on public.activity_likes;
drop policy if exists "comments_select" on public.comments;
drop policy if exists "comments_insert" on public.comments;
drop policy if exists "comments_delete" on public.comments;
drop policy if exists "lists readable" on public.lists;
drop policy if exists "owner edits list" on public.lists;
drop policy if exists "lists_select" on public.lists;
drop policy if exists "lists_write" on public.lists;
drop policy if exists "collaborators readable" on public.list_collaborators;
drop policy if exists "list owner manages collaborators" on public.list_collaborators;
drop policy if exists "list_collaborators_select" on public.list_collaborators;
drop policy if exists "list_collaborators_write" on public.list_collaborators;
drop policy if exists "list places readable" on public.list_places;
drop policy if exists "members edit list places" on public.list_places;
drop policy if exists "list_places_select" on public.list_places;
drop policy if exists "list_places_write" on public.list_places;
drop policy if exists "plans readable" on public.plans;
drop policy if exists "host edits plan" on public.plans;
drop policy if exists "plans_select" on public.plans;
drop policy if exists "plans_insert" on public.plans;
drop policy if exists "plans_update" on public.plans;
drop policy if exists "plans_delete" on public.plans;
drop policy if exists "plan members readable" on public.plan_members;
drop policy if exists "rsvp yourself" on public.plan_members;
drop policy if exists "plan_members_select" on public.plan_members;
drop policy if exists "plan_members_insert" on public.plan_members;
drop policy if exists "plan_members_update" on public.plan_members;
drop policy if exists "votes readable" on public.plan_votes;
drop policy if exists "vote yourself" on public.plan_votes;
drop policy if exists "plan_votes_select" on public.plan_votes;
drop policy if exists "plan_votes_write" on public.plan_votes;
drop policy if exists "photos readable" on public.place_photos;
drop policy if exists "upload own photo row" on public.place_photos;
drop policy if exists "delete own photo row" on public.place_photos;
drop policy if exists "place_photos_select" on public.place_photos;
drop policy if exists "place_photos_insert" on public.place_photos;
drop policy if exists "place_photos_delete" on public.place_photos;
drop policy if exists "guides_select" on public.guides;
drop policy if exists "guides_insert" on public.guides;
drop policy if exists "guides_update" on public.guides;
drop policy if exists "guides_delete" on public.guides;
drop policy if exists "guide_items_select" on public.guide_items;
drop policy if exists "guide_items_write" on public.guide_items;
drop policy if exists "guide_collaborators_select" on public.guide_collaborators;
drop policy if exists "guide_collaborators_write" on public.guide_collaborators;
drop policy if exists "friendships_select" on public.friendships;
drop policy if exists "friendships_update" on public.friendships;
drop policy if exists "notifications_select" on public.notifications;
drop policy if exists "notifications_insert" on public.notifications;
drop policy if exists "notifications_update" on public.notifications;

create policy "profiles_select" on public.profiles for select
  using (
    auth.role() = 'authenticated'
    or is_owner
    or exists (
      select 1 from public.guides g
      where g.owner_id = profiles.id and g.visibility = 'public'
    )
  );

create policy "profiles_update" on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "place_status_own" on public.place_status for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "place_status_friends" on public.place_status;
create policy "place_status_friends" on public.place_status for select to authenticated
  using (public.friends_with(user_id));

create policy "rankings_select" on public.rankings for select to authenticated
  using (user_id = auth.uid() or public.friends_with(user_id));

create policy "rankings_write" on public.rankings for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "house_scores_select" on public.house_scores for select
  using (true);

create policy "house_scores_write" on public.house_scores for all to authenticated
  using (public.is_house_owner())
  with check (public.is_house_owner() and updated_by = auth.uid());

create policy "house_marks_select" on public.house_marks for select to authenticated
  using (public.is_house_owner());

create policy "house_marks_write" on public.house_marks for all to authenticated
  using (public.is_house_owner())
  with check (public.is_house_owner() and updated_by = auth.uid());

create policy "collections_select" on public.collections for select
  using (true);

create policy "collections_insert" on public.collections for insert to authenticated
  with check (
    public.is_house_owner()
    and created_by = auth.uid()
    and updated_by = auth.uid()
  );

create policy "collections_update" on public.collections for update to authenticated
  using (public.is_house_owner())
  with check (public.is_house_owner() and updated_by = auth.uid());

create policy "collections_delete" on public.collections for delete to authenticated
  using (public.is_house_owner());

create policy "collection_places_select" on public.collection_places for select
  using (true);

create policy "collection_places_insert" on public.collection_places for insert to authenticated
  with check (public.is_house_owner() and updated_by = auth.uid());

create policy "collection_places_update" on public.collection_places for update to authenticated
  using (public.is_house_owner())
  with check (public.is_house_owner() and updated_by = auth.uid());

create policy "collection_places_delete" on public.collection_places for delete to authenticated
  using (public.is_house_owner());

create policy "place_photos_select" on public.place_photos for select to anon, authenticated
  using (
    is_owner
    or (
      auth.uid() is not null
      and (user_id = auth.uid() or public.friends_with(user_id))
    )
  );

create policy "place_photos_insert" on public.place_photos for insert to authenticated
  with check (user_id = auth.uid());

create policy "place_photos_delete" on public.place_photos for delete to authenticated
  using (user_id = auth.uid());

create policy "guides_select" on public.guides for select
  using (public.can_see_guide(id));

create policy "guides_insert" on public.guides for insert to authenticated
  with check (owner_id = auth.uid());

create policy "guides_update" on public.guides for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "guides_delete" on public.guides for delete to authenticated
  using (owner_id = auth.uid());

create policy "guide_items_select" on public.guide_items for select
  using (public.can_see_guide(guide_id));

create policy "guide_items_write" on public.guide_items for all to authenticated
  using (public.can_edit_guide(guide_id))
  with check (public.can_edit_guide(guide_id));

create policy "guide_collaborators_select" on public.guide_collaborators for select
  using (public.can_see_guide(guide_id));

create policy "guide_collaborators_write" on public.guide_collaborators for all to authenticated
  using (exists (select 1 from public.guides g where g.id = guide_id and g.owner_id = auth.uid()))
  with check (exists (select 1 from public.guides g where g.id = guide_id and g.owner_id = auth.uid()));

create policy "friendships_select" on public.friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "friendships_update" on public.friendships for update to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (
    (requester_id = auth.uid() and status in ('pending', 'cancelled'))
    or (addressee_id = auth.uid() and status in ('accepted', 'declined', 'cancelled'))
  );

create policy "lists_select" on public.lists for select
  using (public.can_see_list(id));

create policy "lists_write" on public.lists for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "list_collaborators_select" on public.list_collaborators for select
  using (public.can_see_list(list_id));

create policy "list_collaborators_write" on public.list_collaborators for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid()));

create policy "list_places_select" on public.list_places for select
  using (public.can_see_list(list_id));

create policy "list_places_write" on public.list_places for all to authenticated
  using (public.can_edit_list(list_id))
  with check (public.can_edit_list(list_id));

create policy "plans_select" on public.plans for select to authenticated
  using (public.is_plan_member(id));

create policy "plans_insert" on public.plans for insert to authenticated
  with check (host_id = auth.uid());

create policy "plans_update" on public.plans for update to authenticated
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

create policy "plans_delete" on public.plans for delete to authenticated
  using (host_id = auth.uid());

create policy "plan_members_select" on public.plan_members for select to authenticated
  using (public.is_plan_member(plan_id));

create policy "plan_members_insert" on public.plan_members for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.plans p where p.id = plan_id and p.host_id = auth.uid())
  );

create policy "plan_members_update" on public.plan_members for update to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.plans p where p.id = plan_id and p.host_id = auth.uid()))
  with check (user_id = auth.uid() or exists (select 1 from public.plans p where p.id = plan_id and p.host_id = auth.uid()));

create policy "plan_votes_select" on public.plan_votes for select to authenticated
  using (public.is_plan_member(plan_id));

create policy "plan_votes_write" on public.plan_votes for all to authenticated
  using (user_id = auth.uid() and public.is_plan_member(plan_id))
  with check (user_id = auth.uid() and public.is_plan_member(plan_id));

create policy "activities_select" on public.activities for select to authenticated
  using (user_id = auth.uid() or public.friends_with(user_id));

create policy "activities_insert" on public.activities for insert to authenticated
  with check (user_id = auth.uid());

create policy "activities_delete" on public.activities for delete to authenticated
  using (user_id = auth.uid());

create policy "likes_select" on public.activity_likes for select to authenticated
  using (user_id = auth.uid() or public.can_see_activity(activity_id));

create policy "likes_write" on public.activity_likes for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "comments_select" on public.comments for select to authenticated
  using (public.can_see_activity(activity_id));

create policy "comments_insert" on public.comments for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_activity(activity_id));

create policy "comments_delete" on public.comments for delete to authenticated
  using (user_id = auth.uid());

create policy "notifications_select" on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy "notifications_insert" on public.notifications for insert to authenticated
  with check (user_id = auth.uid());

create policy "notifications_update" on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants. Required because new tables are not exposed automatically.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant update (name, handle, avatar_url) on table public.profiles to authenticated;

revoke all on table public.place_status from public, anon, authenticated;
grant select, insert, update, delete on table public.place_status to authenticated;

revoke all on table public.rankings from public, anon, authenticated;
grant select, insert, update, delete on table public.rankings to authenticated;

revoke all on table public.house_scores from public, anon, authenticated;
grant select on table public.house_scores to anon, authenticated;
grant insert, update, delete on table public.house_scores to authenticated;

revoke all on table public.house_marks from public, anon, authenticated;
grant select, insert, update, delete on table public.house_marks to authenticated;

revoke all on table public.collections from public, anon, authenticated;
grant select on table public.collections to anon, authenticated;
grant insert, update, delete on table public.collections to authenticated;

revoke all on table public.collection_places from public, anon, authenticated;
grant select on table public.collection_places to anon, authenticated;
grant insert, update, delete on table public.collection_places to authenticated;

revoke all on table public.place_photos from public, anon, authenticated;
grant select on table public.place_photos to anon, authenticated;
grant insert, delete on table public.place_photos to authenticated;

revoke all on table public.guides from public, anon, authenticated;
grant select on table public.guides to anon, authenticated;
grant insert, update, delete on table public.guides to authenticated;

revoke all on table public.guide_items from public, anon, authenticated;
grant select on table public.guide_items to anon, authenticated;
grant insert, update, delete on table public.guide_items to authenticated;

revoke all on table public.guide_collaborators from public, anon, authenticated;
grant select, insert, update, delete on table public.guide_collaborators to authenticated;

revoke all on table public.friendships from public, anon, authenticated;
grant select, update on table public.friendships to authenticated;

revoke all on table public.lists from public, anon, authenticated;
grant select on table public.lists to anon, authenticated;
grant insert, update, delete on table public.lists to authenticated;

revoke all on table public.list_collaborators from public, anon, authenticated;
grant select, insert, update, delete on table public.list_collaborators to authenticated;

revoke all on table public.list_places from public, anon, authenticated;
grant select on table public.list_places to anon, authenticated;
grant insert, update, delete on table public.list_places to authenticated;

revoke all on table public.plans from public, anon, authenticated;
grant select, insert, update, delete on table public.plans to authenticated;

revoke all on table public.plan_members from public, anon, authenticated;
grant select, insert, update, delete on table public.plan_members to authenticated;

revoke all on table public.plan_votes from public, anon, authenticated;
grant select, insert, update, delete on table public.plan_votes to authenticated;

revoke all on table public.activities from public, anon, authenticated;
grant select, insert, delete on table public.activities to authenticated;

revoke all on table public.activity_likes from public, anon, authenticated;
grant select, insert, update, delete on table public.activity_likes to authenticated;

revoke all on table public.comments from public, anon, authenticated;
grant select, insert, delete on table public.comments to authenticated;

revoke all on table public.notifications from public, anon, authenticated;
grant select, insert, update on table public.notifications to authenticated;

-- Close the old follows table if a previous schema created it.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'follows'
  ) then
    execute 'drop policy if exists "follows are readable" on public.follows';
    execute 'drop policy if exists "manage own follows" on public.follows';
    execute 'revoke all on table public.follows from public, anon, authenticated';
  end if;
end $$;

revoke all on function public.is_house_owner() from public;
revoke all on function public.friends_with(uuid) from public;
revoke all on function public.can_see_guide(uuid) from public;
revoke all on function public.can_edit_guide(uuid) from public;
revoke all on function public.can_see_list(uuid) from public;
revoke all on function public.can_edit_list(uuid) from public;
revoke all on function public.is_plan_member(uuid) from public;
revoke all on function public.can_see_activity(uuid) from public;
revoke all on function public.notify_user(uuid, text, text) from public;
revoke all on function public.request_friend(text) from public;
revoke all on function public.invite_friend_email(text) from public;
revoke all on function public.create_friend_link() from public;
revoke all on function public.respond_friend(uuid, boolean) from public;
revoke all on function public.preview_invite(text) from public;
revoke all on function public.accept_invite(text) from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.protect_profile_owner() from public;
revoke all on function public.stamp_place_photo() from public;
revoke all on function public.on_comment_notify() from public;
revoke all on function public.on_friendship_notify() from public;
revoke all on function public.on_plan_member_notify() from public;
revoke all on function public.limit_collection_places() from public, anon, authenticated;

grant execute on function public.is_house_owner() to anon, authenticated;
grant execute on function public.friends_with(uuid) to anon, authenticated;
grant execute on function public.can_see_guide(uuid) to anon, authenticated;
grant execute on function public.can_edit_guide(uuid) to authenticated;
grant execute on function public.can_see_list(uuid) to anon, authenticated;
grant execute on function public.can_edit_list(uuid) to authenticated;
grant execute on function public.is_plan_member(uuid) to authenticated;
grant execute on function public.can_see_activity(uuid) to authenticated;
grant execute on function public.request_friend(text) to authenticated;
grant execute on function public.invite_friend_email(text) to authenticated;
grant execute on function public.create_friend_link() to authenticated;
grant execute on function public.respond_friend(uuid, boolean) to authenticated;
grant execute on function public.preview_invite(text) to anon, authenticated;
grant execute on function public.accept_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage. Friend photos stay in the private place-photos bucket.
-- House photos (profiles.is_owner) live in the public owner-photos bucket.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('place-photos', 'place-photos', false, 5242880, array['image/webp']::text[])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public photo reads" on storage.objects;
drop policy if exists "users upload own folder" on storage.objects;
drop policy if exists "users delete own folder" on storage.objects;
drop policy if exists "place_photos_storage_read" on storage.objects;
drop policy if exists "place_photos_storage_insert" on storage.objects;
drop policy if exists "place_photos_storage_delete" on storage.objects;

create policy "place_photos_storage_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'place-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.friends_with(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "place_photos_storage_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'place-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "place_photos_storage_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'place-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('owner-photos', 'owner-photos', true, 5242880, array['image/webp']::text[])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "owner_photos_public_read" on storage.objects;
drop policy if exists "owner_photos_insert" on storage.objects;
drop policy if exists "owner_photos_delete" on storage.objects;

create policy "owner_photos_public_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'owner-photos');

create policy "owner_photos_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'owner-photos'
    and public.is_house_owner()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner_photos_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'owner-photos'
    and public.is_house_owner()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Realtime. Notifications and plans, plus the member and vote rows a plan uses.
-- ---------------------------------------------------------------------------

alter table public.notifications replica identity full;
alter table public.plans replica identity full;
alter table public.plan_members replica identity full;
alter table public.plan_votes replica identity full;

do $pub$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach t in array array['notifications', 'plans', 'plan_members', 'plan_votes']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$pub$;

notify pgrst, 'reload schema';
