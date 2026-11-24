import type { Profile } from './types';
import { nowPT } from './time';

/** Step contest window (Vegas days, inclusive). */
export const CONTEST = { start: '2026-11-20', end: '2026-12-03' };
export const CONTEST_LABEL = 'Nov 20 – Dec 3, 2026';
const DAY = 86400000;
const n = (d: string) => Date.parse(d + 'T00:00:00Z');
export const CONTEST_DAYS = (n(CONTEST.end) - n(CONTEST.start)) / DAY + 1;

export interface Trophy { id: 'gold' | 'silver' | 'bronze' | 'none'; icon: string; name: string; min: number }
export const TROPHIES: Trophy[] = [
  { id: 'gold', icon: '🥇', name: 'Gold trophy', min: 20000 },
  { id: 'silver', icon: '🥈', name: 'Silver trophy', min: 15000 },
  { id: 'bronze', icon: '🥉', name: 'Bronze trophy', min: 7000 },
  { id: 'none', icon: '👟', name: 'Warming up', min: 0 },
];
/** Average must be more than the trophy's number. */
export const trophyOf = (avg: number) => TROPHIES.find((t) => t.min === 0 || avg > t.min)!;

/** Average steps a day during the contest, counted from the first day you walked (so late arrivals are not punished). */
export function contestAvg(steps: Record<string, number> = {}, today = nowPT().day) {
  const last = today < CONTEST.end ? today : CONTEST.end;
  const days = Object.keys(steps).filter((d) => d >= CONTEST.start && d <= last && steps[d] > 0).sort();
  if (!days.length || last < CONTEST.start) return { avg: 0, days: 0, total: 0 };
  const total = days.reduce((a, d) => a + steps[d], 0), count = (n(last) - n(days[0])) / DAY + 1;
  return { avg: Math.round(total / count), days: count, total };
}

export const goalsOf = (p: Profile) => ({ day: p.goalDay || 10000, trip: p.goalTrip || 10000 * CONTEST_DAYS });
