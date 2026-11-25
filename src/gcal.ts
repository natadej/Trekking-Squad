import { EP } from './episode';
import type { Flight, PlanItem, Trip } from './types';
import { GOOGLE_ID, loadGsi } from './cloud';
import { nowPT, ptToUtc } from './time';
import { placeById } from './data/places';
import { parseBooking, splitFlights } from './trip';

// Two-way sync with the user's Google Calendar. Gmail already turns flight, hotel, restaurant and
// show confirmations into calendar events, so reading the calendar brings those bookings in.
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
export const GCAL_PREFIX = 'g-';

export interface GEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
}

export const calendarReady = () => !!GOOGLE_ID;

let tok: { t: string; exp: number } | undefined;
function token(): Promise<string> {
  if (tok && tok.exp > Date.now() + 60000) return Promise.resolve(tok.t);
  return loadGsi().then((g) => new Promise<string>((ok, no) => {
    g.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_ID!, scope: SCOPE,
      callback: (r) => {
        if (!r.access_token) return no(new Error(r.error_description || 'Calendar access was not allowed'));
        tok = { t: r.access_token, exp: Date.now() + Number(r.expires_in ?? 3600) * 1000 };
        ok(r.access_token);
      },
      error_callback: (e) => no(new Error(e.type === 'popup_closed' ? 'Google window was closed' : e.message || 'Calendar access was not allowed')),
    }).requestAccessToken({ prompt: '' });
  }));
}

async function api<T>(path = '', init: RequestInit = {}): Promise<T> {
  const t = await token();
  const r = await fetch(API + path, { ...init, headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' } });
  if (r.status === 401) tok = undefined;
  if (!r.ok) {
    const e = (await r.json().catch(() => null)) as { error?: { message?: string; errors?: { reason?: string }[] } } | null;
    const why = e?.error?.errors?.[0]?.reason;
    throw new Error(why === 'accessNotConfigured' ? 'Google Calendar is not switched on for this app yet' : e?.error?.message || `Google Calendar error (${r.status})`);
  }
  return (r.status === 204 ? null : r.json()) as T;
}

/** A timed Google event as a plan item (Las Vegas time). All-day events are skipped. */
export function eventToItem(e: GEvent): PlanItem | null {
  if (!e.start?.dateTime || e.status === 'cancelled') return null;
  const s = nowPT(new Date(e.start.dateTime)), en = nowPT(new Date(e.end?.dateTime ?? e.start.dateTime));
  const end = en.day > s.day ? 24 * 60 : Math.max(en.min, s.min + 15);
  return {
    id: GCAL_PREFIX + e.id, day: s.day, start: s.min, end, title: e.summary?.trim() || 'Busy', kind: 'custom',
    note: [e.location, 'from Google Calendar'].filter(Boolean).join(' · '), tentative: e.status === 'tentative' || undefined,
  };
}

/** Flights and hotel found in calendar events (the ones Gmail creates from booking emails). */
export function bookingsFrom(events: GEvent[]): Partial<Trip> {
  const flights: Flight[] = [];
  const out: Partial<Trip> = {};
  for (const e of events) {
    const r = parseBooking([e.summary, e.location, e.description].filter(Boolean).join('\n'));
    flights.push(...r.flights);
    if (r.hotelId && !out.hotelId) Object.assign(out, { hotelId: r.hotelId, hotelIn: r.hotelIn ?? e.start?.date, hotelOut: r.hotelOut ?? e.end?.date, hotelConfirmation: r.hotelConfirmation });
  }
  return { ...splitFlights(flights), ...out };
}

const same = (a?: string, b?: string) => !!a && !!b && Date.parse(a) === Date.parse(b);

function body(i: PlanItem) {
  const place = placeById(i.place);
  return {
    summary: i.title,
    location: place ? place.name + `, ${EP.city}` : undefined,
    description: [i.code, i.note, 'Planned with Trekking Squad'].filter(Boolean).join(' · '),
    start: { dateTime: ptToUtc(i.day, i.start).toISOString() },
    end: { dateTime: ptToUtc(i.day, Math.max(i.end, i.start + 5)).toISOString() },
    status: i.tentative ? 'tentative' : 'confirmed',
    extendedProperties: { private: { tsq: i.id } },
  };
}

/** Read the trip window from Google Calendar and write the plan back (Maybe = tentative). */
export async function syncCalendar(plan: PlanItem[], days: string[]) {
  const q = new URLSearchParams({ timeMin: ptToUtc(days[0], 0).toISOString(), timeMax: ptToUtc(days[days.length - 1], 24 * 60).toISOString(), singleEvents: 'true', maxResults: '2500' });
  const events = (await api<{ items?: GEvent[] }>('?' + q)).items ?? [];
  const mine = new Map(events.filter((e) => e.extendedProperties?.private?.tsq).map((e) => [e.extendedProperties!.private!.tsq, e]));
  const theirs = events.filter((e) => !e.extendedProperties?.private?.tsq && e.status !== 'cancelled');
  const imported = theirs.map(eventToItem).filter((i): i is PlanItem => !!i);
  // don't copy our flight/hotel items next to the ones Gmail already put in the calendar
  const dup = (i: PlanItem) => ['flight', 'hotel'].includes(i.kind) && imported.some((g) => g.day === i.day && Math.abs(g.start - i.start) <= 15);
  const push = plan.filter((i) => !i.id.startsWith(GCAL_PREFIX) && !dup(i));

  const jobs: (() => Promise<unknown>)[] = [];
  for (const i of push) {
    const b = body(i), old = mine.get(i.id);
    mine.delete(i.id);
    if (!old) jobs.push(() => api('', { method: 'POST', body: JSON.stringify(b) }));
    else if (old.summary !== b.summary || old.status !== b.status || !same(old.start?.dateTime, b.start.dateTime) || !same(old.end?.dateTime, b.end.dateTime))
      jobs.push(() => api('/' + old.id, { method: 'PATCH', body: JSON.stringify(b) }));
  }
  for (const old of mine.values()) jobs.push(() => api('/' + old.id, { method: 'DELETE' }));
  for (let k = 0; k < jobs.length; k += 4) await Promise.all(jobs.slice(k, k + 4).map((j) => j()));

  return { imported, trip: bookingsFrom(theirs), changed: jobs.length };
}
