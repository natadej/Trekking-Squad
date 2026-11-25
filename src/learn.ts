import type { Session } from './types';

/** What the app has learned about the player's taste: topic/area/type -> weight. */
export type Learn = Record<string, number>;

const keys = (s: Session) => [...s.tp, ...s.a, `type:${s.y}`];

/** Picking a class teaches +2, opening details +0.5, dropping one −1. */
export function learnFrom(l: Learn | undefined, s: Session, w: number): Learn {
  const n = { ...(l ?? {}) };
  for (const k of keys(s)) n[k] = Math.max(-5, Math.min(20, Math.round(((n[k] ?? 0) + w) * 10) / 10));
  return n;
}

export const learnScore = (l: Learn | undefined, s: Session) => (l ? keys(s).reduce((a, k) => a + (l[k] ?? 0), 0) * 0.4 : 0);

/** The strongest learned likes, for "Because you like …". */
export const topLikes = (l: Learn | undefined, n = 3) =>
  Object.entries(l ?? {}).filter(([k, v]) => v >= 2 && !k.startsWith('type:')).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
