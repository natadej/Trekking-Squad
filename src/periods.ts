export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year';

export const PERIODS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** First and last day (YYYY-MM-DD, inclusive) of the period containing `day`. Weeks start on Monday. */
export function periodRange(period: Period, day: string): [string, string] {
  const [y, m, d] = day.split('-').map(Number);
  const at = (yy: number, mm: number, dd: number) => iso(new Date(Date.UTC(yy, mm, dd)));
  switch (period) {
    case 'day': return [day, day];
    case 'week': {
      const back = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
      return [at(y, m - 1, d - back), at(y, m - 1, d - back + 6)];
    }
    case 'month': return [at(y, m - 1, 1), at(y, m, 0)];
    case 'quarter': { const q = Math.floor((m - 1) / 3) * 3; return [at(y, q, 1), at(y, q + 3, 0)]; }
    case 'year': return [`${y}-01-01`, `${y}-12-31`];
  }
}

export function stepsIn(steps: Record<string, number> | undefined, [from, to]: [string, string]) {
  let n = 0;
  for (const [k, v] of Object.entries(steps ?? {})) if (k >= from && k <= to && Number.isFinite(v)) n += v;
  return n;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (s: string) => `${MON[Number(s.slice(5, 7)) - 1]} ${Number(s.slice(8))}`;

export function periodLabel(period: Period, [from, to]: [string, string]) {
  const y = from.slice(0, 4);
  if (period === 'day') return short(from);
  if (period === 'week') return `${short(from)} – ${short(to)}`;
  if (period === 'month') return `${MON[Number(from.slice(5, 7)) - 1]} ${y}`;
  if (period === 'quarter') return `Q${Math.floor((Number(from.slice(5, 7)) - 1) / 3) + 1} ${y}`;
  return y;
}
