-- List look, place notes, friend Been/To go, and a shareable friend link.
-- Safe to re-run. Apply in the Supabase SQL editor. The app still works before this lands.

alter table public.guides add column if not exists emoji text;
alter table public.guides add column if not exists accent text;
alter table public.guide_items add column if not exists note text;
alter table public.guide_items add column if not exists added_at timestamptz;

alter table public.friendships drop constraint if exists friendships_target;
alter table public.friendships add constraint friendships_target check (
  addressee_id is not null or invite_email is not null or invite_token is not null
);

drop policy if exists "place_status_friends" on public.place_status;
create policy "place_status_friends" on public.place_status for select to authenticated
  using (public.friends_with(user_id));

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

revoke all on function public.create_friend_link() from public;
grant execute on function public.create_friend_link() to authenticated;
