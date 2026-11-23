import type { PlanItem, Prefs, Profile, Session, Trip } from './types';
import { BADGE, FIXED_EVENTS, SESSION_HOURS } from './data/agenda';
import { HANDS_ON, INTERESTS, TALKS } from './data/interests';
import { distanceM, placeById, VENUE_PLACE } from './data/places';
import { addDays, hm } from './time';

export const DEFAULT_ARRIVE = '2026-11-28';
export const DEFAULT_DEPART = '2026-12-03';

/** Minutes to get between two places (AWS advises 30–45 min between venues). */
export function travelMin(a?: string, b?: string) {
  if (!a || !b || a === b) return a && b ? 10 : 0;
  const pa = placeById(a), pb = placeById(b);
  if (!pa || !pb) return 30;
  if (pa.id === 'airport' || pb.id === 'airport') return 30;
  const d = distanceM(pa, pb);
  return d < 700 ? 20 : d < 1600 ? 30 : 45;
}

export function scoreSession(s: Session, prefs: Prefs, hotel?: string) {
  let sc = 0;
  for (const id of prefs.interests) {
    const it = INTERESTS.find((i) => i.id === id);
    if (!it) continue;
    sc += s.tp.filter((t) => it.topics.includes(t)).length * 3;
    sc += s.a.filter((a) => it.areas.includes(a)).length * 2;
    if (it.industries) sc += s.ind.filter((x) => it.industries!.includes(x)).length * 3;
    if (it.words?.test(s.t)) sc += 3;
    if (it.types?.includes(s.y)) sc += 4;
  }
  if (sc === 0) return 0;
  if (prefs.style === 'hands' && HANDS_ON.has(s.y)) sc += 3;
  if (prefs.style === 'talks' && TALKS.has(s.y)) sc += 3;
  if (s.l) sc += Math.max(0, 2 - Math.abs(s.l - prefs.level) / 100);
  if (hotel && VENUE_PLACE[s.v] === hotel) sc += 1;
  if (/-R\d*$/.test(s.c)) sc -= 0.2;
  if (/sponsored by/i.test(s.t)) sc -= 2;
  if (['Event service', 'Expo', 'Keynote'].includes(s.y)) return 0;
  return sc;
}

const baseCode = (c: string) => c.replace(/-R\d*$/, '');

export function tripDays(trip: Trip) {
  const first = trip.arrive?.arrDate || trip.hotelIn || DEFAULT_ARRIVE;
  const last = trip.depart?.depDate || trip.hotelOut || DEFAULT_DEPART;
  const days: string[] = [];
  for (let d = first; d <= last && days.length < 14; d = addDays(d, 1)) days.push(d);
  return days;
}

interface Ctx {
  items: PlanItem[];
}

function fits(ctx: Ctx, day: string, start: number, end: number, place?: string) {
  for (const it of ctx.items) {
    if (it.day !== day) continue;
    const gapBefore = travelMin(it.place, place);
    const gapAfter = travelMin(place, it.place);
    if (start < it.end + (it.end <= start ? gapBefore : 0) && end + (it.start >= end ? gapAfter : 0) > it.start) return false;
  }
  return true;
}

function add(ctx: Ctx, it: PlanItem) {
  ctx.items.push(it);
}

/** Build an hour-by-hour plan for the whole trip. */
export function buildPlan(p: Profile, sessions: Session[]): PlanItem[] {
  const ctx: Ctx = { items: [] };
  const { trip, prefs } = p;
  const hotel = trip.hotelId || 'venetian';
  const days = tripDays(trip);
  const first = days[0], last = days[days.length - 1];
  const removed = new Set(p.removed);
  let badgeDone = false;

  // Arrival
  const arr = trip.arrive;
  if (arr) {
    add(ctx, { id: 'arrive', day: arr.arrDate, start: arr.arrTime, end: arr.arrTime + 5, title: `Land in Vegas! ${arr.airline} ${arr.number}`, kind: 'flight', place: 'airport', note: `${arr.from} → LAS` });
    let t = arr.arrTime + 30;
    add(ctx, { id: 'bags', day: arr.arrDate, start: arr.arrTime + 5, end: t, title: 'Grab your bags', kind: 'free', place: 'airport' });
    const desk = BADGE.find((b) => b.day === arr.arrDate && b.place === 'airport' && t >= b.start && t + 20 <= b.end);
    if (desk) {
      add(ctx, { id: 'badge', day: arr.arrDate, start: t, end: t + 20, title: 'Pick up your re:Invent badge (T1/T3)', kind: 'badge', place: 'airport', note: 'Bring a government ID' });
      t += 20;
      badgeDone = true;
    }
    const ride = trip.pickup || 'uber';
    const rideTitle = { uber: 'Uber/Lyft to your hotel', friend: 'Your ride picks you up', shuttle: 'Hotel shuttle', taxi: 'Taxi to your hotel' }[ride];
    add(ctx, { id: 'ride-in', day: arr.arrDate, start: t, end: t + 25, title: rideTitle, kind: 'ride', place: 'airport', note: placeById(hotel)?.name });
    t += 25;
    add(ctx, { id: 'checkin', day: arr.arrDate, start: t, end: t + 20, title: t < 15 * 60 ? 'Drop bags at hotel (room ready ~3 PM)' : 'Check in to your room', kind: 'hotel', place: hotel });
    if (trip.arrivalDinner !== false && t + 20 < 21 * 60) {
      const ds = Math.max(t + 45, 18 * 60);
      add(ctx, { id: 'dinner-' + arr.arrDate, day: arr.arrDate, start: ds, end: ds + 75, title: dinnerTitle(hotel), kind: 'meal', place: hotel });
    }
  }

  // Departure
  const dep = trip.depart;
  if (dep) {
    const leave = dep.depTime - 150;
    add(ctx, { id: 'checkout', day: dep.depDate, start: Math.min(leave - 30, 11 * 60), end: Math.min(leave - 15, 11 * 60 + 15), title: 'Check out (pack your swag!)', kind: 'hotel', place: hotel });
    add(ctx, { id: 'ride-out', day: dep.depDate, start: leave, end: leave + 30, title: trip.dropoff === 'friend' ? 'Ride to the airport' : 'Uber/Lyft to the airport', kind: 'ride', place: hotel });
    add(ctx, { id: 'depart', day: dep.depDate, start: dep.depTime - 120, end: dep.depTime, title: `Fly home: ${dep.airline} ${dep.number}`, kind: 'flight', place: 'airport', note: `Be at the gate 30 min early · LAS → ${dep.to}` });
  }

  const usable = (day: string) => {
    const lo = arr && day === arr.arrDate ? arr.arrTime + 120 : 0;
    const hi = dep && day === dep.depDate ? dep.depTime - 180 : 24 * 60;
    return [lo, hi] as const;
  };

  for (const day of days) {
    const [lo, hi] = usable(day);
    const onTrip = !(day === first && arr) && !(day === last && dep && dep.depTime < 12 * 60);
    if (onTrip && lo < 7 * 60 + 45 && hi > 8 * 60) add(ctx, { id: 'breakfast-' + day, day, start: 7 * 60, end: 7 * 60 + 40, title: 'Breakfast', kind: 'meal', place: hotel });

    // Fixed events (keynotes, parties)
    for (const ev of FIXED_EVENTS.filter((e) => e.day === day)) {
      if (removed.has(ev.id)) continue;
      if (ev.start < lo || ev.start + 60 > hi) continue;
      const cut = ev.end > hi;
      if (ev.optional && !(prefs.parties || ev.kind === 'keynote')) continue;
      if (ev.kind === 'fun' && ev.id === 'run5k' && !prefs.parties) continue;
      const end = cut ? hi - 15 : ev.end;
      if (!fits(ctx, day, ev.start, end, ev.place)) continue;
      add(ctx, { id: ev.id, day, start: ev.start, end, title: ev.title, kind: ev.kind === 'keynote' ? 'keynote' : 'event', place: ev.place, note: cut ? 'Leave early so you catch your flight!' : ev.note });
    }

    // Badge pickup if not done at the airport
    if (!badgeDone) {
      for (const b of BADGE.filter((x) => x.day === day && x.place !== 'airport')) {
        const s = Math.max(b.start, lo, day === '2026-11-29' ? 10 * 60 : 7 * 60 + 45);
        const place = travelMin(hotel, 'mgm') < travelMin(hotel, 'venetian') ? 'mgm' : 'venetian';
        if (b.place !== place) continue;
        for (let t = s; t + 20 <= Math.min(b.end, hi); t += 15) {
          if (fits(ctx, day, t, t + 20, place)) {
            add(ctx, { id: 'badge', day, start: t, end: t + 20, title: 'Pick up your re:Invent badge', kind: 'badge', place, note: 'Bring a government ID' });
            badgeDone = true;
            break;
          }
        }
        if (badgeDone) break;
      }
    }

    // Lunch: 45 min somewhere between 11:30 and 1:30
    if (lo < 12 * 60 && hi > 13 * 60) {
      for (const s of [12 * 60, 11 * 60 + 30, 12 * 60 + 30, 13 * 60]) {
        if (fits(ctx, day, s, s + 45)) {
          add(ctx, { id: 'lunch-' + day, day, start: s, end: s + 45, title: 'Lunch break', kind: 'meal' });
          break;
        }
      }
    }

    // Sessions
    const hours = SESSION_HOURS[day];
    if (hours) {
      const picked = new Set(ctx.items.filter((i) => i.code).map((i) => baseCode(i.code!)));
      const max = prefs.pace === 'busy' ? 6 : 4;
      let count = 0;
      // user-picked sessions first
      for (const s of sessions.filter((x) => x.d === day && p.added.includes(x.c))) {
        const place = VENUE_PLACE[s.v];
        add(ctx, { id: 's-' + s.c, day, start: s.s, end: s.e, title: s.t, kind: 'session', place, code: s.c, note: `${s.y} · ${s.r}` });
        picked.add(baseCode(s.c));
        count++;
      }
      const cands = sessions
        .filter((s) => s.d === day && s.s >= Math.max(hours[0], lo) && s.e <= Math.min(hours[1], hi) && !removed.has(s.c))
        .map((s) => ({ s, sc: scoreSession(s, prefs, hotel) }))
        .filter((x) => x.sc > 0)
        .sort((a, b) => b.sc - a.sc || a.s.s - b.s.s);
      for (const { s } of cands) {
        if (count >= max) break;
        if (picked.has(baseCode(s.c))) continue;
        const place = VENUE_PLACE[s.v];
        if (!fits(ctx, day, s.s, s.e, place)) continue;
        add(ctx, { id: 's-' + s.c, day, start: s.s, end: s.e, title: s.t, kind: 'session', place, code: s.c, note: `${s.y} · ${s.r}` });
        picked.add(baseCode(s.c));
        count++;
      }
    }

    // Me-time
    if (p.trip.meTime !== false && hi > 17 * 60 + 30 && lo < 16 * 60) {
      for (const s of [17 * 60 + 30, 16 * 60 + 30, 14 * 60]) {
        if (fits(ctx, day, s, s + 60, hotel)) {
          add(ctx, { id: 'me-' + day, day, start: s, end: s + 60, title: 'Me-time: rest, call home, recharge', kind: 'free', place: hotel });
          break;
        }
      }
    }

    // Dinner
    if (!ctx.items.some((i) => i.day === day && i.kind === 'meal' && i.start >= 17 * 60) && hi > 19 * 60 + 30 && lo < 19 * 60) {
      for (const s of [18 * 60 + 30, 19 * 60, 18 * 60, 20 * 60 + 45, 21 * 60]) {
        if (fits(ctx, day, s, s + 75, hotel)) {
          add(ctx, { id: 'dinner-' + day, day, start: s, end: s + 75, title: dinnerTitle(hotel), kind: 'meal', place: hotel });
          break;
        }
      }
    }
  }

  for (const c of p.custom) ctx.items.push(c);
  return ctx.items.filter((i) => !removed.has(i.id)).sort((a, b) => (a.day + pad(a.start)).localeCompare(b.day + pad(b.start)));
}

const pad = (n: number) => String(Math.max(0, n)).padStart(5, '0');

function dinnerTitle(hotel: string) {
  const eat = placeById(hotel)?.eats?.[0];
  return eat ? `Dinner: try ${eat.name} (${eat.food})` : 'Dinner';
}

/** Items that need the traveller's attention, shown as yes/no helper cards. */
export function travelBetween(items: PlanItem[]) {
  const out: { after: PlanItem; before: PlanItem; min: number }[] = [];
  for (let i = 1; i < items.length; i++) {
    const a = items[i - 1], b = items[i];
    if (a.day !== b.day || !a.place || !b.place || a.place === b.place) continue;
    out.push({ after: a, before: b, min: travelMin(a.place, b.place) });
  }
  return out;
}

export const describe = (i: PlanItem) => `${hm(i.start)}–${hm(i.end)} ${i.title}`;
