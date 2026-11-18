-- Run once in Supabase SQL Editor after the NEXORA setup and migrations.
-- Promotes the specified owner, grants 1,000 NexaCoins once, and unlocks active items.
begin;

do $$
declare
  v_user constant uuid := '09bba4dc-3b19-4846-ac8e-f3c79ca4b85e';
  v_email text;
  v_added integer;
begin
  select email into v_email from auth.users where id = v_user;
  if not found then
    raise exception 'No existe auth.users para el UUID %; inicia sesión con esa cuenta y vuelve a ejecutar este script.', v_user;
  end if;

  -- Serialize reruns so the one-time credit cannot be applied twice.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 2026));

  insert into public.profiles (user_id, email, is_admin)
  values (v_user, coalesce(v_email, ''), true)
  on conflict (user_id) do update set is_admin = true,
    email = coalesce(nullif(public.profiles.email, ''), excluded.email);

  insert into public.trip_participants (user_id, display_name)
  select u.id, coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'Administrador')
  from auth.users u where u.id = v_user
  on conflict (user_id) do nothing;

  insert into public.coin_transactions (user_id, delta, reason, created_by)
  select v_user, 1000, 'Bono inicial de propietario NEXORA', v_user
  where not exists (
    select 1 from public.coin_transactions
    where user_id = v_user and reason = 'Bono inicial de propietario NEXORA'
  );
  get diagnostics v_added = row_count;
  if v_added > 0 then
    update public.profiles set coin_balance = coin_balance + 1000 where user_id = v_user;
  end if;

  insert into public.user_inventory (user_id, item_id)
  select v_user, item.id from public.store_items item where item.active
  on conflict (user_id, item_id) do nothing;
end;
$$;

commit;
notify pgrst, 'reload schema';
