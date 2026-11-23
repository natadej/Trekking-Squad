import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPlan, travelMin } from '../planner';
import { newProfile } from '../profile';
import { toIcs } from '../ics';
import type { Session } from '../types';

const sessions: Session[] = JSON.parse(readFileSync('public/data/sessions.json', 'utf8'));

describe('planner', () => {
  const p = newProfile();
  p.prefs.interests = ['ai', 'security'];
  p.trip = {
    hotelId: 'bellagio', pickup: 'uber',
    arrive: { airline: 'United', number: 'UA1', from: 'SFO', to: 'LAS', depDate: '2026-11-28', depTime: 780, arrDate: '2026-11-28', arrTime: 880 },
    depart: { airline: 'United', number: 'UA2', from: 'LAS', to: 'SFO', depDate: '2026-12-03', depTime: 1395, arrDate: '2026-12-03', arrTime: 1490 },
  };
  const plan = buildPlan(p, sessions);

  it('never double-books and leaves travel time between places', () => {
    const byDay = new Map<string, typeof plan>();
    for (const i of plan) byDay.set(i.day, [...(byDay.get(i.day) || []), i]);
    for (const items of byDay.values()) {
      const s = [...items].sort((a, b) => a.start - b.start);
      for (let k = 1; k < s.length; k++) {
        const gap = s[k].start - s[k - 1].end;
        if (s[k - 1].kind === 'flight' || s[k].kind === 'flight' || s[k].kind === 'ride' || s[k - 1].kind === 'ride') continue;
        expect(gap, `${s[k - 1].title} → ${s[k].title}`).toBeGreaterThanOrEqual(s[k - 1].place && s[k].place && s[k - 1].place !== s[k].place ? travelMin(s[k - 1].place, s[k].place) : 0);
      }
    }
  });

  it('includes arrival, badge, keynotes, sessions, meals, re:Play and the flight home', () => {
    const ids = plan.map((i) => i.id);
    expect(ids).toContain('arrive');
    expect(ids).toContain('badge');
    expect(ids).toContain('ceokey');
    expect(ids).toContain('replay');
    expect(ids).toContain('depart');
    expect(plan.filter((i) => i.kind === 'session').length).toBeGreaterThan(8);
    expect(plan.some((i) => i.id === 'dinner-2026-11-28')).toBe(true);
  });

  it('writes a valid calendar file', () => {
    const ics = toIcs(plan);
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)!.length).toBe(plan.length);
    expect(ics).toContain('DTSTART:20261201T163000Z'); // CEO keynote 8:30 AM PST
  });
});
