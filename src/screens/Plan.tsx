import { useState } from 'react';
import type { PlanItem, Profile } from '../types';
import { dayLabel, hm } from '../time';
import { KIND, mapsLink, placeName, uberLink } from '../ui';
import { travelMin, tripDays } from '../planner';
import { placeById } from '../data/places';

interface Props {
  p: Profile;
  plan: PlanItem[];
  onRemove: (i: PlanItem) => void;
  onAdd: (i: PlanItem) => void;
  onCalendar: () => void;
  onReset: () => void;
}

const toMin = (v: string) => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };

export default function Plan({ p, plan, onRemove, onAdd, onCalendar, onReset }: Props) {
  const days = tripDays(p.trip);
  const [day, setDay] = useState(() => days.find((d) => plan.some((i) => i.day === d)) || days[0]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('12:00');
  const [len, setLen] = useState(60);
  const items = plan.filter((i) => i.day === day);

  return (
    <div className="screen">
      <div className="card">
        <h1>🗓️ Trip plan</h1>
        <p className="muted">Every day is a level. I planned each hour with travel time, food and rest. Tap ✕ to skip something.</p>
        <div className="row">
          <button className="btn primary" onClick={onCalendar}>📅 Put it in my calendar</button>
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
              <div className={`item ${k2.cls} ${clash ? 'clash' : ''}`}>
                <div className="time">{hm(i.start)}<small>to {hm(i.end)}</small></div>
                <div>
                  <div className="kind">{k2.icon} {k2.label}{clash ? ' · ⚠️ overlaps!' : ''}</div>
                  <div className="ttl">{i.title}</div>
                  <div className="meta">{[placeName(i), i.note].filter(Boolean).join(' · ')}</div>
                  <div className="row">
                    {i.place && <a className="btn small" href={mapsLink(i.place)} target="_blank" rel="noreferrer">🧭 Go</a>}
                    {i.kind === 'ride' && i.id === 'ride-in' && p.trip.pickup !== 'friend' && <a className="btn small" href={uberLink(p.trip.hotelId)} target="_blank" rel="noreferrer">🚗 Uber</a>}
                    {i.kind === 'ride' && i.id === 'ride-out' && <a className="btn small" href={uberLink('airport')} target="_blank" rel="noreferrer">🚗 Uber</a>}
                  </div>
                </div>
                {!['flight', 'ride'].includes(i.kind) && <button className="x" aria-label={`Skip ${i.title}`} onClick={() => onRemove(i)}>✕</button>}
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
