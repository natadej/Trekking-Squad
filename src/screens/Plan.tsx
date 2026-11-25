import { EP } from '../episode';
import { useEffect, useState } from 'react';
import { loadGsi } from '../cloud';
import { calendarReady } from '../gcal';
import type { PlanItem, Profile } from '../types';
import { dayLabel, hm } from '../time';
import { KIND, mapsLink, placeName, uberLink } from '../ui';
import { travelMin, tripDays } from '../planner';
import { placeById } from '../data/places';

interface Props {
  p: Profile;
  plan: PlanItem[];
  onRemove: (i: PlanItem) => void;
  onMaybe: (i: PlanItem, maybe: boolean) => void;
  onSync: () => void;
  onWalk: (i: PlanItem) => void;
  syncing: boolean;
  onAdd: (i: PlanItem) => void;
  onCalendar: () => void;
  onReset: () => void;
}

const toMin = (v: string) => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };

export default function Plan({ p, plan, onRemove, onMaybe, onSync, onWalk, syncing, onAdd, onCalendar, onReset }: Props) {
  const days = tripDays(p.trip);
  const [day, setDay] = useState(() => days.find((d) => plan.some((i) => i.day === d)) || days[0]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('12:00');
  const [len, setLen] = useState(60);
  const items = plan.filter((i) => i.day === day);
  useEffect(() => { if (calendarReady()) loadGsi().catch(() => undefined); }, []);

  return (
    <div className="screen">
      <div className="card">
        <h1>🗓️ Trip plan</h1>
        <p className="muted">Each hour is planned with travel time and food. Answer Yes, Maybe or No for each suggestion. Maybe shows as tentative in your calendar.</p>
        {calendarReady() && <button className="btn primary big" disabled={syncing} onClick={onSync}>{syncing ? '⏳ Syncing…' : '🔄 Sync with Google Calendar'}</button>}
        <p className="small muted">Brings in your Gmail bookings (flights, hotels, restaurants, shows) and puts this plan in your Google Calendar.</p>
        <div className="row">
          <button className="btn ghost" onClick={onCalendar}>📅 Download calendar file</button>
          <button className="btn ghost small" onClick={onReset}>↺ Re-plan</button>
        </div>
      </div>
      <div className="days" role="tablist">
        {days.map((d, n) => (
          <button key={d} role="tab" aria-selected={d === day} className={`day ${d === day ? 'on' : ''}`} onClick={() => setDay(d)}>
            <small>Day {n + 1}</small>{dayLabel(d).split(' ')[0]}<small>{dayLabel(d, true).split(', ')[1]}</small>
          </button>
        ))}
      </div>
      <ul className="timeline">
        {items.length === 0 && <li className="card muted">Nothing planned yet. Add your flight and pick what you love!</li>}
        {items.map((i, k) => {
          const prev = items[k - 1];
          const clash = prev && prev.end > i.start && prev.kind !== 'flight' && i.kind !== 'flight';
          const move = prev && prev.kind !== 'ride' && prev.place && i.place && prev.place !== i.place ? travelMin(prev.place, i.place) : 0;
          const k2 = KIND[i.kind];
          return (
            <li key={i.id}>
              {move > 0 && <div className="travel">{move >= 30 ? '🚕' : '🚶'} ~{move} min to {placeById(i.place)?.short}</div>}
              <div className={`item ${k2.cls} ${clash ? 'clash' : ''} ${i.tentative ? 'tentative' : ''}`}>
                <div className="time">{hm(i.start)}<small>to {hm(i.end)}</small></div>
                <div>
                  <div className="kind">{k2.icon} {k2.label}{i.tentative ? ' · Maybe' : ''}{clash ? ' · ⚠️ overlaps!' : ''}</div>
                  <div className="ttl">{i.title}</div>
                  <div className="meta">{[placeName(i), i.note].filter(Boolean).join(' · ')}</div>
                  <div className="row">
                    {i.kind === 'walk' && (p.walks?.some((d) => d.id === i.id) ? <span className="done-tag">✅ Walk done</span> : <button className="btn small gold" onClick={() => onWalk(i)}>▶️ Start walk</button>)}
                    {i.place && i.kind !== 'walk' && <a className="btn small" href={mapsLink(i.place)} target="_blank" rel="noreferrer">🧭 Go</a>}
                    {EP.uber && i.kind === 'ride' && i.id === 'ride-in' && p.trip.pickup !== 'friend' && <a className="btn small" href={uberLink(p.trip.hotelId)} target="_blank" rel="noreferrer">🚗 Uber</a>}
                    {EP.uber && i.kind === 'ride' && i.id === 'ride-out' && <a className="btn small" href={uberLink('airport')} target="_blank" rel="noreferrer">🚗 Uber</a>}
                  </div>
                  {!['flight', 'ride'].includes(i.kind) && (
                    <div className="yn" role="group" aria-label={`Going to ${i.title}?`}>
                      <button className={!i.tentative ? 'on' : ''} aria-pressed={!i.tentative} onClick={() => onMaybe(i, false)}>Yes</button>
                      <button className={i.tentative ? 'on maybe' : ''} aria-pressed={!!i.tentative} onClick={() => onMaybe(i, true)}>Maybe</button>
                      <button onClick={() => onRemove(i)}>No</button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {adding ? (
        <div className="card form">
          <h2>📌 Add my own plan</h2>
          <input placeholder="What is it? (Meeting, show, call home...)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
          <div className="row">
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={{ flex: 1 }} aria-label="Start time" />
            <select value={len} onChange={(e) => setLen(+e.target.value)} style={{ flex: 1 }} aria-label="How long">
              {[15, 30, 45, 60, 90, 120, 180].map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} hr`}</option>)}
            </select>
          </div>
          <div className="row">
            <button className="btn primary" disabled={!title.trim()} onClick={() => { onAdd({ id: 'c-' + Date.now(), day, start: toMin(start), end: toMin(start) + len, title: title.trim(), kind: 'custom' }); setAdding(false); setTitle(''); }}>Add it</button>
            <button className="btn ghost" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn big" onClick={() => setAdding(true)}>📌 Add my own plan on {dayLabel(day)}</button>
      )}
    </div>
  );
}
