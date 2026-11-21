-- Multiplayer Horde duel (shared-code score match).
--
-- Security model: anonymous players share a 6-character code. Direct table
-- access is denied to anon/authenticated. All reads and writes go through
-- SECURITY DEFINER functions granted to anon. A seat is updated only with the
-- random client token returned when that seat was created, so one player cannot
-- overwrite the other player's score. Scores are player-submitted and are NOT
-- an anti-cheat authority; use this for friendly duels only.
--
-- Apply once in the Supabase SQL editor (or with `supabase db push`).

create table if not exists public.horde_duels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  match_mode text not null default 'duel' check (match_mode in ('duel', 'coop')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard', 'maniac', 'doom')),
  duration text not null check (duration in ('1m', '5m', 'unlimited')),
  seed integer not null check (seed >= 0),
  status text not null default 'open' check (status in ('open', 'complete')),
  host_name text not null check (char_length(host_name) between 1 and 24),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create table if not exists public.horde_duel_players (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid not null references public.horde_duels(id) on delete cascade,
  seat smallint not null check (seat in (1, 2)),
  player_name text not null check (char_length(player_name) between 1 and 24),
  score integer not null default 0 check (score >= 0),
  kills integer not null default 0 check (kills >= 0),
  counter_kills integer not null default 0 check (counter_kills >= 0),
  wave_reached integer not null default 1 check (wave_reached >= 1),
  survived_seconds integer not null default 0 check (survived_seconds >= 0),
  cleared boolean not null default false,
  finished boolean not null default false,
  is_host boolean not null default false,
  client_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (duel_id, seat)
);

create index if not exists horde_duel_players_duel_idx
  on public.horde_duel_players (duel_id, seat);

alter table public.horde_duels enable row level security;
alter table public.horde_duel_players enable row level security;

-- No policies: anon/authenticated cannot read or write the tables directly.
revoke all on public.horde_duels from anon, authenticated;
revoke all on public.horde_duel_players from anon, authenticated;

create or replace function public.horde_duel_code()
returns text
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.horde_duel_snapshot(p_duel_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'code', d.code,
    'matchMode', d.match_mode,
    'difficulty', d.difficulty,
    'duration', d.duration,
    'seed', d.seed,
    'status', d.status,
    'expiresAt', to_char(d.expires_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'expired', d.expires_at <= now(),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'seat', p.seat,
        'name', p.player_name,
        'isHost', p.is_host,
        'finished', p.finished,
        'score', p.score,
        'kills', p.kills,
        'counterKills', p.counter_kills,
        'waveReached', p.wave_reached,
        'survivedSeconds', p.survived_seconds,
        'cleared', p.cleared
      ) order by p.seat)
      from public.horde_duel_players p
      where p.duel_id = d.id
    ), '[]'::jsonb)
  )
  from public.horde_duels d
  where d.id = p_duel_id;
$$;

create or replace function public.create_horde_duel(
  p_host_name text,
  p_difficulty text,
  p_duration text,
  p_match_mode text,
  p_seed integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := left(regexp_replace(btrim(coalesce(p_host_name, '')), '\s+', ' ', 'g'), 24);
  v_seed integer := greatest(0, least(2147483647, coalesce(p_seed, floor(random() * 2147483647)::integer)));
  v_code text;
  v_duel_id uuid;
  v_player_id uuid;
  v_token uuid := gen_random_uuid();
  v_attempt integer := 0;
begin
  if v_name = '' then raise exception 'INVALID_NAME'; end if;
  if p_difficulty not in ('easy', 'medium', 'hard', 'maniac', 'doom') then
    raise exception 'INVALID_DIFFICULTY';
  end if;
  if p_duration not in ('1m', '5m', 'unlimited') then
    raise exception 'INVALID_DURATION';
  end if;
  if p_match_mode not in ('duel', 'coop') then
    raise exception 'INVALID_MODE';
  end if;

  loop
    v_code := public.horde_duel_code();
    exit when not exists (select 1 from public.horde_duels where code = v_code);
    v_attempt := v_attempt + 1;
    if v_attempt >= 20 then raise exception 'CODE_GENERATION_FAILED'; end if;
  end loop;

  insert into public.horde_duels (code, match_mode, difficulty, duration, seed, host_name, expires_at)
  values (v_code, p_match_mode, p_difficulty, p_duration, v_seed, v_name, now() + interval '24 hours')
  returning id into v_duel_id;

  insert into public.horde_duel_players (duel_id, seat, player_name, is_host, client_token)
  values (v_duel_id, 1, v_name, true, v_token)
  returning id into v_player_id;

  return jsonb_build_object(
    'room', public.horde_duel_snapshot(v_duel_id),
    'playerId', v_player_id,
    'token', v_token,
    'seat', 1
  );
end;
$$;

create or replace function public.join_horde_duel(
  p_code text,
  p_player_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_name text := left(regexp_replace(btrim(coalesce(p_player_name, '')), '\s+', ' ', 'g'), 24);
  v_duel public.horde_duels%rowtype;
  v_seat smallint;
  v_player_id uuid;
  v_token uuid := gen_random_uuid();
begin
  if length(v_code) <> 6 then raise exception 'INVALID_CODE'; end if;
  if v_name = '' then raise exception 'INVALID_NAME'; end if;

  select * into v_duel from public.horde_duels where code = v_code for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_duel.expires_at <= now() then raise exception 'ROOM_EXPIRED'; end if;
  if exists (
    select 1 from public.horde_duel_players
    where duel_id = v_duel.id and lower(player_name) = lower(v_name)
  ) then
    raise exception 'NAME_TAKEN';
  end if;

  select coalesce(max(seat), 0) + 1 into v_seat
  from public.horde_duel_players
  where duel_id = v_duel.id;

  if v_seat > 2 then raise exception 'ROOM_FULL'; end if;

  insert into public.horde_duel_players (duel_id, seat, player_name, is_host, client_token)
  values (v_duel.id, v_seat, v_name, false, v_token)
  returning id into v_player_id;

  return jsonb_build_object(
    'room', public.horde_duel_snapshot(v_duel.id),
    'playerId', v_player_id,
    'token', v_token,
    'seat', v_seat
  );
exception
  when unique_violation then raise exception 'ROOM_FULL';
end;
$$;

create or replace function public.get_horde_duel(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_snapshot jsonb;
begin
  select public.horde_duel_snapshot(d.id) into v_snapshot
  from public.horde_duels d
  where d.code = upper(btrim(coalesce(p_code, '')));

  if v_snapshot is null then raise exception 'ROOM_NOT_FOUND'; end if;
  return v_snapshot;
end;
$$;

create or replace function public.submit_horde_duel_score(
  p_player_id uuid,
  p_token uuid,
  p_score integer,
  p_kills integer,
  p_counter_kills integer,
  p_wave_reached integer,
  p_survived_seconds integer,
  p_cleared boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_duel_id uuid;
  v_finished boolean;
begin
  if p_score is null or p_score < 0 or p_score > 2147483647 then
    raise exception 'INVALID_SCORE';
  end if;

  update public.horde_duel_players
     set score = p_score,
         kills = greatest(0, coalesce(p_kills, 0)),
         counter_kills = greatest(0, coalesce(p_counter_kills, 0)),
         wave_reached = greatest(1, coalesce(p_wave_reached, 1)),
         survived_seconds = greatest(0, coalesce(p_survived_seconds, 0)),
         cleared = coalesce(p_cleared, false),
         finished = true,
         updated_at = now()
   where id = p_player_id
     and client_token = p_token
     and finished = false
  returning duel_id into v_duel_id;

  if v_duel_id is null then
    select duel_id, finished into v_duel_id, v_finished
    from public.horde_duel_players
    where id = p_player_id and client_token = p_token;

    if not found then raise exception 'INVALID_TOKEN'; end if;
    if v_finished then raise exception 'ALREADY_FINISHED'; end if;
    raise exception 'UNKNOWN';
  end if;

  if not exists (
    select 1 from public.horde_duel_players
    where duel_id = v_duel_id and finished = false
  ) then
    update public.horde_duels set status = 'complete' where id = v_duel_id;
  end if;

  return public.horde_duel_snapshot(v_duel_id);
end;
$$;

-- Only the public RPCs are callable by clients. Helpers stay private.
revoke all on function public.horde_duel_code() from public, anon, authenticated;
revoke all on function public.horde_duel_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.create_horde_duel(text, text, text, text, integer) from public;
revoke all on function public.join_horde_duel(text, text) from public;
revoke all on function public.get_horde_duel(text) from public;
revoke all on function public.submit_horde_duel_score(uuid, uuid, integer, integer, integer, integer, integer, boolean) from public;

grant execute on function public.create_horde_duel(text, text, text, text, integer) to anon, authenticated;
grant execute on function public.join_horde_duel(text, text) to anon, authenticated;
grant execute on function public.get_horde_duel(text) to anon, authenticated;
grant execute on function public.submit_horde_duel_score(uuid, uuid, integer, integer, integer, integer, integer, boolean) to anon, authenticated;

comment on table public.horde_duels is 'Shared-code Horde duels. Client access only through token-gated RPCs.';
comment on table public.horde_duel_players is 'One row per duel seat. client_token is a capability returned only to that seat.';
