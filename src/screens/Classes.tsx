import { useMemo, useState } from 'react';
import type { Prefs, Profile, Session } from '../types';
import { INTERESTS } from '../data/interests';
import { scoreSession } from '../planner';
import { dayLabel, hm } from '../time';
import { catalogLink } from '../ui';
import { placeById, VENUE_PLACE } from '../data/places';

interface Props {
  p: Profile;
  sessions: Session[];
  planned: Set<string>;
  setPrefs: (f: (x: Prefs) => Prefs) => void;
  toggle: (code: string) => void;
}

const LEVELS = [[100, '🌱 New'], [200, '🌿 Some'], [300, '🌳 Good'], [400, '🚀 Expert']] as const;

export default function Classes({ p, sessions, planned, setPrefs, toggle }: Props) {
  const [q, setQ] = useState('');
  const [day, setDay] = useState('all');
  const [n, setN] = useState(30);
  const [open, setOpen] = useState<string>();
  const prefs = p.prefs;
  const days = useMemo(() => [...new Set(sessions.map((s) => s.d))].sort(), [sessions]);

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return sessions
      .filter((s) => day === 'all' || s.d === day)
      .filter((s) => !words.length || words.every((w) => (s.c + ' ' + s.t + ' ' + s.sp.join(' ') + ' ' + s.tp.join(' ')).toLowerCase().includes(w)))
      .map((s) => ({ s, sc: scoreSession(s, prefs, p.trip.hotelId) + (p.added.includes(s.c) ? 100 : 0) }))
      .filter((x) => words.length || x.sc > 0)
      .sort((a, b) => b.sc - a.sc || a.s.d.localeCompare(b.s.d) || a.s.s - b.s.s);
  }, [sessions, q, day, prefs, p.added, p.trip.hotelId]);

  return (
    <div className="screen">
      <div className="card">
        <h1>🎓 Pick what you love</h1>
        <p className="muted">Tap tiles. I find the best of {sessions.length.toLocaleString()} real re:Invent classes.</p>
        <div className="tiles" style={{ marginTop: 10 }}>
          {INTERESTS.map((it) => {
            const on = prefs.interests.includes(it.id);
            return (
              <button key={it.id} className={`tile ${on ? 'on' : ''}`} aria-pressed={on}
                onClick={() => setPrefs((x) => ({ ...x, interests: on ? x.interests.filter((i) => i !== it.id) : [...x.interests, it.id] }))}>
                <span className="ti">{it.icon}</span>{it.label}
              </button>
            );
          })}
        </div>
        <p style={{ marginTop: 12, fontWeight: 800 }}>How much do you know?</p>
        <div className="seg">
          {LEVELS.map(([v, l]) => <button key={v} className={prefs.level === v ? 'on' : ''} aria-pressed={prefs.level === v} onClick={() => setPrefs((x) => ({ ...x, level: v }))}>{l}</button>)}
        </div>
        <p style={{ marginTop: 12, fontWeight: 800 }}>I like…</p>
        <div className="seg">
          {([['hands', '🛠️ Building'], ['mix', '🎲 Both'], ['talks', '👂 Listening']] as const).map(([v, l]) => (
            <button key={v} className={prefs.style === v ? 'on' : ''} aria-pressed={prefs.style === v} onClick={() => setPrefs((x) => ({ ...x, style: v }))}>{l}</button>
          ))}
        </div>
      </div>

      <input className="search" placeholder="🔍 Search classes, codes or speakers" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="days">
        <button className={`day ${day === 'all' ? 'on' : ''}`} onClick={() => setDay('all')}>All<small>days</small></button>
        {days.map((d) => <button key={d} className={`day ${d === day ? 'on' : ''}`} onClick={() => setDay(d)}>{dayLabel(d).split(' ')[0]}<small>{dayLabel(d, true).split(', ')[1]}</small></button>)}
      </div>

      {!prefs.interests.length && !q && <div className="card muted">👆 Tap at least one tile to see your best classes.</div>}
      <div className="list">
        {list.slice(0, n).map(({ s }) => {
          const mine = p.added.includes(s.c);
          const inPlan = planned.has(s.c);
          return (
            <div key={s.c} className={`session ${mine || inPlan ? 'added' : ''}`}>
              <div className="chips">
                <span className="chip">{s.y}</span>
                {s.l > 0 && <span className="chip">Level {s.l}</span>}
                {inPlan && <span className="chip on">✓ In my plan</span>}
                {s.w ? <span className="chip warn">Walk-up only</span> : null}
              </div>
              <div className="ttl">{s.t}</div>
              <div className="muted small">{s.c} · {dayLabel(s.d)} {hm(s.s)}–{hm(s.e)} · {placeById(VENUE_PLACE[s.v])?.short} {s.r}</div>
              {open === s.c && <>
                <p className="ab">{s.ab}</p>
                {s.sp.length > 0 && <p className="small">🎙️ {s.sp.join(', ')}</p>}
                <a className="btn small" href={catalogLink(s.c)} target="_blank" rel="noreferrer">Reserve a seat on the AWS site ↗</a>
              </>}
              <div className="row">
                <button className={`btn small ${mine ? 'yes' : ''}`} onClick={() => toggle(s.c)}>{mine ? '⭐ Picked!' : '☆ Pick this'}</button>
                <button className="btn small ghost" onClick={() => setOpen(open === s.c ? undefined : s.c)}>{open === s.c ? 'Less' : 'More'}</button>
              </div>
            </div>
          );
        })}
      </div>
      {list.length > n && <button className="btn big" onClick={() => setN(n + 30)}>Show more ({list.length - n} left)</button>}
    </div>
  );
}
