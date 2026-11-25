import { describe, expect, it } from 'vitest';
import { periodLabel, periodRange, stepsIn } from './periods';

describe('periods', () => {
  it('finds ranges', () => {
    expect(periodRange('day', '2026-11-25')).toEqual(['2026-11-25', '2026-11-25']);
    expect(periodRange('week', '2026-11-25')).toEqual(['2026-11-23', '2026-11-29']);
    expect(periodRange('week', '2026-11-29')).toEqual(['2026-11-23', '2026-11-29']);
    expect(periodRange('week', '2026-12-31')).toEqual(['2026-12-28', '2027-01-03']);
    expect(periodRange('month', '2026-02-10')).toEqual(['2026-02-01', '2026-02-28']);
    expect(periodRange('quarter', '2026-11-25')).toEqual(['2026-10-01', '2026-12-31']);
    expect(periodRange('year', '2026-11-25')).toEqual(['2026-01-01', '2026-12-31']);
  });
  it('sums steps in range', () => {
    const s = { '2026-11-22': 100, '2026-11-23': 200, '2026-11-29': 300, '2026-11-30': 400 };
    expect(stepsIn(s, periodRange('week', '2026-11-25'))).toBe(500);
    expect(stepsIn(s, periodRange('month', '2026-11-25'))).toBe(1000);
    expect(stepsIn(undefined, ['2026-01-01', '2026-12-31'])).toBe(0);
  });
  it('labels', () => {
    expect(periodLabel('quarter', periodRange('quarter', '2026-11-25'))).toBe('Q4 2026');
    expect(periodLabel('week', periodRange('week', '2026-11-25'))).toBe('Nov 23 – Nov 29');
  });
});
