import { EP } from './episode';
import type { PlanItem } from './types';
import { placeById } from './data/places';
import { ptToUtc } from './time';

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => '\\' + m);

export function toIcs(items: PlanItem[], name = `Trekking Squad: ${EP.name}`) {
  const now = stamp(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Trekking Squad//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(name)}`, `X-WR-TIMEZONE:${EP.tz}`];
  for (const i of items) {
    const place = placeById(i.place);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${i.id}-${i.day}@vegas-quest`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(ptToUtc(i.day, i.start))}`,
      `DTEND:${stamp(ptToUtc(i.day, Math.max(i.end, i.start + 5)))}`,
      `SUMMARY:${esc(i.title)}`,
      `STATUS:${i.tentative ? 'TENTATIVE' : 'CONFIRMED'}`,
    );
    if (place) lines.push(`LOCATION:${esc(place.name + `, ${EP.city}`)}`, `GEO:${place.lat};${place.lng}`);
    const desc = [i.code, i.note].filter(Boolean).join(' · ');
    if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

function fold(line: string) {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 73) parts.push((i ? ' ' : '') + line.slice(i, i + 73));
  return parts.join('\r\n');
}

export function googleCalLink(i: PlanItem) {
  const p = placeById(i.place);
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: i.title,
    dates: `${stamp(ptToUtc(i.day, i.start))}/${stamp(ptToUtc(i.day, i.end))}`,
    details: [i.code, i.note].filter(Boolean).join(' · '),
    location: p ? p.name + `, ${EP.city}` : '',
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function subscribeLinks(feedUrl: string) {
  const webcal = feedUrl.replace(/^https?:/, 'webcal:');
  return {
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}&name=${encodeURIComponent('Trekking Squad')}`,
    apple: webcal,
  };
}
