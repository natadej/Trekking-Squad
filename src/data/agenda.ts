/** Fixed re:Invent 2026 schedule from the official agenda page (Pacific Time). */
export interface FixedEvent {
  id: string;
  day: string; // YYYY-MM-DD
  start: number; // minutes after midnight PT
  end: number;
  title: string;
  place: string; // place id
  kind: 'badge' | 'keynote' | 'party' | 'expo' | 'social' | 'fun';
  note?: string;
  optional?: boolean;
}

const t = (h: number, m = 0) => h * 60 + m;

export const EVENT_DAYS = ['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04'];

export const FIXED_EVENTS: FixedEvent[] = [
  { id: 'kickoff', day: '2026-11-29', start: t(10), end: t(18), title: 'Sunday kickoff: badge, SWAG & fun', place: 'forum', kind: 'social', note: 'Caesars Forum and The Venetian', optional: true },
  { id: 'hackathon', day: '2026-11-29', start: t(12), end: t(17), title: 'Road to re:Invent hackathon + /builder/quest card', place: 'forum', kind: 'fun', optional: true },
  { id: 'devkey', day: '2026-11-30', start: t(19, 30), end: t(20, 45), title: 'Developer Keynote', place: 'venetian', kind: 'keynote' },
  { id: 'welcome', day: '2026-11-30', start: t(16), end: t(19), title: 'Expo welcome reception', place: 'venetian', kind: 'expo', optional: true },
  { id: 'ceokey', day: '2026-12-01', start: t(8, 30), end: t(10, 30), title: 'CEO Keynote with Matt Garman', place: 'venetian', kind: 'keynote' },
  { id: 'recep1', day: '2026-12-01', start: t(18), end: t(20), title: 'Networking reception', place: 'caesars', kind: 'social', note: 'Caesars Palace and The Venetian', optional: true },
  { id: 'datakey', day: '2026-12-02', start: t(8, 30), end: t(10), title: 'Data & AI Keynote', place: 'venetian', kind: 'keynote' },
  { id: 'run5k', day: '2026-12-02', start: t(6), end: t(7, 30), title: 're:Invent 5K Run', place: 'allegiant', kind: 'fun', optional: true },
  { id: 'partnerkey', day: '2026-12-02', start: t(15), end: t(16), title: 'Partner Keynote', place: 'venetian', kind: 'keynote', optional: true },
  { id: 'happyhour', day: '2026-12-02', start: t(16, 30), end: t(18), title: 'Happy hour in the Expo', place: 'venetian', kind: 'expo', optional: true },
  { id: 'techkey', day: '2026-12-03', start: t(8, 30), end: t(10), title: 'Technical Innovations Keynote', place: 'venetian', kind: 'keynote' },
  { id: 'replay', day: '2026-12-03', start: t(18, 30), end: t(22, 30), title: 're:Play party!', place: 'allegiant', kind: 'party', note: 'Shuttles 6:15–11 PM' },
];

/** Badge pickup hours (official). */
export const BADGE = [
  { day: '2026-11-29', place: 'airport', start: t(7), end: t(23, 59) },
  { day: '2026-11-29', place: 'venetian', start: t(10), end: t(20) },
  { day: '2026-11-29', place: 'mgm', start: t(10), end: t(20) },
  { day: '2026-11-30', place: 'airport', start: t(7), end: t(23, 59) },
  { day: '2026-11-30', place: 'venetian', start: t(6, 30), end: t(17, 30) },
  { day: '2026-11-30', place: 'mgm', start: t(6, 30), end: t(21) },
];

/** Session hours per day (official). */
export const SESSION_HOURS: Record<string, [number, number]> = {
  '2026-11-30': [t(8), t(17, 30)],
  '2026-12-01': [t(11, 30), t(17, 30)],
  '2026-12-02': [t(8), t(17, 30)],
  '2026-12-03': [t(8), t(17, 30)],
  '2026-12-04': [t(8), t(12, 30)],
};
