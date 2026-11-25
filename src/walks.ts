import { EP } from './episode';
import { addDays } from './time';

type Done = { id: string; day: string; steps: number };

export const CHEST_EVERY = 3;
export const WALK_BADGES = [
  { n: 1, icon: '👟', name: 'First walk' },
  { n: 5, icon: '🧭', name: 'Explorer' },
  { n: 10, icon: '🏙️', name: 'Strip walker' },
  { n: 25, icon: '👑', name: `${EP.city} legend` },
];

/** Days in a row, ending on the last walk day, with at least one finished walk. */
export function streakOf(done: Done[], today?: string) {
  const days = new Set(done.map((d) => d.day));
  let d = today ?? [...days].sort().pop();
  if (!d) return 0;
  if (!days.has(d)) d = addDays(d, -1);
  let n = 0;
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

/** Points for the walk just added to `done`: 1 per 10 steps, +50 per streak day, and a chest every 3 walks. */
export function walkReward(done: Done[]) {
  const last = done[done.length - 1];
  const streak = streakOf(done, last.day);
  const chest = done.length % CHEST_EVERY === 0;
  const points = Math.round(last.steps / 10) + 50 * Math.max(0, streak - 1) + (chest ? 250 : 0);
  return { points, streak, chest };
}

export const badgesOf = (done: Done[]) => WALK_BADGES.filter((b) => done.length >= b.n);
