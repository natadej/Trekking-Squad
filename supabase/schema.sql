-- Trekking Squad online save + world step leaderboard (Supabase project "vegas-quest").
-- No Supabase Auth: each device has a random id + secret; the table is closed to anon and
-- only reachable through these secret-checked SECURITY DEFINER functions.
create table if not exists public.tsq_players (
  id uuid primary key,
  secret_hash text not null,
  nick text not null default '',
  points integer not null default 0,
  coins integer not null default 0,
  avatar jsonb not null default '{}'::jsonb,
  steps_day text,
  steps_today integer not null default 0,
  steps_total integer not null default 0,
  profile jsonb,
  updated_at timestamptz not null default now()
);
alter table public.tsq_players enable row level security;
revoke all on table public.tsq_players from anon, authenticated;
create index if not exists tsq_players_steps_total on public.tsq_players (steps_total desc);

create or replace function public.tsq_save(p_id uuid, p_secret text, p_profile jsonb, p_nick text, p_points integer, p_coins integer, p_avatar jsonb, p_steps_day text, p_steps_today integer, p_steps_total integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare h text; n integer;
begin
  if p_secret is null or length(p_secret) < 24 then raise exception 'bad secret'; end if;
  if pg_column_size(p_profile) > 300000 or pg_column_size(p_avatar) > 4000 then raise exception 'too large'; end if;
  h := encode(sha256(convert_to(p_secret, 'UTF8')), 'hex');
  insert into public.tsq_players as t (id, secret_hash, nick, points, coins, avatar, steps_day, steps_today, steps_total, profile, updated_at)
  values (p_id, h, left(coalesce(p_nick, ''), 24), least(greatest(coalesce(p_points, 0), 0), 10000000), least(greatest(coalesce(p_coins, 0), 0), 1000),
          coalesce(p_avatar, '{}'::jsonb), left(p_steps_day, 10), least(greatest(coalesce(p_steps_today, 0), 0), 150000), least(greatest(coalesce(p_steps_total, 0), 0), 1500000), p_profile, now())
  on conflict (id) do update set nick = excluded.nick, points = excluded.points, coins = excluded.coins, avatar = excluded.avatar,
    steps_day = excluded.steps_day, steps_today = excluded.steps_today, steps_total = excluded.steps_total, profile = excluded.profile, updated_at = now()
  where t.secret_hash = excluded.secret_hash;
  get diagnostics n = row_count;
  return n > 0;
end $$;

create or replace function public.tsq_load(p_id uuid, p_secret text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select profile from public.tsq_players where id = p_id and secret_hash = encode(sha256(convert_to(p_secret, 'UTF8')), 'hex');
$$;

create or replace function public.tsq_leaders(p_limit integer default 50)
returns table (id uuid, nick text, points integer, coins integer, avatar jsonb, steps_day text, steps_today integer, steps_total integer)
language sql stable security definer set search_path = '' as $$
  select id, nick, points, coins, avatar, steps_day, steps_today, steps_total from public.tsq_players
  order by steps_total desc, points desc limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function public.tsq_save(uuid, text, jsonb, text, integer, integer, jsonb, text, integer, integer) from public;
revoke all on function public.tsq_load(uuid, text) from public;
revoke all on function public.tsq_leaders(integer) from public;
grant execute on function public.tsq_save(uuid, text, jsonb, text, integer, integer, jsonb, text, integer, integer) to anon, authenticated;
grant execute on function public.tsq_load(uuid, text) to anon, authenticated;
grant execute on function public.tsq_leaders(integer) to anon, authenticated;

-- ── Step contest + Google sign-in (migration 2) ─────────────────────────────
alter table public.tsq_players
  add column if not exists avg_steps integer not null default 0,
  add column if not exists days integer not null default 0,
  add column if not exists goal_trip integer not null default 0,
  add column if not exists goal_day integer not null default 0;

drop function if exists public.tsq_save(uuid, text, jsonb, text, integer, integer, jsonb, text, integer, integer);
drop function if exists public.tsq_leaders(integer);

create or replace function public.tsq_save(p_id uuid, p_secret text, p_profile jsonb, p_nick text, p_points integer, p_coins integer, p_avatar jsonb, p_steps_day text, p_steps_today integer, p_steps_total integer, p_avg integer, p_days integer, p_goal_trip integer, p_goal_day integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare h text; n integer;
begin
  if p_secret is null or length(p_secret) < 24 then raise exception 'bad secret'; end if;
  if pg_column_size(p_profile) > 300000 or pg_column_size(p_avatar) > 4000 then raise exception 'too large'; end if;
  h := encode(sha256(convert_to(p_secret, 'UTF8')), 'hex');
  insert into public.tsq_players as t (id, secret_hash, nick, points, coins, avatar, steps_day, steps_today, steps_total, avg_steps, days, goal_trip, goal_day, profile, updated_at)
  values (p_id, h, left(coalesce(p_nick, ''), 24), least(greatest(coalesce(p_points, 0), 0), 10000000), least(greatest(coalesce(p_coins, 0), 0), 1000),
          coalesce(p_avatar, '{}'::jsonb), left(p_steps_day, 10), least(greatest(coalesce(p_steps_today, 0), 0), 150000), least(greatest(coalesce(p_steps_total, 0), 0), 1500000),
          least(greatest(coalesce(p_avg, 0), 0), 100000), least(greatest(coalesce(p_days, 0), 0), 30), least(greatest(coalesce(p_goal_trip, 0), 0), 2000000), least(greatest(coalesce(p_goal_day, 0), 0), 150000), p_profile, now())
  on conflict (id) do update set nick = excluded.nick, points = excluded.points, coins = excluded.coins, avatar = excluded.avatar,
    steps_day = excluded.steps_day, steps_today = excluded.steps_today, steps_total = excluded.steps_total, avg_steps = excluded.avg_steps, days = excluded.days,
    goal_trip = excluded.goal_trip, goal_day = excluded.goal_day, profile = excluded.profile, updated_at = now()
  where t.secret_hash = excluded.secret_hash;
  get diagnostics n = row_count;
  return n > 0;
end $$;

create or replace function public.tsq_leaders(p_limit integer default 100)
returns table(id uuid, nick text, points integer, coins integer, avatar jsonb, steps_day text, steps_today integer, steps_total integer, avg_steps integer, days integer, goal_trip integer, goal_day integer)
language sql stable security definer set search_path = '' as $$
  select id, nick, points, coins, avatar, steps_day, steps_today, steps_total, avg_steps, days, goal_trip, goal_day from public.tsq_players
  where nick <> '' order by avg_steps desc, steps_total desc limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

-- Google (OpenID) users get a stable player id + secret tied to their Supabase Auth user.
create table if not exists public.tsq_google (
  auth_uid uuid primary key,
  player_id uuid not null,
  secret text not null,
  created_at timestamptz not null default now()
);
alter table public.tsq_google enable row level security;
revoke all on public.tsq_google from anon, authenticated;

create or replace function public.tsq_google_identity()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); r public.tsq_google;
begin
  if u is null then raise exception 'not signed in'; end if;
  select * into r from public.tsq_google where auth_uid = u;
  if not found then
    insert into public.tsq_google (auth_uid, player_id, secret) values (u, gen_random_uuid(), encode(extensions.gen_random_bytes(16), 'hex')) returning * into r;
  end if;
  return jsonb_build_object('uid', r.player_id, 'secret', r.secret);
end $$;

grant execute on function public.tsq_save(uuid, text, jsonb, text, integer, integer, jsonb, text, integer, integer, integer, integer, integer, integer) to anon, authenticated;
grant execute on function public.tsq_leaders(integer) to anon, authenticated;
revoke execute on function public.tsq_google_identity() from anon;
grant execute on function public.tsq_google_identity() to authenticated;

-- ── Episodes (migration 3): one row per player per episode; leaderboard per episode ──
alter table public.tsq_players add column if not exists ep text not null default 'vegas';
alter table public.tsq_players drop constraint if exists tsq_players_pkey;
alter table public.tsq_players add primary key (id, ep);
create index if not exists tsq_players_ep_avg on public.tsq_players (ep, avg_steps desc);

drop function if exists public.tsq_save(uuid, text, jsonb, text, integer, integer, jsonb, text, integer, integer, integer, integer, integer, integer);
drop function if exists public.tsq_load(uuid, text);
drop function if exists public.tsq_leaders(integer);

create or replace function public.tsq_save(p_id uuid, p_secret text, p_profile jsonb, p_nick text, p_points integer, p_coins integer, p_avatar jsonb, p_steps_day text, p_steps_today integer, p_steps_total integer, p_avg integer, p_days integer, p_goal_trip integer, p_goal_day integer, p_ep text default 'vegas')
returns boolean language plpgsql security definer set search_path = '' as $$
declare h text; n integer; e text := coalesce(nullif(left(p_ep, 16), ''), 'vegas');
begin
  if p_secret is null or length(p_secret) < 24 then raise exception 'bad secret'; end if;
  if e !~ '^[a-z0-9-]+$' then raise exception 'bad episode'; end if;
  if pg_column_size(p_profile) > 300000 or pg_column_size(p_avatar) > 4000 then raise exception 'too large'; end if;
  h := encode(sha256(convert_to(p_secret, 'UTF8')), 'hex');
  -- the same id must keep the same secret across episodes
  if exists (select 1 from public.tsq_players where id = p_id and secret_hash <> h) then return false; end if;
  insert into public.tsq_players as t (id, ep, secret_hash, nick, points, coins, avatar, steps_day, steps_today, steps_total, avg_steps, days, goal_trip, goal_day, profile, updated_at)
  values (p_id, e, h, left(coalesce(p_nick, ''), 24), least(greatest(coalesce(p_points, 0), 0), 10000000), least(greatest(coalesce(p_coins, 0), 0), 1000),
          coalesce(p_avatar, '{}'::jsonb), left(p_steps_day, 10), least(greatest(coalesce(p_steps_today, 0), 0), 150000), least(greatest(coalesce(p_steps_total, 0), 0), 1500000),
          least(greatest(coalesce(p_avg, 0), 0), 100000), least(greatest(coalesce(p_days, 0), 0), 30), least(greatest(coalesce(p_goal_trip, 0), 0), 2000000), least(greatest(coalesce(p_goal_day, 0), 0), 150000), p_profile, now())
  on conflict (id, ep) do update set nick = excluded.nick, points = excluded.points, coins = excluded.coins, avatar = excluded.avatar,
    steps_day = excluded.steps_day, steps_today = excluded.steps_today, steps_total = excluded.steps_total, avg_steps = excluded.avg_steps, days = excluded.days,
    goal_trip = excluded.goal_trip, goal_day = excluded.goal_day, profile = excluded.profile, updated_at = now()
  where t.secret_hash = excluded.secret_hash;
  get diagnostics n = row_count;
  return n > 0;
end $$;

create or replace function public.tsq_load(p_id uuid, p_secret text, p_ep text default 'vegas')
returns jsonb language sql stable security definer set search_path = '' as $$
  select profile from public.tsq_players where id = p_id and ep = coalesce(nullif(p_ep, ''), 'vegas') and secret_hash = encode(sha256(convert_to(p_secret, 'UTF8')), 'hex');
$$;

create or replace function public.tsq_leaders(p_limit integer default 100, p_ep text default 'vegas')
returns table(id uuid, nick text, points integer, coins integer, avatar jsonb, steps_day text, steps_today integer, steps_total integer, avg_steps integer, days integer, goal_trip integer, goal_day integer)
language sql stable security definer set search_path = '' as $$
  select id, nick, points, coins, avatar, steps_day, steps_today, steps_total, avg_steps, days, goal_trip, goal_day from public.tsq_players
  where nick <> '' and ep = coalesce(nullif(p_ep, ''), 'vegas') order by avg_steps desc, steps_total desc limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

revoke all on function public.tsq_save(uuid, text, jsonb, text, integer, integer, jsonb, text, integer, integer, integer, integer, integer, integer, text) from public;
revoke all on function public.tsq_load(uuid, text, text) from public;
revoke all on function public.tsq_leaders(integer, text) from public;
grant execute on function public.tsq_save(uuid, text, jsonb, text, integer, integer, jsonb, text, integer, integer, integer, integer, integer, integer, text) to anon, authenticated;
grant execute on function public.tsq_load(uuid, text, text) to anon, authenticated;
grant execute on function public.tsq_leaders(integer, text) to anon, authenticated;
