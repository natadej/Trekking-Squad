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
