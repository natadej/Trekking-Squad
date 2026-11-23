export const TZ = 'America/Los_Angeles';
export const DAYS_ALL = ['2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function hm(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

export function dayLabel(day: string, long = false) {
  const [y, mo, d] = day.split('-').map(Number);
  const wd = WD[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  return long ? `${wd}, ${MONTHS[mo - 1]} ${d}` : `${wd} ${d}`;
}

export function addDays(day: string, n: number) {
  const [y, mo, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Current Las Vegas date + minutes. */
export function nowPT(date = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}

/** Pacific time → UTC Date. Nov/Dec are PST (UTC-8). */
export function ptToUtc(day: string, min: number) {
  const [y, mo, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 8, 0) + min * 60000);
}
