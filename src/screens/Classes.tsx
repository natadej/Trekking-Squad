import { useMemo, useState } from 'react';
import type { Prefs, Profile, Session } from '../types';
import { topLikes } from '../learn';
import { distanceM } from '../data/places';
import { nowPT } from '../time';
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
  me: { lat: number; lng: number } | null;
  onLearn: (s: Session, w: number) => void;
}

type Sort = 'best' | 'near' | 'soon';
type When = 'all' | 'open' | 'walkup' | 'now';
const VENUES = ['venetian', 'wynn', 'caesars', 'forum', 'mgm'] as const;
const STEP_M = 0.75;

const LEVELS = [[100, '🌱 New'], [200, '🌿 Some'], [300, '🌳 Good'], [400, '🚀 Expert']] as const;

export default function Classes({ p, sessions, planned, setPrefs, toggle, me, onLearn }: Props) {
  const [sort, setSort] = useState<Sort>('best');
  const [where, setWhere] = useState<string>('all');
  const [when, setWhen] = useState<When>('open');
  const [tune, setTune] = useState(!p.prefs.interests.length);
  const now = nowPT();
  const from = me ?? placeById(p.trip.hotelId) ?? null;
  const far = (s: Session) => { const pl = placeById(VENUE_PLACE[s.v]); return pl && from ? distanceM(from, pl) : 1e9; };
  const likes = topLikes(p.learn);
  const [q, setQ] = useState('');
  const [day, setDay] = useState('all');
  const [n, setN] = useState(30);
  const [open, setOpen] = useState<string>();
  const prefs = p.prefs;
  const days = useMemo(() => [...new Set(sessions.map((s) => s.d))].sort(), [sessions]);

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const nearest = from ? [...VENUES].sort((a, b) => distanceM(from, placeById(VENUE_PLACE[a])!) - distanceM(from, placeById(VENUE_PLACE[b])!))[0] : undefined;
    return sessions
      .filter((s) => day === 'all' || s.d === day)
      .filter((s) => where === 'all' || (where === 'near' ? s.v === nearest : s.v === where))
      .filter((s) => when === 'all' || (when === 'walkup' ? !!s.w : when === 'now' ? s.d === now.day && s.s <= now.min + 60 && s.e > now.min : s.d > now.day || (s.d === now.day && s.e > now.min)))
      .filter((s) => !words.length || words.every((w) => (s.c + ' ' + s.t + ' ' + s.sp.join(' ') + ' ' + s.tp.join(' ')).toLowerCase().includes(w)))
      .map((s) => ({ s, sc: scoreSession(s, prefs, p.trip.hotelId, p.learn) + (p.added.includes(s.c) ? 100 : 0) }))
      .sort((a, b) => sort === 'near' ? far(a.s) - far(b.s) || b.sc - a.sc
        : sort === 'soon' ? a.s.d.localeCompare(b.s.d) || a.s.s - b.s.s
          : b.sc - a.sc || a.s.d.localeCompare(b.s.d) || a.s.s - b.s.s);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, q, day, prefs, p.added, p.trip.hotelId, p.learn, sort, where, when, from?.lat, from?.lng, now.day, now.min]);

  return (
    <div className="screen">
      <div className="card">
        <div className="row-between">
          <h1>🎓 Classes for you</h1>
          <button className="btn small ghost" aria-expanded={tune} onClick={() => setTune(!tune)}>{tune ? 'Done' : '⚙️ My interests'}</button>
        </div>
        <p className="muted small">{likes.length ? <>Learning from your picks: you like <b>{likes.join(', ')}</b>.</> : <>Picks from {sessions.length.toLocaleString()} real re:Invent classes. The more you pick, the better it gets.</>}</p>
        {tune && <>
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
        </>}
      </div>

      <input className="search" placeholder="🔍 Search classes, codes or speakers" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="filters">
        <label>Sort<select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="best">Best for me</option><option value="near">Nearest {me ? 'to me' : 'to my hotel'}</option><option value="soon">Soonest</option>
        </select></label>
        <label>Where<select value={where} onChange={(e) => setWhere(e.target.value)}>
          <option value="all">All hotels</option><option value="near">Closest hotel</option>
          {VENUES.map((v) => <option key={v} value={v}>{placeById(VENUE_PLACE[v])?.short}</option>)}
        </select></label>
        <label>When<select value={when} onChange={(e) => setWhen(e.target.value as When)}>
          <option value="open">Not started yet</option><option value="now">Starting within 1 hour</option><option value="walkup">Walk-up only</option><option value="all">Everything</option>
        </select></label>
      </div>
      <div className="days">
        <button className={`day ${day === 'all' ? 'on' : ''}`} onClick={() => setDay('all')}>All<small>days</small></button>
        {days.map((d) => <button key={d} className={`day ${d === day ? 'on' : ''}`} onClick={() => setDay(d)}>{dayLabel(d).split(' ')[0]}<small>{dayLabel(d, true).split(', ')[1]}</small></button>)}
      </div>

      {!list.length && <div className="card muted">No classes match. Try “Everything” or another hotel, or add interests with ⚙️ My interests.</div>}
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
              <div className="muted small">{s.c} · {dayLabel(s.d)} {hm(s.s)}–{hm(s.e)} · {placeById(VENUE_PLACE[s.v])?.short} {s.r}{far(s) < 1e8 ? ` · ${far(s) < 150 ? 'here' : `${Math.round(far(s) / STEP_M / 100) * 100} steps`}` : ''}</div>
              {open === s.c && <>
                <p className="ab">{s.ab}</p>
                {s.sp.length > 0 && <p className="small">🎙️ {s.sp.join(', ')}</p>}
                <a className="btn small" href={catalogLink(s.c)} target="_blank" rel="noreferrer">Reserve a seat on the AWS site ↗</a>
              </>}
              <div className="row">
                <button className={`btn small ${mine ? 'yes' : ''}`} onClick={() => toggle(s.c)}>{mine ? '⭐ Picked!' : '☆ Pick this'}</button>
                <button className="btn small ghost" onClick={() => { if (open !== s.c) onLearn(s, 0.5); setOpen(open === s.c ? undefined : s.c); }}>{open === s.c ? 'Less' : 'More'}</button>
              </div>
            </div>
          );
        })}
      </div>
      {list.length > n && <button className="btn big" onClick={() => setN(n + 30)}>Show more ({list.length - n} left)</button>}
    </div>
  );
}
