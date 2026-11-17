-- Award 10 NexaCoins for every elapsed 10-minute interval.
-- Run after 20261120_nexora_private_social.sql and 20261121_nexora_anonymous_guests.sql.
begin;

create or replace function public.nexora_claim_coin_reward()
returns jsonb language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_last timestamptz;
  v_now timestamptz := clock_timestamp();
  v_count bigint;
  v_balance bigint;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  select last_coin_reward_at into v_last
    from public.profiles where user_id = v_user for update;
  if not found then raise exception 'PROFILE_REQUIRED' using errcode = 'P0002'; end if;

  if v_last is null then
    update public.profiles set last_coin_reward_at = v_now where user_id = v_user;
    select coin_balance into v_balance from public.profiles where user_id = v_user;
    return jsonb_build_object('awarded', 0, 'balance', v_balance, 'next_at', v_now + interval '10 minutes');
  end if;

  v_count := floor(extract(epoch from (v_now - v_last)) / 600)::bigint;
  if v_count < 1 then
    select coin_balance into v_balance from public.profiles where user_id = v_user;
    return jsonb_build_object('awarded', 0, 'balance', v_balance, 'next_at', v_last + interval '10 minutes');
  end if;

  update public.profiles
    set coin_balance = coin_balance + (10 * v_count),
        last_coin_reward_at = v_last + (interval '10 minutes' * v_count)
    where user_id = v_user
    returning coin_balance, last_coin_reward_at into v_balance, v_last;
  insert into public.coin_transactions(user_id, delta, reason)
    values (v_user, 10 * v_count, 'Recompensa NexaCoins · 10 minutos');

  return jsonb_build_object(
    'awarded', 10 * v_count,
    'balance', v_balance,
    'next_at', v_last + interval '10 minutes'
  );
end;
$$;

revoke all on function public.nexora_claim_coin_reward() from public, anon;
grant execute on function public.nexora_claim_coin_reward() to authenticated;

drop policy if exists "members delete own unlinked media" on storage.objects;
create policy "members delete own unlinked media" on storage.objects
  for delete to authenticated using (
    bucket_id = 'nexora-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (select 1 from public.memories m where m.storage_path = name)
  );

commit;
notify pgrst, 'reload schema';
