-- Repair the storage and roulette prerequisites used by the current NEXORA web app.
-- Safe to re-run in Supabase SQL Editor after the existing NEXORA migrations.
begin;

-- The browser uploads private images to this bucket and reads them through signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nexora-photos', 'nexora-photos', false, 12582912,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Older installations may have a different default or overlapping INSERT policies.
alter table public.memories alter column status set default 'pending';
grant insert on public.memories to authenticated;
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
create policy "members submit own pending memories" on public.memories
  for insert to authenticated with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "nexora members upload to own folder" on storage.objects;
create policy "nexora members upload to own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'nexora-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "nexora members read approved media" on storage.objects;
drop policy if exists "nexora public read approved media" on storage.objects;
create policy "nexora members read approved media" on storage.objects
  for select to authenticated using (
    bucket_id = 'nexora-photos' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.nexora_is_market_admin()
      or exists (select 1 from public.memories m where m.storage_path = name and m.status = 'approved')
      or exists (select 1 from public.trip_participants p where p.avatar_path = name)
    )
  );
drop policy if exists "members delete own unlinked media" on storage.objects;
create policy "members delete own unlinked media" on storage.objects
  for delete to authenticated using (
    bucket_id = 'nexora-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (select 1 from public.memories m where m.storage_path = name)
    and not exists (select 1 from public.trip_participants p where p.avatar_path = name)
  );

-- The shared roulette RPC is the single authoritative writer for all clients.
create table if not exists public.nexora_roulette_state (
  singleton boolean primary key default true check (singleton),
  spin_id bigint not null default 0,
  prompt text not null default '',
  participants jsonb not null default '[]'::jsonb,
  winner text,
  spun_at timestamptz
);
insert into public.nexora_roulette_state (singleton) values (true)
on conflict (singleton) do nothing;
alter table public.nexora_roulette_state enable row level security;
revoke all on public.nexora_roulette_state from public, anon, authenticated;
grant select on public.nexora_roulette_state to authenticated;
drop policy if exists "members read shared roulette state" on public.nexora_roulette_state;
create policy "members read shared roulette state" on public.nexora_roulette_state
  for select to authenticated using (true);

create or replace function public.nexora_spin_roulette(p_prompt text, p_participants jsonb)
returns jsonb language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_names text[];
  v_prompt text := btrim(coalesce(p_prompt, ''));
  v_winner text;
  v_now timestamptz;
  v_state public.nexora_roulette_state%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if char_length(v_prompt) > 100 then raise exception 'PROMPT_TOO_LONG' using errcode = '22023'; end if;
  if jsonb_typeof(p_participants) is distinct from 'array' then
    raise exception 'PARTICIPANTS_MUST_BE_AN_ARRAY' using errcode = '22023';
  end if;
  if jsonb_array_length(p_participants) > 50 then raise exception 'TOO_MANY_PARTICIPANTS' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_array_elements(p_participants) x(value) where jsonb_typeof(value) is distinct from 'string') then
    raise exception 'PARTICIPANTS_MUST_BE_STRINGS' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements_text(p_participants) x(value)
             where value is null or btrim(value) = '' or char_length(btrim(value)) > 60) then
    raise exception 'INVALID_PARTICIPANT_NAME' using errcode = '22023';
  end if;
  select array_agg(name order by first_position) into v_names
  from (
    select distinct on (lower(btrim(value))) btrim(value) name, ord first_position
    from jsonb_array_elements_text(p_participants) with ordinality x(value, ord)
    order by lower(btrim(value)), ord
  ) names;
  if coalesce(cardinality(v_names), 0) < 2 then
    raise exception 'AT_LEAST_TWO_PARTICIPANTS_REQUIRED' using errcode = '22023';
  end if;
  insert into public.nexora_roulette_state (singleton) values (true) on conflict (singleton) do nothing;
  select * into v_state from public.nexora_roulette_state where singleton for update;
  v_now := clock_timestamp();
  if v_state.spun_at is not null and v_state.spun_at > v_now - interval '8 seconds' then
    return jsonb_build_object('spin_id',v_state.spin_id,'prompt',v_state.prompt,
      'participants',v_state.participants,'winner',v_state.winner,'spun_at',v_state.spun_at);
  end if;
  v_winner := v_names[1 + floor(random() * cardinality(v_names))::integer];
  update public.nexora_roulette_state
  set spin_id = spin_id + 1, prompt = v_prompt, participants = to_jsonb(v_names), winner = v_winner, spun_at = v_now
  where singleton returning * into v_state;
  return jsonb_build_object('spin_id',v_state.spin_id,'prompt',v_state.prompt,
    'participants',v_state.participants,'winner',v_state.winner,'spun_at',v_state.spun_at);
end;
$$;
revoke all on function public.nexora_spin_roulette(text, jsonb) from public, anon;
grant execute on function public.nexora_spin_roulette(text, jsonb) to authenticated;

commit;
notify pgrst, 'reload schema';
