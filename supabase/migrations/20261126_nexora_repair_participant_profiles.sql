begin;

insert into public.trip_participants (user_id, display_name)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Invitado'
  )
from auth.users u
where not exists (
  select 1 from public.trip_participants p where p.user_id = u.id
)
on conflict (user_id) do nothing;

create or replace function public.nexora_ensure_participant()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_display_name text;
  v_participant public.trip_participants%rowtype;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Invitado'
  )
  into v_display_name
  from auth.users u
  where u.id = v_user;

  if not found then
    raise exception 'AUTH_USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.trip_participants (user_id, display_name)
  values (v_user, v_display_name)
  on conflict (user_id) do nothing;

  select * into v_participant
  from public.trip_participants
  where user_id = v_user;

  return to_jsonb(v_participant);
end;
$$;

revoke all on function public.nexora_ensure_participant() from public, anon, authenticated;
grant execute on function public.nexora_ensure_participant() to authenticated;

commit;
notify pgrst, 'reload schema';
