-- Allow public viewing and moderated anonymous submissions for the NEXORA album.
-- Run after nexora_setup.sql. Bucket `nexora-photos` remains PRIVATE.
begin;

alter table public.memories alter column user_id drop not null;
alter table public.memories drop constraint if exists memory_storage_owner_path_check;
alter table public.memories add constraint memory_storage_owner_path_check check (
  (user_id is null and storage_path like 'incoming/%') or
  (user_id is not null and storage_path like (user_id::text || '/%'))
);

alter table public.memory_comments alter column user_id drop not null;
alter table public.memory_comments add column if not exists author_name text not null default 'Participante';
alter table public.memory_comments add column if not exists status text not null default 'pending';
alter table public.memory_comments drop constraint if exists memory_comments_status_check;
alter table public.memory_comments add constraint memory_comments_status_check
  check (status in ('pending','approved','rejected'));

grant select on public.trip_participants to anon;
grant select on public.trip_activities, public.trip_missions to anon;
grant select, insert on public.memories, public.memory_comments to anon;

drop policy if exists "participants visible to members" on public.trip_participants;
drop policy if exists "participants public cards" on public.trip_participants;
create policy "participants public cards" on public.trip_participants
  for select to anon, authenticated using (true);

drop policy if exists "members read approved memories" on public.memories;
drop policy if exists "public read approved memories" on public.memories;
create policy "public read approved memories" on public.memories
  for select to anon, authenticated using (
    status = 'approved' or
    (auth.uid() is not null and (user_id = auth.uid() or public.nexora_is_market_admin()))
  );
drop policy if exists "members submit own pending memories" on public.memories;
drop policy if exists "public submissions stay pending" on public.memories;
create policy "public submissions stay pending" on public.memories
  for insert to anon, authenticated with check (
    status = 'pending' and (user_id is null or user_id = auth.uid())
  );

drop policy if exists "members read comments on visible memories" on public.memory_comments;
drop policy if exists "public read approved comments" on public.memory_comments;
create policy "public read approved comments" on public.memory_comments
  for select to anon, authenticated using (
    (status = 'approved' or (auth.uid() is not null and public.nexora_is_market_admin())) and exists (
      select 1 from public.memories m where m.id = memory_id and m.status = 'approved'
    )
  );
drop policy if exists "members comment on approved memories" on public.memory_comments;
drop policy if exists "public comments require moderation" on public.memory_comments;
create policy "public comments require moderation" on public.memory_comments
  for insert to anon, authenticated with check (
    status = 'pending' and user_id is not distinct from auth.uid()
    and exists (select 1 from public.memories m where m.id = memory_id and m.status = 'approved')
  );

drop policy if exists "members read active activities" on public.trip_activities;
drop policy if exists "public read active activities" on public.trip_activities;
create policy "public read active activities" on public.trip_activities
  for select to anon, authenticated using (active or (auth.uid() is not null and public.nexora_is_market_admin()));
drop policy if exists "members read active missions" on public.trip_missions;
drop policy if exists "public read active missions" on public.trip_missions;
create policy "public read active missions" on public.trip_missions
  for select to anon, authenticated using (active or (auth.uid() is not null and public.nexora_is_market_admin()));

drop policy if exists "nexora members upload to own folder" on storage.objects;
drop policy if exists "nexora public uploads to incoming" on storage.objects;
create policy "nexora public uploads to incoming" on storage.objects
  for insert to anon with check (
    bucket_id = 'nexora-photos' and (storage.foldername(name))[1] = 'incoming'
  );
drop policy if exists "nexora members upload to own folder" on storage.objects;
create policy "nexora members upload to own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'nexora-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "nexora members read approved media" on storage.objects;
drop policy if exists "nexora public read approved media" on storage.objects;
create policy "nexora public read approved media" on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'nexora-photos' and (
      exists (select 1 from public.memories m where m.storage_path = name and m.status = 'approved')
      or exists (select 1 from public.trip_participants p where p.avatar_path = name)
      or (auth.uid() is not null and (
        (storage.foldername(name))[1] = auth.uid()::text or public.nexora_is_market_admin()
      ))
    )
  );

create or replace function public.nexora_review_comment(p_comment_id uuid, p_approved boolean)
returns void language plpgsql security definer set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null or not public.nexora_is_market_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  update public.memory_comments
  set status = case when p_approved then 'approved' else 'rejected' end
  where id = p_comment_id and status = 'pending';
  if not found then raise exception 'COMMENT_NOT_PENDING' using errcode = 'P0002'; end if;
end;
$$;
revoke all on function public.nexora_review_comment(uuid, boolean) from public;
grant execute on function public.nexora_review_comment(uuid, boolean) to authenticated;

commit;
