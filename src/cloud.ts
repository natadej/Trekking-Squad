import { nowPT } from './time';
import type { Avatar, Profile } from './types';
import { contestAvg, goalsOf } from './trophy';

// Online save + world leaderboard on Supabase. No sign-up: each device gets a random id + secret,
// and the "sync code" (id.secret) moves the same profile to another device. Schema: supabase/schema.sql.
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const ID_KEY = 'tsq.id.v1';
export const GOOGLE_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export interface CloudUser { uid: string; secret: string; isAnonymous: boolean; email?: string }
export interface Leader { uid: string; nick: string; points: number; avatar: Avatar; coins: number; stepsDay?: string; stepsToday?: number; stepsTotal?: number; avg?: number; days?: number; goalDay?: number; goalTrip?: number }

export const cloud = () => (URL && KEY ? { url: URL, key: KEY } : null);

async function rpc<T>(fn: string, args: Record<string, unknown>, token?: string): Promise<T> {
  const c = cloud();
  if (!c) throw new Error('Online save is not set up');
  const r = await fetch(`${c.url}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: { apikey: c.key, Authorization: `Bearer ${token ?? c.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`${fn} failed (${r.status})`);
  return r.json() as Promise<T>;
}

const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');

function identity(): CloudUser {
  try {
    const s = JSON.parse(localStorage.getItem(ID_KEY) ?? '');
    if (s?.uid && s?.secret) return { uid: s.uid, secret: s.secret, email: s.email, isAnonymous: !s.google };
  } catch { /* new device */ }
  const u = { uid: crypto.randomUUID(), secret: hex(16) };
  localStorage.setItem(ID_KEY, JSON.stringify(u));
  return { ...u, isAnonymous: true };
}

let listener: ((u: CloudUser | null) => void) | undefined;
export function watchUser(cb: (u: CloudUser | null) => void) {
  listener = cb;
  if (!cloud()) { cb(null); return () => { listener = undefined; }; }
  cb(identity());
  return () => { listener = undefined; };
}

/** True when Google (OpenID) sign-in is switched on in Supabase Auth. */
export async function googleEnabled() {
  const c = cloud();
  if (!c || !GOOGLE_ID) return false;
  try { const r = await fetch(`${c.url}/auth/v1/settings`, { headers: { apikey: c.key } }); return !!(await r.json())?.external?.google; } catch { return false; }
}

export interface TokenReply { access_token?: string; expires_in?: number | string; error?: string; error_description?: string }
interface Gsi { accounts: {
  id: { initialize: (o: object) => void; renderButton: (el: HTMLElement, o: object) => void };
  oauth2: { initTokenClient: (o: { client_id: string; scope: string; callback: (r: TokenReply) => void; error_callback?: (e: { type?: string; message?: string }) => void }) => { requestAccessToken: (o?: { prompt?: string }) => void } };
} }
let gsi: Promise<Gsi> | undefined;
export const loadGsi = () => (gsi ??= new Promise<Gsi>((ok, no) => {
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.onload = () => ok((window as unknown as { google: Gsi }).google);
  s.onerror = () => { gsi = undefined; no(new Error('Google sign-in could not load')); };
  document.head.appendChild(s);
}));
const sha256 = async (t: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))), (b) => b.toString(16).padStart(2, '0')).join('');

/** Google's own sign-in button (shows this site's name, not the Supabase address). */
export async function renderGoogleButton(el: HTMLElement, onError: (e: Error) => void) {
  const c = cloud();
  if (!c || !GOOGLE_ID) return;
  const g = await loadGsi();
  const nonce = hex(16);
  g.accounts.id.initialize({
    client_id: GOOGLE_ID, nonce: await sha256(nonce), ux_mode: 'popup', use_fedcm_for_button: true,
    callback: (r: { credential: string }) => finishGoogle(r.credential, nonce).catch(onError),
  });
  g.accounts.id.renderButton(el, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'center', width: Math.min(400, el.clientWidth || 320) });
}

/** Swap Google's ID token for a Supabase session, then for this player's id + secret. */
async function finishGoogle(idToken: string, nonce: string) {
  const c = cloud()!;
  const r = await fetch(`${c.url}/auth/v1/token?grant_type=id_token`, {
    method: 'POST', headers: { apikey: c.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'google', id_token: idToken, nonce }),
  });
  if (!r.ok) throw new Error(`Google sign-in failed (${r.status})`);
  const s = (await r.json()) as { access_token: string; user?: { email?: string } };
  const id = await rpc<{ uid: string; secret: string }>('tsq_google_identity', {}, s.access_token);
  localStorage.setItem(ID_KEY, JSON.stringify({ ...id, google: true, email: s.user?.email }));
  listener?.(identity());
}
export function signOutCloud() {
  localStorage.removeItem(ID_KEY);
  listener?.(identity());
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
  const s = stepStats(p), c = contestAvg(p.steps), g = goalsOf(p);
  await rpc('tsq_save', {
    p_avg: c.avg, p_days: c.days, p_goal_trip: g.trip, p_goal_day: g.day,
    p_id: u.uid, p_secret: u.secret, p_profile: p, p_nick: p.nick.slice(0, 24), p_points: p.points, p_coins: p.coins.length, p_avatar: p.avatar,
    p_steps_day: s.stepsDay, p_steps_today: s.stepsToday, p_steps_total: s.stepsTotal,
  });
}

export const stepStats = (p: Profile) => {
  const day = nowPT().day, steps = p.steps ?? {};
  return { stepsDay: day, stepsToday: steps[day] ?? 0, stepsTotal: Object.values(steps).reduce((a, b) => a + b, 0) };
};

interface Row { id: string; nick: string; points: number; coins: number; avatar: Avatar; steps_day: string; steps_today: number; steps_total: number; avg_steps: number; days: number; goal_trip: number; goal_day: number }
export function watchLeaders(cb: (rows: Leader[]) => void, everyMs = 15000) {
  if (!cloud()) return () => {};
  let on = true;
  const pull = () => rpc<Row[]>('tsq_leaders', { p_limit: 100 })
    .then((rows) => on && cb(rows.map((r) => ({ uid: r.id, nick: r.nick, points: r.points, coins: r.coins, avatar: r.avatar, stepsDay: r.steps_day, stepsToday: r.steps_today, stepsTotal: r.steps_total, avg: r.avg_steps, days: r.days, goalDay: r.goal_day, goalTrip: r.goal_trip }))))
    .catch(() => undefined);
  pull();
  const t = setInterval(pull, everyMs);
  return () => { on = false; clearInterval(t); };
}
