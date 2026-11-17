-- Share one roulette spin and its result across all authenticated trip members.
begin;

create table if not exists public.nexora_roulette_state (
  singleton boolean primary key default true check (singleton),
  spin_id bigint not null default 0,
  prompt text not null default '',
  participants jsonb not null default '[]'::jsonb,
  winner text,
  spun_at timestamptz
);

insert into public.nexora_roulette_state (singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.nexora_roulette_state enable row level security;
revoke all on public.nexora_roulette_state from public, anon, authenticated;
grant select on public.nexora_roulette_state to authenticated;

drop policy if exists "members read shared roulette state" on public.nexora_roulette_state;
create policy "members read shared roulette state" on public.nexora_roulette_state
  for select to authenticated using (true);

create or replace function public.nexora_spin_roulette(p_prompt text, p_participants jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_names text[];
  v_prompt text := btrim(coalesce(p_prompt, ''));
  v_winner text;
  v_now timestamptz;
  v_state public.nexora_roulette_state%rowtype;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if char_length(v_prompt) > 100 then
    raise exception 'PROMPT_TOO_LONG' using errcode = '22023';
  end if;
  if jsonb_typeof(p_participants) is distinct from 'array' then
    raise exception 'PARTICIPANTS_MUST_BE_AN_ARRAY' using errcode = '22023';
  end if;
  if jsonb_array_length(p_participants) > 50 then
    raise exception 'TOO_MANY_PARTICIPANTS' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_participants) as participant(value)
    where jsonb_typeof(value) is distinct from 'string'
  ) then
    raise exception 'PARTICIPANTS_MUST_BE_STRINGS' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements_text(p_participants) as participant(value)
    where value is null or btrim(value) = '' or char_length(btrim(value)) > 60
  ) then
    raise exception 'INVALID_PARTICIPANT_NAME' using errcode = '22023';
  end if;

  select array_agg(name order by first_position)
    into v_names
    from (
      select distinct on (lower(btrim(value)))
        btrim(value) as name,
        ord as first_position
      from jsonb_array_elements_text(p_participants) with ordinality as participant(value, ord)
      order by lower(btrim(value)), ord
    ) distinct_participants;

  if coalesce(cardinality(v_names), 0) < 2 then
    raise exception 'AT_LEAST_TWO_PARTICIPANTS_REQUIRED' using errcode = '22023';
  end if;

  insert into public.nexora_roulette_state (singleton)
  values (true)
  on conflict (singleton) do nothing;

  select * into v_state
    from public.nexora_roulette_state
    where singleton = true
    for update;

  v_now := clock_timestamp();
  if v_state.spun_at is not null and v_state.spun_at > v_now - interval '8 seconds' then
    return jsonb_build_object(
      'spin_id', v_state.spin_id,
      'prompt', v_state.prompt,
      'participants', v_state.participants,
      'winner', v_state.winner,
      'spun_at', v_state.spun_at
    );
  end if;

  v_winner := v_names[1 + floor(random() * cardinality(v_names))::integer];

  update public.nexora_roulette_state
    set spin_id = spin_id + 1,
        prompt = v_prompt,
        participants = to_jsonb(v_names),
        winner = v_winner,
        spun_at = v_now
    where singleton = true
    returning * into v_state;

  return jsonb_build_object(
    'spin_id', v_state.spin_id,
    'prompt', v_state.prompt,
    'participants', v_state.participants,
    'winner', v_state.winner,
    'spun_at', v_state.spun_at
  );
end;
$$;

revoke all on function public.nexora_spin_roulette(text, jsonb) from public, anon;
grant execute on function public.nexora_spin_roulette(text, jsonb) to authenticated;

commit;
notify pgrst, 'reload schema';
