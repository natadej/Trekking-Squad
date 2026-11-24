import { nowPT } from './time';
import type { Avatar, Profile } from './types';

// Online save + world leaderboard on Supabase. No sign-up: each device gets a random id + secret,
// and the "sync code" (id.secret) moves the same profile to another device. Schema: supabase/schema.sql.
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const ID_KEY = 'tsq.id.v1';

export interface CloudUser { uid: string; secret: string; isAnonymous: boolean }
export interface Leader { uid: string; nick: string; points: number; avatar: Avatar; coins: number; stepsDay?: string; stepsToday?: number; stepsTotal?: number }

export const cloud = () => (URL && KEY ? { url: URL, key: KEY } : null);

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const c = cloud();
  if (!c) throw new Error('Online save is not set up');
  const r = await fetch(`${c.url}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`${fn} failed (${r.status})`);
  return r.json() as Promise<T>;
}

const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');

function identity(): CloudUser {
  try {
    const s = JSON.parse(localStorage.getItem(ID_KEY) ?? '');
    if (s?.uid && s?.secret) return { ...s, isAnonymous: true };
  } catch { /* new device */ }
  const u = { uid: crypto.randomUUID(), secret: hex(16) };
  localStorage.setItem(ID_KEY, JSON.stringify(u));
  return { ...u, isAnonymous: true };
}

let listener: ((u: CloudUser | null) => void) | undefined;
export function watchUser(cb: (u: CloudUser | null) => void) {
  listener = cb;
  cb(cloud() ? identity() : null);
  return () => { listener = undefined; };
}

export const syncCode = () => { const u = identity(); return `${u.uid}.${u.secret}`; };

/** Switch this device to the profile behind a sync code from another device. */
export async function loadSyncCode(code: string) {
  const m = code.trim().match(/^([0-9a-f-]{36})\.([0-9a-f]{24,})$/i);
  if (!m) throw new Error('That code does not look right');
  const prof = await rpc<Profile | null>('tsq_load', { p_id: m[1], p_secret: m[2] });
  if (!prof) throw new Error('No profile found for that code');
  localStorage.setItem(ID_KEY, JSON.stringify({ uid: m[1], secret: m[2] }));
  listener?.(identity());
  return prof;
}

export async function loadRemote(u: CloudUser): Promise<Profile | null> {
  return cloud() ? rpc<Profile | null>('tsq_load', { p_id: u.uid, p_secret: u.secret }) : null;
}

export async function saveRemote(u: CloudUser, p: Profile) {
  if (!cloud()) return;
  const s = stepStats(p);
  await rpc('tsq_save', {
    p_id: u.uid, p_secret: u.secret, p_profile: p, p_nick: p.nick.slice(0, 24), p_points: p.points, p_coins: p.coins.length, p_avatar: p.avatar,
    p_steps_day: s.stepsDay, p_steps_today: s.stepsToday, p_steps_total: s.stepsTotal,
  });
}

export const stepStats = (p: Profile) => {
  const day = nowPT().day, steps = p.steps ?? {};
  return { stepsDay: day, stepsToday: steps[day] ?? 0, stepsTotal: Object.values(steps).reduce((a, b) => a + b, 0) };
};

interface Row { id: string; nick: string; points: number; coins: number; avatar: Avatar; steps_day: string; steps_today: number; steps_total: number }
export function watchLeaders(cb: (rows: Leader[]) => void, everyMs = 15000) {
  if (!cloud()) return () => {};
  let on = true;
  const pull = () => rpc<Row[]>('tsq_leaders', { p_limit: 50 })
    .then((rows) => on && cb(rows.map((r) => ({ uid: r.id, nick: r.nick, points: r.points, coins: r.coins, avatar: r.avatar, stepsDay: r.steps_day, stepsToday: r.steps_today, stepsTotal: r.steps_total }))))
    .catch(() => undefined);
  pull();
  const t = setInterval(pull, everyMs);
  return () => { on = false; clearInterval(t); };
}
