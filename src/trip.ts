import type { Flight, Trip } from './types';
import { HOTELS } from './data/places';

const AIRLINES: Record<string, string> = {
  AA: 'American', UA: 'United', DL: 'Delta', WN: 'Southwest', AS: 'Alaska', B6: 'JetBlue', NK: 'Spirit', F9: 'Frontier',
  HA: 'Hawaiian', AC: 'Air Canada', WS: 'WestJet', BA: 'British Airways', JL: 'JAL', NH: 'ANA', TG: 'Thai Airways',
  SQ: 'Singapore Airlines', CX: 'Cathay Pacific', KE: 'Korean Air', OZ: 'Asiana', BR: 'EVA Air', CI: 'China Airlines',
  LH: 'Lufthansa', AF: 'Air France', KL: 'KLM', EK: 'Emirates', QR: 'Qatar Airways', AM: 'Aeromexico', G4: 'Allegiant',
  SY: 'Sun Country', VS: 'Virgin Atlantic', EI: 'Aer Lingus', QF: 'Qantas', NZ: 'Air New Zealand', PR: 'Philippine Airlines',
  ZG: 'ZIPAIR', MX: 'Breeze',
};
const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(AIRLINES).map(([c, n]) => [n.toLowerCase(), c]),
);

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

interface Tok { i: number; kind: 'date' | 'time' | 'airport'; v: string | number }

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function tokens(text: string): Tok[] {
  const out: Tok[] = [];
  const add = (re: RegExp, f: (m: RegExpExecArray) => Tok | null) => {
    for (let m = re.exec(text); m; m = re.exec(text)) {
      const t = f(m);
      if (t) out.push(t);
    }
  };
  const yearOf = (y?: string) => (y ? Number(y.length === 2 ? '20' + y : y) : 2026);
  add(/\b(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/g, (m) => {
    if (m[4]) out.push({ i: m.index + 11, kind: 'time', v: Number(m[4]) * 60 + Number(m[5]) });
    return { i: m.index, kind: 'date', v: iso(+m[1], +m[2], +m[3]) };
  });
  add(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?!\d)(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/gi, (m) => {
    const mo = MONTHS[m[1].toLowerCase()];
    return { i: m.index, kind: 'date', v: iso(yearOf(m[3]), mo, +m[2]) };
  });
  add(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?,?\s*(\d{4})?/gi, (m) => {
    const mo = MONTHS[m[2].toLowerCase()];
    return { i: m.index, kind: 'date', v: iso(yearOf(m[3]), mo, +m[1]) };
  });
  add(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g, (m) => ({ i: m.index, kind: 'date', v: iso(yearOf(m[3]), +m[1], +m[2]) }));
  add(/\b(\d{1,2})(?::(\d{2}))?\s?(a\.?m\.?|p\.?m\.?)(?![a-z])/gi, (m) => {
    let h = Number(m[1]) % 12;
    if (m[3].toLowerCase().startsWith('p')) h += 12;
    return { i: m.index, kind: 'time', v: h * 60 + Number(m[2] || 0) };
  });
  add(/(?<![\d:-])([01]?\d|2[0-3]):([0-5]\d)(?!\s?[ap]\.?m)(?![\d:])/gi, (m) => {
    const before = text.slice(Math.max(0, m.index - 11), m.index);
    if (/\d{4}-\d{2}-\d{2}T$/.test(before)) return null;
    return { i: m.index, kind: 'time', v: Number(m[1]) * 60 + Number(m[2]) };
  });
  add(/\(([A-Z]{3})\)|\b([A-Z]{3})\b(?=\s*(?:→|->|–|-|to|\)|\n|$|\s))/g, (m) => {
    const code = m[1] || m[2];
    if (!m[1] && STOP.has(code)) return null;
    return { i: m.index, kind: 'airport', v: code };
  });
  return out.sort((a, b) => a.i - b.i);
}

const STOP = new Set(['THE', 'AND', 'FOR', 'YOU', 'PDT', 'PST', 'EST', 'EDT', 'CST', 'UTC', 'GMT', 'USD', 'THB', 'NOV', 'DEC', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'ARR', 'DEP', 'REF', 'PNR', 'NON', 'AWS']);

function confirmationNear(text: string) {
  const m = /(?:confirmation|record locator|booking (?:ref(?:erence)?|code)|pnr|reservation (?:code|number))\s*(?:number|code|#|no\.?)?\s*[:#]?\s*([A-Z0-9]{5,10})\b/i.exec(text);
  return m?.[1]?.toUpperCase();
}

/** Pull flights out of schema.org JSON-LD (most airline emails embed it). */
function fromJsonLd(text: string): { flights: Flight[]; hotel?: Partial<Trip> } {
  const flights: Flight[] = [];
  let hotel: Partial<Trip> | undefined;
  const blobs = text.match(/\{[\s\S]*?"@type"\s*:\s*"(?:FlightReservation|LodgingReservation)"[\s\S]*?\}\s*\}\s*\}?/g) || [];
  const scripts = [...text.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const raw of [...scripts, ...blobs]) {
    let data: unknown;
    try { data = JSON.parse(raw); } catch { continue; }
    const list = (Array.isArray(data) ? data : [data]) as Record<string, any>[];
    for (const r of list) {
      if (r['@type'] === 'FlightReservation' && r.reservationFor) {
        const f = r.reservationFor;
        const dep = String(f.departureTime || ''), arr = String(f.arrivalTime || '');
        const code = f.airline?.iataCode || '';
        flights.push({
          airline: AIRLINES[code] || f.airline?.name || code,
          number: `${code}${f.flightNumber || ''}`,
          from: f.departureAirport?.iataCode || '',
          to: f.arrivalAirport?.iataCode || '',
          depDate: dep.slice(0, 10), depTime: Number(dep.slice(11, 13)) * 60 + Number(dep.slice(14, 16)),
          arrDate: arr.slice(0, 10), arrTime: Number(arr.slice(11, 13)) * 60 + Number(arr.slice(14, 16)),
          confirmation: r.reservationNumber,
        });
      }
      if (r['@type'] === 'LodgingReservation' && r.reservationFor) {
        const h = matchHotel(String(r.reservationFor.name || ''));
        hotel = { hotelId: h, hotelIn: String(r.checkinTime || r.checkinDate || '').slice(0, 10), hotelOut: String(r.checkoutTime || r.checkoutDate || '').slice(0, 10), hotelConfirmation: r.reservationNumber };
      }
    }
  }
  return { flights, hotel };
}

const HOTEL_ALIASES: [RegExp, string][] = [
  [/venetian/i, 'venetian'], [/palazzo/i, 'palazzo'], [/\bencore\b/i, 'encore'], [/\bwynn\b/i, 'wynn'],
  [/caesars\s+palace/i, 'caesars'], [/bellagio/i, 'bellagio'], [/\baria\b/i, 'aria'], [/cosmopolitan|\bcosmo\b/i, 'cosmo'],
  [/mgm\s+grand/i, 'mgm'], [/mandalay/i, 'mandalay'], [/\bparis\b/i, 'paris'], [/fontainebleau/i, 'fontainebleau'],
  [/resorts\s+world/i, 'resortsworld'], [/\bluxor\b/i, 'luxor'], [/new\s+york[\s-]+new\s+york|\bnyny\b/i, 'nyny'],
];

export function matchHotel(text: string) {
  return HOTEL_ALIASES.find(([re]) => re.test(text))?.[1];
}

export interface Parsed {
  flights: Flight[];
  hotelId?: string;
  hotelIn?: string;
  hotelOut?: string;
  hotelConfirmation?: string;
}

export function parseBooking(raw: string): Parsed {
  const text = raw.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const ld = fromJsonLd(text);
  const plain = text.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ');
  const out: Parsed = { flights: ld.flights, ...ld.hotel };

  if (!out.flights.length) {
    const re = /\b(?:([A-Z][A-Z0-9])\s?(\d{1,4})|(american|united|delta|southwest|alaska|jetblue|spirit|frontier|hawaiian|air canada|westjet|british airways|thai airways|singapore airlines|cathay pacific|korean air|asiana|eva air|china airlines|lufthansa|air france|klm|emirates|qatar airways|allegiant|japan airlines|jal|ana|zipair)(?: airlines?)?\s+(?:flight\s*)?#?\s?(\d{1,4}))\b/gi;
    const seen = new Set<string>();
    const hits: { i: number; code: string; num: string }[] = [];
    for (let m = re.exec(plain); m; m = re.exec(plain)) {
      let code = m[1]?.toUpperCase();
      let num = m[2];
      if (!code) {
        const n = m[3].toLowerCase().replace(/ airlines?$/, '');
        code = NAME_TO_CODE[n] || (n === 'japan airlines' || n === 'jal' ? 'JL' : n === 'ana' ? 'NH' : n.slice(0, 2).toUpperCase());
        num = m[4];
      } else if (!AIRLINES[code]) continue;
      const key = code + num;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ i: m.index, code, num });
    }
    const toks = tokens(plain);
    const conf = confirmationNear(plain);
    let lastDate: string | undefined;
    for (let h = 0; h < hits.length; h++) {
      const start = hits[h].i;
      const end = hits[h + 1]?.i ?? plain.length;
      const prevDates = toks.filter((t) => t.kind === 'date' && t.i < start);
      if (prevDates.length) lastDate = prevDates[prevDates.length - 1].v as string;
      const win = toks.filter((t) => t.i >= start - 160 && t.i < Math.min(end, start + 700));
      const after = win.filter((t) => t.i >= start);
      const afterAirports = [...new Set(after.filter((t) => t.kind === 'airport').map((t) => t.v as string))];
      const airports = afterAirports.length >= 2 ? afterAirports : [...new Set(win.filter((t) => t.kind === 'airport').map((t) => t.v as string))];
      const timeToks = after.filter((t) => t.kind === 'time');
      const times = timeToks.map((t) => t.v as number);
      const lastTimeI = timeToks[1]?.i ?? timeToks[0]?.i ?? end;
      const dates = after.filter((t) => t.kind === 'date' && t.i <= lastTimeI).map((t) => t.v as string);
      if (!airports.length && !times.length) continue;
      const depTime = times[0] ?? 0;
      const arrTime = times[1] ?? times[0] ?? 0;
      const dep = (timeToks[0] && after.find((t) => t.kind === 'date' && t.i < timeToks[0].i)?.v as string) || lastDate || dates[0] || '';
      let arrDate = dates.find((d) => d > dep) || dep;
      if (arrDate === dep && arrTime < depTime && dep) {
        const d = new Date(dep + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() + 1);
        arrDate = d.toISOString().slice(0, 10);
      }
      out.flights.push({
        airline: AIRLINES[hits[h].code] || hits[h].code,
        number: hits[h].code + hits[h].num,
        from: airports[0] || '',
        to: airports[1] || '',
        depDate: dep, depTime, arrDate, arrTime, confirmation: conf,
      });
    }
  }

  if (!out.hotelId) {
    const id = matchHotel(plain);
    if (id && /hotel|resort|check[\s-]?in|reservation|room|stay|night/i.test(plain)) {
      out.hotelId = id;
      const ci = /check[\s-]?in[^\n]{0,40}/i.exec(plain);
      const co = /check[\s-]?out[^\n]{0,40}/i.exec(plain);
      const firstDate = (s?: string) => (s ? tokens(s).find((t) => t.kind === 'date')?.v as string | undefined : undefined);
      out.hotelIn = firstDate(ci?.[0]);
      out.hotelOut = firstDate(co?.[0]);
      if (!out.hotelIn || !out.hotelOut) {
        const ds = tokens(plain).filter((t) => t.kind === 'date').map((t) => t.v as string);
        out.hotelIn ||= ds[0];
        out.hotelOut ||= ds.find((d) => d > (out.hotelIn || '')) || ds[1];
      }
      if (!out.flights.length) out.hotelConfirmation = confirmationNear(plain);
    }
  }
  return out;
}

/** Which parsed flight goes to Vegas and which comes home. */
export function splitFlights(flights: Flight[]): { arrive?: Flight; depart?: Flight } {
  const arrive = flights.find((f) => f.to === 'LAS') || flights.filter((f) => f.from !== 'LAS')[0];
  const depart = [...flights].reverse().find((f) => f.from === 'LAS' && f !== arrive);
  return { arrive: arrive && arrive.to === 'LAS' ? arrive : arrive?.to ? undefined : arrive, depart };
}

export const hotelName = (id?: string) => HOTELS.find((h) => h.id === id)?.name;
