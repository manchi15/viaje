-- Tracks active authenticated guests without exposing their IDs to other users.
create table if not exists public.nexora_online_visitors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen timestamptz not null default clock_timestamp()
);

alter table public.nexora_online_visitors enable row level security;
revoke all on public.nexora_online_visitors from anon, authenticated;

create or replace function public.nexora_ping_presence()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  active_count integer;
begin
  if actor_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  insert into public.nexora_online_visitors (user_id, last_seen)
  values (actor_id, clock_timestamp())
  on conflict (user_id) do update set last_seen = excluded.last_seen;

  delete from public.nexora_online_visitors
  where last_seen < clock_timestamp() - interval '10 minutes';

  select count(*)::integer into active_count
  from public.nexora_online_visitors
  where last_seen > clock_timestamp() - interval '60 seconds';

  return active_count;
end;
$$;

revoke all on function public.nexora_ping_presence() from public, anon;
grant execute on function public.nexora_ping_presence() to authenticated;
