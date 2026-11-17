-- Let authenticated members remove their own photo posts and unlinked storage objects.
begin;

grant delete on public.memories to authenticated;
drop policy if exists "members delete own memories" on public.memories;
create policy "members delete own memories" on public.memories
  for delete to authenticated using (user_id = auth.uid());

grant delete on storage.objects to authenticated;
drop policy if exists "members delete own unlinked media" on storage.objects;
create policy "members delete own unlinked media" on storage.objects
  for delete to authenticated using (
    bucket_id = 'nexora-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (select 1 from public.memories m where m.storage_path = name)
  );

commit;
notify pgrst, 'reload schema';
