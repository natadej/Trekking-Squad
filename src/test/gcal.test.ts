import { describe, expect, it } from 'vitest';
import { eventToItem } from '../gcal';
import { toIcs } from '../ics';

describe('google calendar', () => {
  it('turns a timed event into a Las Vegas plan item', () => {
    const i = eventToItem({ id: 'abc', summary: 'Dinner at Delmonico', location: 'Venetian', status: 'tentative', start: { dateTime: '2026-12-02T03:00:00Z' }, end: { dateTime: '2026-12-02T04:30:00Z' } });
    expect(i).toMatchObject({ id: 'g-abc', day: '2026-12-01', start: 19 * 60, end: 20 * 60 + 30, kind: 'custom', tentative: true });
  });
  it('skips all-day and cancelled events', () => {
    expect(eventToItem({ id: 'a', start: { date: '2026-12-01' } })).toBeNull();
    expect(eventToItem({ id: 'b', status: 'cancelled', start: { dateTime: '2026-12-02T03:00:00Z' } })).toBeNull();
  });
  it('writes Maybe items as tentative in the calendar file', () => {
    const ics = toIcs([{ id: 'x', day: '2026-12-01', start: 600, end: 660, title: 'Maybe class', kind: 'session', tentative: true }, { id: 'y', day: '2026-12-01', start: 700, end: 760, title: 'Sure class', kind: 'session' }]);
    expect(ics).toContain('STATUS:TENTATIVE');
    expect(ics).toContain('STATUS:CONFIRMED');
  });
});
