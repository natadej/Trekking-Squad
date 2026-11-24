import { describe, expect, it } from 'vitest';
import { contestAvg, trophyOf } from '../trophy';

describe('trophies', () => {
  it('uses "more than" thresholds', () => {
    expect(trophyOf(20001).id).toBe('gold');
    expect(trophyOf(20000).id).toBe('silver');
    expect(trophyOf(15001).id).toBe('silver');
    expect(trophyOf(7001).id).toBe('bronze');
    expect(trophyOf(7000).id).toBe('none');
  });
  it('averages from the first walking day to today, inside the contest', () => {
    const s = { '2026-11-19': 99999, '2026-11-28': 30000, '2026-11-30': 15000 };
    expect(contestAvg(s, '2026-11-30')).toEqual({ avg: 15000, days: 3, total: 45000 });
    expect(contestAvg(s, '2026-12-10').days).toBe(6);
    expect(contestAvg({}, '2026-11-30').avg).toBe(0);
  });
});
