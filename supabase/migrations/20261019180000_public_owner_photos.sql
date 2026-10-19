-- House photos are public. Friend photos stay private.
-- Safe to re-run. Apply in the Supabase SQL editor. The app still works before this lands.
--
-- This does not copy storage objects. After it succeeds, copy the existing
-- owner object into the new public bucket at the same path (service role):
--   from place-photos
--   to   owner-photos
--   key  6b6b61b0-983d-4772-9d80-836d3c43c235/louie-s-deli/8ff4dba6-c66f-47a8-af3f-864f6b13a36d.webp
-- Leave the original in place-photos until the new site is live.

create index if not exists place_photos_owner_idx on public.place_photos (place_id) where is_owner;

drop policy if exists "place_photos_select" on public.place_photos;
create policy "place_photos_select" on public.place_photos for select to anon, authenticated
  using (
    is_owner
    or (
      auth.uid() is not null
      and (user_id = auth.uid() or public.friends_with(user_id))
    )
  );

grant select on table public.place_photos to anon;

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
    and (storage.foldername(name))[1] = auth.uid()::text
  );
