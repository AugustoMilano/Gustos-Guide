-- handle_new_user used to strip with [^a-z0-9_] and only then call lower().
-- Uppercase letters were deleted, so AugustoTMilano became ugustoilano.
-- Lowercase first, then keep letters, digits, and underscores.
-- Apply in the Supabase SQL editor. Do not run from the app.

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
