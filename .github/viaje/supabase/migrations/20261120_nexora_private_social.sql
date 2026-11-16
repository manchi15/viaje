-- NEXORA private social app: invitations, locked-down album, server coins and six launch frames.
-- Run after nexora_setup.sql and 20261116_nexora_public_album.sql.
begin;

-- Restore member-only access if the earlier public-album patch was applied.
revoke all on public.trip_participants, public.memories, public.memory_comments,
  public.trip_activities, public.trip_missions, public.trip_messages from anon;
grant select on public.trip_participants, public.memories, public.memory_comments,
  public.trip_activities, public.trip_missions, public.trip_messages to authenticated;
grant insert on public.memories, public.memory_comments, public.trip_messages to authenticated;
alter table public.memory_comments add column if not exists author_name text not null default 'Participante';
alter table public.memory_comments add column if not exists status text not null default 'approved';
alter table public.memory_comments drop constraint if exists memory_comments_status_check;
alter table public.memory_comments add constraint memory_comments_status_check check(status in ('pending','approved','rejected'));

drop policy if exists "participants public cards" on public.trip_participants;
drop policy if exists "public read approved memories" on public.memories;
drop policy if exists "public submissions stay pending" on public.memories;
drop policy if exists "public read approved comments" on public.memory_comments;
drop policy if exists "public comments require moderation" on public.memory_comments;
drop policy if exists "members read comments on visible memories" on public.memory_comments;
create policy "members read comments on visible memories" on public.memory_comments for select to authenticated
  using ((status='approved' or user_id=auth.uid() or public.nexora_is_market_admin()) and exists(
    select 1 from public.memories m where m.id=memory_id and (m.status='approved' or m.user_id=auth.uid() or public.nexora_is_market_admin())
  ));
drop policy if exists "public read active activities" on public.trip_activities;
drop policy if exists "public read active missions" on public.trip_missions;
drop policy if exists "nexora public uploads to incoming" on storage.objects;
drop policy if exists "nexora public read approved media" on storage.objects;

create table if not exists public.nexora_invites (
  email text primary key check (email = lower(trim(email))),
  invited_by uuid references auth.users(id),
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  redeemed_by uuid unique references auth.users(id),
  redeemed_at timestamptz
);
alter table public.nexora_invites enable row level security;
revoke all on public.nexora_invites from anon, authenticated;

-- Existing registered users stay in the private group. New registrations require an invite.
insert into public.nexora_invites(email, invited_by, expires_at, redeemed_by, redeemed_at)
select lower(u.email), u.id, now() + interval '100 years', u.id, u.created_at
from auth.users u where u.email is not null
on conflict (email) do nothing;

create or replace function public.nexora_enforce_invitation()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare v_invite public.nexora_invites%rowtype;
begin
  select * into v_invite from public.nexora_invites
    where email = lower(trim(new.email)) and redeemed_at is null and expires_at > now()
    for update;
  if not found then raise exception 'INVITE_REQUIRED' using errcode = '42501'; end if;
  update public.nexora_invites set redeemed_at = now()
    where email = v_invite.email;
  return new;
end;
$$;
revoke all on function public.nexora_enforce_invitation() from public, anon, authenticated;
drop trigger if exists nexora_require_invitation on auth.users;
create trigger nexora_require_invitation before insert on auth.users
  for each row execute function public.nexora_enforce_invitation();
create or replace function public.nexora_redeem_invitation_after_signup()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp
as $$
begin
  update public.nexora_invites set redeemed_by = new.id
    where email = lower(trim(new.email)) and redeemed_at is not null and redeemed_by is null;
  return new;
end;
$$;
drop trigger if exists nexora_redeem_invite_after_signup on auth.users;
create trigger nexora_redeem_invite_after_signup after insert on auth.users
  for each row execute function public.nexora_redeem_invitation_after_signup();

create or replace function public.nexora_create_invite(p_email text)
returns timestamptz language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare v_expiry timestamptz;
begin
  if auth.uid() is null or not public.nexora_is_market_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if trim(coalesce(p_email,'')) !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'INVALID_EMAIL';
  end if;
  insert into public.nexora_invites(email, invited_by, expires_at)
  values (lower(trim(p_email)), auth.uid(), now() + interval '14 days')
  on conflict (email) do update set invited_by = excluded.invited_by,
    invited_at = now(), expires_at = excluded.expires_at, redeemed_by = null, redeemed_at = null
  returning expires_at into v_expiry;
  return v_expiry;
end;
$$;
revoke all on function public.nexora_create_invite(text) from public;
grant execute on function public.nexora_create_invite(text) to authenticated;

-- Server is the only authority for the 20 NR Coins / 10 minute reward.
alter table public.profiles add column if not exists last_coin_reward_at timestamptz;
alter table public.profiles add column if not exists points bigint not null default 0 check (points >= 0);
alter table public.profiles add column if not exists xp bigint not null default 0 check (xp >= 0);
create or replace function public.nexora_claim_coin_reward()
returns jsonb language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_last timestamptz;
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_balance bigint;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  select last_coin_reward_at into v_last from public.profiles where user_id = v_user for update;
  if not found then raise exception 'PROFILE_REQUIRED' using errcode = 'P0002'; end if;
  if v_last is null then
    update public.profiles set last_coin_reward_at = v_now where user_id = v_user;
    select coin_balance into v_balance from public.profiles where user_id = v_user;
    return jsonb_build_object('awarded', 0, 'balance', v_balance, 'next_at', v_now + interval '10 minutes');
  end if;
  v_count := floor(extract(epoch from (v_now - v_last)) / 600)::integer;
  if v_count < 1 then
    select coin_balance into v_balance from public.profiles where user_id = v_user;
    return jsonb_build_object('awarded', 0, 'balance', v_balance, 'next_at', v_last + interval '10 minutes');
  end if;
  v_count := least(v_count, 6);
  update public.profiles set coin_balance = coin_balance + (20 * v_count),
    last_coin_reward_at = v_last + (interval '10 minutes' * v_count)
    where user_id = v_user returning coin_balance into v_balance;
  insert into public.coin_transactions(user_id, delta, reason)
    values (v_user, 20 * v_count, 'Recompensa automática · 10 minutos');
  select last_coin_reward_at into v_last from public.profiles where user_id = v_user;
  return jsonb_build_object('awarded', 20 * v_count, 'balance', v_balance, 'next_at', v_last + interval '10 minutes');
end;
$$;
revoke all on function public.nexora_claim_coin_reward() from public, anon;
grant execute on function public.nexora_claim_coin_reward() to authenticated;

alter table public.trip_missions add column if not exists goal_count integer not null default 1 check (goal_count > 0);
alter table public.trip_missions add column if not exists goal_tag text;
alter table public.trip_missions add column if not exists repeat_daily boolean not null default false;
create table if not exists public.mission_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid not null references public.trip_missions(id) on delete cascade,
  claim_key text not null,
  claimed_at timestamptz not null default now(),
  primary key(user_id, mission_id, claim_key)
);
alter table public.mission_claims enable row level security;
revoke all on public.mission_claims from anon;
grant select on public.mission_claims to authenticated;
drop policy if exists "members read own mission claims" on public.mission_claims;
create policy "members read own mission claims" on public.mission_claims for select to authenticated
  using(user_id=auth.uid() or public.nexora_is_market_admin());
insert into public.trip_missions(slug,title,description,reward_np,reward_nc,xp,kind,goal_count,goal_tag,repeat_daily,active) values
  ('first-memory','El primer recuerdo','Publica tu primera fotografía aprobada.',25,0,30,'special',1,null,false,true),
  ('melgar-explorer','Explorador de Melgar','Comparte tres fotos aprobadas con #Melgar.',50,0,60,'special',3,'melgar',false,true),
  ('photographer','Fotógrafo oficial','Consigue cinco fotografías aprobadas.',75,0,80,'special',5,null,false,true),
  ('daily-pool','Día de piscina','Comparte un recuerdo con #Piscina.',35,0,40,'daily',1,'piscina',true,true),
  ('secret','??? Misión desconocida','Descubre cómo revelar este reto.',100,0,120,'secret',1,'nexora',false,true)
on conflict(slug) do update set title=excluded.title, description=excluded.description,
  reward_np=excluded.reward_np, reward_nc=excluded.reward_nc, xp=excluded.xp,
  kind=excluded.kind, goal_count=excluded.goal_count, goal_tag=excluded.goal_tag,
  repeat_daily=excluded.repeat_daily, active=true;

create or replace function public.nexora_claim_mission(p_slug text)
returns jsonb language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_mission public.trip_missions%rowtype;
  v_key text;
  v_progress integer;
  v_points bigint;
  v_xp bigint;
  v_coins bigint;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
  select * into v_mission from public.trip_missions where slug=p_slug and active for share;
  if not found then raise exception 'MISSION_UNAVAILABLE' using errcode='P0002'; end if;
  v_key := case when v_mission.repeat_daily then to_char(timezone('America/Bogota',now()),'YYYY-MM-DD') else 'once' end;
  if exists(select 1 from public.mission_claims where user_id=v_user and mission_id=v_mission.id and claim_key=v_key) then
    raise exception 'MISSION_ALREADY_CLAIMED' using errcode='23505';
  end if;
  if v_mission.goal_tag is null then
    select count(*) into v_progress from public.memories where user_id=v_user and status='approved' and media_type='image';
  else
    select count(*) into v_progress from public.memories where user_id=v_user and status='approved' and v_mission.goal_tag = any(hashtags);
  end if;
  if v_progress < v_mission.goal_count then raise exception 'MISSION_NOT_COMPLETE' using errcode='22023'; end if;
  insert into public.mission_claims(user_id,mission_id,claim_key) values(v_user,v_mission.id,v_key);
  update public.profiles set points=points+v_mission.reward_np, xp=xp+v_mission.xp,
    coin_balance=coin_balance+v_mission.reward_nc where user_id=v_user
    returning points,xp,coin_balance into v_points,v_xp,v_coins;
  if v_mission.reward_nc>0 then
    insert into public.coin_transactions(user_id,delta,reason) values(v_user,v_mission.reward_nc,'Misión · '||v_mission.title);
  end if;
  return jsonb_build_object('points',v_points,'xp',v_xp,'balance',v_coins,'reward_np',v_mission.reward_np,'reward_nc',v_mission.reward_nc);
end;
$$;
revoke all on function public.nexora_claim_mission(text) from public, anon;
grant execute on function public.nexora_claim_mission(text) to authenticated;

create or replace function public.nexora_leaderboard()
returns table(user_id uuid, display_name text, points bigint, xp bigint, coin_balance bigint, avatar_path text)
language sql stable security definer set search_path=public,auth,pg_temp
as $$
  select t.user_id,t.display_name,p.points,p.xp,p.coin_balance,t.avatar_path
  from public.trip_participants t join public.profiles p using(user_id)
  order by p.points desc,p.xp desc,t.display_name asc limit 100
$$;
revoke all on function public.nexora_leaderboard() from public,anon;
grant execute on function public.nexora_leaderboard() to authenticated;

-- Only the six launch frames remain purchasable; old inventory/history is retained.
alter table public.store_items add column if not exists category text not null default 'frame'
  check (category in ('frame','aura','effect','personalization'));
update public.store_items set active = false
  where slug not in ('blood','ocean','lightning','angel','venom','mythic');
insert into public.store_items(slug,name,description,price,rarity,preview_style,category,active) values
  ('blood','BLOOD','Partículas carmesí que rodean cada recuerdo.',10,'common','blood','frame',true),
  ('ocean','OCEAN','Ondas, espuma y destellos inspirados en el mar.',20,'common','ocean','frame',true),
  ('lightning','LIGHTNING','Rayos finos recorren el borde de la fotografía.',30,'rare','lightning','frame',true),
  ('angel','ANGEL','Alas de luz que aparecen y se desvanecen.',40,'rare','angel','frame',true),
  ('venom','VENOM','Partículas verdes y bruma tóxica controlada.',50,'epic','venom','frame',true),
  ('mythic','MYTHIC','Champagne, plata y destellos sutiles.',60,'legendary','mythic','frame',true)
on conflict (slug) do update set name = excluded.name, description = excluded.description,
  price = excluded.price, rarity = excluded.rarity, preview_style = excluded.preview_style,
  category = excluded.category, active = true, updated_at = now();

drop policy if exists "catalog visible" on public.store_items;
drop policy if exists "members read active catalog" on public.store_items;
revoke all on public.store_items from anon;
grant select on public.store_items to authenticated;
create policy "members read active catalog" on public.store_items
  for select to authenticated using (active or public.nexora_is_market_admin());

-- Photo decoration can only be attached if the author owns the frame.
alter table public.memories add column if not exists frame_item_id uuid references public.store_items(id);
create or replace function public.nexora_validate_memory_frame()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp
as $$
begin
  if new.frame_item_id is not null and not exists (
    select 1 from public.user_inventory i where i.user_id = new.user_id and i.item_id = new.frame_item_id
  ) then raise exception 'FRAME_NOT_OWNED' using errcode = '42501'; end if;
  return new;
end;
$$;
drop trigger if exists nexora_memory_frame_owned on public.memories;
create trigger nexora_memory_frame_owned before insert or update of frame_item_id on public.memories
  for each row execute function public.nexora_validate_memory_frame();

create or replace function public.nexora_set_memory_frame(p_memory_id uuid, p_item_id uuid)
returns void language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
  if p_item_id is not null and not exists (
    select 1 from public.user_inventory where user_id=v_user and item_id=p_item_id
  ) then raise exception 'FRAME_NOT_OWNED' using errcode='42501'; end if;
  update public.memories set frame_item_id=p_item_id
    where id=p_memory_id and user_id=v_user and status='approved';
  if not found then raise exception 'MEMORY_NOT_FOUND' using errcode='P0002'; end if;
end;
$$;
revoke all on function public.nexora_set_memory_frame(uuid,uuid) from public,anon;
grant execute on function public.nexora_set_memory_frame(uuid,uuid) to authenticated;

create table if not exists public.memory_reactions (
  memory_id uuid not null references public.memories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null default 'heart' check (reaction in ('heart','sparkle','laugh')),
  created_at timestamptz not null default now(),
  primary key(memory_id,user_id,reaction)
);
create table if not exists public.memory_favorites (
  memory_id uuid not null references public.memories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(memory_id,user_id)
);
alter table public.memory_reactions enable row level security;
alter table public.memory_favorites enable row level security;
revoke all on public.memory_reactions, public.memory_favorites from anon;
grant select, insert, delete on public.memory_reactions, public.memory_favorites to authenticated;
drop policy if exists "members read photo reactions" on public.memory_reactions;
create policy "members read photo reactions" on public.memory_reactions for select to authenticated
  using (exists(select 1 from public.memories m where m.id=memory_id and (m.status='approved' or m.user_id=auth.uid() or public.nexora_is_market_admin())));
drop policy if exists "members react to visible photos" on public.memory_reactions;
create policy "members react to visible photos" on public.memory_reactions for insert to authenticated
  with check (user_id=auth.uid() and exists(select 1 from public.memories m where m.id=memory_id and m.status='approved'));
drop policy if exists "members remove own reactions" on public.memory_reactions;
create policy "members remove own reactions" on public.memory_reactions for delete to authenticated using(user_id=auth.uid());
drop policy if exists "members read own favorites" on public.memory_favorites;
create policy "members read own favorites" on public.memory_favorites for select to authenticated using(user_id=auth.uid());
drop policy if exists "members favorite visible photos" on public.memory_favorites;
create policy "members favorite visible photos" on public.memory_favorites for insert to authenticated
  with check(user_id=auth.uid() and exists(select 1 from public.memories m where m.id=memory_id and m.status='approved'));
drop policy if exists "members unfavorite own photos" on public.memory_favorites;
create policy "members unfavorite own photos" on public.memory_favorites for delete to authenticated using(user_id=auth.uid());

commit;
