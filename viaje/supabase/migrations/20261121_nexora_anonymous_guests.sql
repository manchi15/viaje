-- NEXORA guest accounts: persistent Supabase anonymous sessions, private per-user data.
-- Run after nexora_setup.sql and 20261120_nexora_private_social.sql.
begin;

create sequence if not exists public.nexora_guest_name_seq;
revoke all on sequence public.nexora_guest_name_seq from public, anon, authenticated;

alter table public.trip_participants
  add column if not exists description text not null default '' check (char_length(description) <= 280),
  add column if not exists aura_style text not null default 'none'
    check (aura_style in ('none', 'rose', 'gold', 'violet', 'ice'));

grant update (description, aura_style) on public.trip_participants to authenticated;

-- Anonymous identities do not have an email invitation; normal email signups remain restricted.
create or replace function public.nexora_enforce_invitation()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare v_invite public.nexora_invites%rowtype;
begin
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;
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

-- Supabase creates the UUID. Profiles and participant cards are created in the same transaction.
-- The existing profiles.coin_balance default (0 NR Coins) remains the initial wallet configuration.
create or replace function public.nexora_market_profile_on_signup()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare
  v_display_name text;
begin
  if coalesce(new.is_anonymous, false) then
    v_display_name := 'Invitado ' || lpad(nextval('public.nexora_guest_name_seq')::text, 3, '0');
  else
    v_display_name := coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Participante'
    );
  end if;

  insert into public.profiles (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do nothing;
  insert into public.trip_participants (user_id, display_name)
  values (new.id, v_display_name)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

commit;
