-- Show each new photo in the private group feed as soon as it is uploaded.
-- Run after 20261128_nexora_upload_roulette_repair.sql. Safe to re-run.
begin;

create or replace function public.nexora_force_pending_memory()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  new.user_id := auth.uid();
  new.status := 'approved';
  return new;
end;
$$;

-- The existing submit RPC inserts the uploaded row; this trigger ensures it is
-- immediately visible to authenticated group members and the home feed.
drop trigger if exists nexora_force_pending_memory on public.memories;
create trigger nexora_force_pending_memory
  before insert on public.memories
  for each row execute function public.nexora_force_pending_memory();

-- Publish already uploaded photos that were waiting in the private review queue.
update public.memories
set status = 'approved', reviewed_at = coalesce(reviewed_at, now())
where status = 'pending' and media_type = 'image';

notify pgrst, 'reload schema';
commit;
