-- Validate photo frame ownership in the database, not only in the browser.
-- Run after 20261128_nexora_upload_roulette_repair.sql.
begin;

create or replace function public.nexora_submit_memory(
  p_storage_path text,
  p_caption text default '',
  p_frame_item_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage, pg_temp
set row_security = off
as $$
declare
  v_user uuid := auth.uid();
  v_memory public.memories%rowtype;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if p_storage_path is null
     or (storage.foldername(p_storage_path))[1] <> v_user::text then
    raise exception 'INVALID_STORAGE_OWNER' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'nexora-photos' and o.name = p_storage_path
  ) then
    raise exception 'UPLOADED_OBJECT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if char_length(coalesce(p_caption, '')) > 280 then
    raise exception 'CAPTION_TOO_LONG' using errcode = '22023';
  end if;
  if p_frame_item_id is not null and not exists (
    select 1
    from public.user_inventory inventory
    join public.store_items item on item.id = inventory.item_id
    where inventory.user_id = v_user
      and inventory.item_id = p_frame_item_id
      and item.category = 'frame'
  ) then
    raise exception 'FRAME_NOT_OWNED' using errcode = '42501';
  end if;

  insert into public.memories (
    user_id, storage_path, media_type, caption, status, frame_item_id
  ) values (
    v_user, p_storage_path, 'image', coalesce(p_caption, ''), 'pending', p_frame_item_id
  ) returning * into v_memory;
  return to_jsonb(v_memory);
end;
$$;

revoke all on function public.nexora_submit_memory(text, text, uuid) from public, anon;
grant execute on function public.nexora_submit_memory(text, text, uuid) to authenticated;

-- Keep table writes behind the validating RPC; direct INSERT would bypass its
-- storage-object and purchased-frame checks.
revoke insert on public.memories from anon, authenticated;
do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'memories' and cmd in ('INSERT', 'ALL')
  loop
    execute format('drop policy %I on public.memories', v_policy.policyname);
  end loop;
end;
$$;

commit;
notify pgrst, 'reload schema';
