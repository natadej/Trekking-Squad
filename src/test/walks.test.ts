import { describe, expect, it } from 'vitest';
import { walkGaps, walkTo } from '../planner';
import { placeById } from '../data/places';
import { streakOf, walkReward } from '../walks';
import type { PlanItem } from '../types';

const item = (id: string, start: number, end: number, place = 'venetian'): PlanItem => ({ id, day: '2026-11-30', start, end, title: id, kind: 'session', place });

describe('walk challenges', () => {
  it('walkTo picks a real spot for 1,000–3,000 steps', () => {
    for (const g of [1000, 2000, 3000]) {
      const w = walkTo(placeById('venetian')!, g)!;
      expect(w.to.id).not.toBe('venetian');
      expect(w.steps).toBeGreaterThan(300);
      expect(w.steps).toBeLessThan(6000);
    }
  });
  it('suggests a walk in a free gap and not in a short one', () => {
    const ws = walkGaps([item('a', 9 * 60, 10 * 60), item('b', 11 * 60, 12 * 60), item('c', 12 * 60 + 10, 21 * 60 + 30)], 'venetian');
    expect(ws.length).toBe(1);
    expect(ws[0].kind).toBe('walk');
    expect(ws[0].start).toBeGreaterThanOrEqual(10 * 60);
    expect(ws[0].end).toBeLessThanOrEqual(11 * 60);
  });
  it('suggests an evening walk after the last item', () => {
    const ws = walkGaps([item('a', 9 * 60, 17 * 60)], 'venetian');
    expect(ws.some((w) => w.start >= 17 * 60)).toBe(true);
  });
  it('rewards points, streaks and a chest every 3 walks', () => {
    const d = [{ id: '1', day: '2026-11-28', steps: 1000 }, { id: '2', day: '2026-11-29', steps: 1000 }];
    expect(streakOf(d, '2026-11-29')).toBe(2);
    expect(walkReward(d)).toEqual({ points: 150, streak: 2, chest: false });
    const r = walkReward([...d, { id: '3', day: '2026-11-30', steps: 2000 }]);
    expect(r.chest).toBe(true);
    expect(r.points).toBe(200 + 100 + 250);
  });
});
