-- Task 11b: boy / girl on every member, and private member photos.

-- male / female (shown as Boy / Girl for kids, Man / Woman for adults).
-- Required by the app for new members; older rows may be empty until reception fills them in.
alter table public.kids add column gender text check (gender in ('male','female'));
grant update (gender) on public.kids to authenticated;

-- Photos live in a PRIVATE bucket at  <account id>/<member id>.jpg
-- Only that family, coaches and staff can see them (same rule as health information).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kid-photos', 'kid-photos', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy kid_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'kid-photos'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_coach_or_staff()));

create policy kid_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'kid-photos'
              and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff()));

create policy kid_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'kid-photos'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff()));

create policy kid_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'kid-photos'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff()));

-- demo kids
update public.kids k set gender = v.g
from (values ('Sara','female'), ('Yousef','male'), ('Faisal','male'), ('Noor','female')) as v(n, g),
     auth.users u
where k.full_name = v.n and k.parent_id = u.id
  and u.email in ('noura@lgcomplex.test','dalal@lgcomplex.test') and k.gender is null;
