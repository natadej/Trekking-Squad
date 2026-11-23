import { useEffect, useMemo, useState } from 'react';
import type { PlanItem, Profile } from '../types';
import { PLACES, STRIP_ROAD, distanceM, placeById } from '../data/places';
import { CAT_ICON, CAT_LABEL, loadShops, shopKey, stepsTo, type Area, type Shop, type ShopCat, type ShopData } from '../data/shops';
import { tripDays } from '../planner';
import Hero from '../components/Hero';

type LL = { lat: number; lng: number };
interface Props {
  p: Profile;
  me: LL | null;
  stepsToday: number;
  counting: boolean;
  startSteps: () => void;
  collectSpot: (a: Area) => void;
  addPlan: (i: PlanItem) => void;
  toggleWish: (key: string) => void;
}

const B = { n: 36.172, s: 36.045, w: -115.19, e: -115.1 };
const K = Math.cos((36.11 * Math.PI) / 180);
const W = (B.e - B.w) * 111320 * K, H = (B.n - B.s) * 111320, SC = 360 / W;
const xy = (o: LL) => ({ x: (o.lng - B.w) * 111320 * K * SC, y: (B.n - o.lat) * 111320 * SC });
const SPOT_RADIUS = { mall: 300, store: 160, fun: 200, trip: 500 };
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayName = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const steps = (n: number) => `${n.toLocaleString()} steps`;

function AddToPlan({ p, title, note, onAdd }: { p: Profile; title: string; note: string; onAdd: (i: PlanItem) => void }) {
  const days = tripDays(p.trip);
  const [day, setDay] = useState(days[0]);
  const [start, setStart] = useState(19 * 60);
  return (
    <div className="addplan">
      <select aria-label="Day" value={day} onChange={(e) => setDay(e.target.value)}>{days.map((d) => <option key={d} value={d}>{dayName(d)}</option>)}</select>
      <select aria-label="Time" value={start} onChange={(e) => setStart(Number(e.target.value))}>
        {Array.from({ length: 29 }, (_, i) => 8 * 60 + i * 30).map((m) => <option key={m} value={m}>{((Math.floor(m / 60) + 11) % 12) + 1}:{String(m % 60).padStart(2, '0')} {m >= 720 ? 'PM' : 'AM'}</option>)}
      </select>
      <button className="btn small yes" onClick={() => onAdd({ id: 'c-' + Date.now(), day, start, end: start + 60, title, kind: 'custom', note })}>🗓️ Add to plan</button>
    </div>
  );
}

export default function ShopScreen({ p, me, stepsToday, counting, startSteps, collectSpot, addPlan, toggleWish }: Props) {
  const [data, setData] = useState<ShopData>();
  const [q, setQ] = useState('');
  const [area, setArea] = useState<string>('all');
  const [cat, setCat] = useState<ShopCat | 'all' | 'wish'>('all');
  const [openA, setOpenA] = useState<Area>();
  const [openS, setOpenS] = useState<Shop>();
  const [more, setMore] = useState(false);
  useEffect(() => { loadShops().then(setData).catch(() => undefined); }, []);
  const from: LL = me ?? placeById(p.trip.hotelId) ?? placeById('venetian')!;
  const areaById = (id: string) => data?.areas.find((a) => a.id === id);
  const wish = new Set(p.wish);
  const got = new Set(p.coins);
  const today = DAY[new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })).getDay()];

  const hits = useMemo(() => {
    if (!data) return [];
    const t = q.trim().toLowerCase();
    return data.shops.filter((s) => (area === 'all' || s.a === area) && (cat === 'all' || (cat === 'wish' ? wish.has(shopKey(s)) : s.c === cat))
      && (!t || s.n.toLowerCase().includes(t) || (s.t ?? '').toLowerCase().includes(t) || CAT_LABEL[s.c].toLowerCase().includes(t)));
  }, [data, q, area, cat, p.wish]); // eslint-disable-line react-hooks/exhaustive-deps
  const areaHits = data?.areas.filter((a) => !q.trim() || a.name.toLowerCase().includes(q.trim().toLowerCase())) ?? [];
  const cats = useMemo(() => [...new Set((data?.shops ?? []).filter((s) => area === 'all' || s.a === area).map((s) => s.c))], [data, area]);
  const showShops = area !== 'all' || q.trim() !== '' || cat !== 'all';
  const near = (a: Area) => !!me && distanceM(me, a) <= SPOT_RADIUS[a.kind];
  const go = (o: LL, far: boolean) => `https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}&travelmode=${far ? 'driving' : 'walking'}`;
  const ant = data?.areas.find((a) => a.far);
  const pinAt = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {}, placed: { x: number; y: number }[] = [];
    for (const ar of data?.areas.filter((x) => !x.far) ?? []) {
      const c = xy(ar);
      for (let k = 0; k < 12 && placed.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < 26); k++) { c.x += 26 * Math.cos(k * 1.3); c.y += 26 * Math.sin(k * 1.3); }
      placed.push(c); out[ar.id] = c;
    }
    return out;
  }, [data]);

  return (
    <div className="screen">
      <div className="card">
        <h1>🛍️ Shopping & Fun map</h1>
        <p className="steps-line">👣 <b>{steps(stepsToday)}</b> today · goal 10,000</p>
        <div className="bar" aria-hidden><i style={{ width: `${Math.min(100, stepsToday / 100)}%` }} /></div>
        {!counting
          ? <button className="btn primary big" onClick={startSteps}>👣 Start counting my steps</button>
          : <p className="small muted">🟢 Counting steps while the app is open. +1 zeny every 100 steps, +200 at 10,000!</p>}
        <p className="small muted">Walk to shops, outlets and shows to climb the leaderboard. Tap a pin to see what's there.</p>
      </div>

      <div className="shopmap card">
        <svg viewBox={`0 0 360 ${Math.round(H * SC)}`} role="img" aria-label="Map of Las Vegas shopping and fun places">
          <rect width="360" height={H * SC} fill="#efe0b9" />
          <polyline points={STRIP_ROAD.map(([la, ln]) => { const c = xy({ lat: la, lng: ln }); return `${c.x},${c.y}`; }).join(' ')} fill="none" stroke="#b9925a" strokeWidth="6" strokeLinecap="round" />
          <text x={xy({ lat: 36.128, lng: -115.168 }).x + 8} y={xy({ lat: 36.128, lng: -115.168 }).y} className="lbl strip">THE STRIP</text>
          {PLACES.filter((x) => x.kind !== 'fun').map((x) => { const c = xy(x); return <circle key={x.id} cx={c.x} cy={c.y} r={x.kind === 'airport' ? 6 : 2.5} fill={x.kind === 'airport' ? '#7dd3fc' : '#c9a36a'} />; })}
          {data?.areas.filter((a) => !a.far).map((a) => {
            const c = pinAt[a.id] ?? xy(a), sel = area === a.id;
            return (
              <g key={a.id} className={`pin ${sel ? 'on' : ''}`} transform={`translate(${c.x},${c.y})`} onClick={() => { setArea(a.id); setOpenA(a); setMore(false); }} role="button" aria-label={a.name}>
                <circle r={sel ? 14 : 11} fill={got.has('spot:' + a.id) ? '#ffe58a' : '#fffdf6'} stroke={sel ? '#4a7fd8' : '#8a6a44'} strokeWidth="2" />
                <text y="5" textAnchor="middle" fontSize="13">{a.icon}</text>
                <text y="-15" textAnchor="middle" className="lbl">{a.short}</text>
              </g>
            );
          })}
          {me && me.lat < B.n && me.lat > B.s && me.lng > B.w && me.lng < B.e && (() => { const c = xy(me); return <foreignObject x={c.x - 14} y={c.y - 30} width="28" height="34"><Hero a={p.avatar} size={28} /></foreignObject>; })()}
          {ant && <g className="pin" transform="translate(300,22)" onClick={() => setOpenA(ant)} role="button" aria-label={ant.name}>
            <rect x="-56" y="-14" width="110" height="26" rx="8" fill="#fffdf6" stroke="#8a6a44" strokeWidth="2" />
            <text x="-1" y="4" textAnchor="middle" className="lbl">🏜️ Antelope ➜ 270 mi</text>
          </g>}
        </svg>
      </div>

      <div className="card">
        <input className="search" type="search" placeholder="🔍 Search shops, food, brands…" value={q} onChange={(e) => { setQ(e.target.value); setMore(false); }} />
        <div className="chips" role="group" aria-label="Where">
          <button className={`chip ${area === 'all' ? 'on' : ''}`} aria-pressed={area === 'all'} onClick={() => setArea('all')}>🌎 All</button>
          {data?.areas.filter((a) => a.kind === 'mall').map((a) => (
            <button key={a.id} className={`chip ${area === a.id ? 'on' : ''}`} aria-pressed={area === a.id} onClick={() => { setArea(a.id); setMore(false); }}>{a.icon} {a.short}</button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="What">
          <button className={`chip ${cat === 'all' ? 'on' : ''}`} aria-pressed={cat === 'all'} onClick={() => setCat('all')}>Everything</button>
          <button className={`chip ${cat === 'wish' ? 'on' : ''}`} aria-pressed={cat === 'wish'} onClick={() => setCat('wish')}>⭐ My list ({p.wish.length})</button>
          {cats.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} aria-pressed={cat === c} onClick={() => setCat(c)}>{CAT_ICON[c]} {CAT_LABEL[c]}</button>)}
        </div>
      </div>

      {!showShops && (
        <ul className="rows">
          {areaHits.map((a) => (
            <li key={a.id}><button onClick={() => setOpenA(a)}>
              <span className="ri">{a.icon}</span>
              <span><b>{a.name}</b><br /><span className="small muted">{a.far ? 'Day trip · 4.5 h drive' : `👣 ${steps(stepsTo(from, a))} · ${data!.shops.filter((s) => s.a === a.id).length || ''}${a.kind === 'mall' ? ' shops' : ''}`}</span></span>
              {got.has('spot:' + a.id) ? <span className="chip gold">✓</span> : <span className="chip">+50 z</span>}
            </button></li>
          ))}
        </ul>
      )}
      {showShops && (
        <>
          <p className="small muted center">{hits.length} found</p>
          <ul className="rows">
            {hits.slice(0, more ? 400 : 40).map((s) => (
              <li key={shopKey(s)}><button onClick={() => setOpenS(s)}>
                <span className="ri">{CAT_ICON[s.c]}</span>
                <span><b>{s.n}</b>{wish.has(shopKey(s)) && ' ⭐'}<br /><span className="small muted">{areaById(s.a)?.short}{s.w ? ` · ${s.w}` : ''}</span></span>
                {s.d?.length ? <span className="chip gold">🎟️ deal</span> : <span />}
              </button></li>
            ))}
          </ul>
          {hits.length > 40 && !more && <button className="btn ghost big" onClick={() => setMore(true)}>Show all {hits.length}</button>}
        </>
      )}
      {data && <p className="small muted center">Store lists: Grand Canal Shoppes directory and OpenStreetMap, {data.updated}. Deals change, so check the official page.</p>}

      {openA && (
        <div className="sheet-bg" onClick={() => setOpenA(undefined)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><h2>{openA.icon} {openA.name}</h2><button className="x" aria-label="Close" onClick={() => setOpenA(undefined)}>✕</button></div>
            <p>{openA.about}</p>
            <p className="small muted">📍 {openA.addr}</p>
            {!openA.far && <p className="tip">👣 About <b>{steps(stepsTo(from, openA))}</b> from {me ? 'you' : 'your hotel'}{stepsTo(from, openA) > 4000 ? ' · far, take a ride and walk inside!' : ''}</p>}
            {openA.shows?.map((s) => <p key={s.n} className="tip">🎭 <b>{s.n}</b> · {s.when} <a href={s.url} target="_blank" rel="noreferrer">Tickets</a></p>)}
            {openA.deals && <a className="btn yes big" href={openA.deals} target="_blank" rel="noreferrer">🎟️ See today's deals</a>}
            {openA.id === 'venetian' && <p className="small muted">🎟️ Shops marked "deal" are in the mall's RewardCard or dining programs.</p>}
            {near(openA) && !got.has('spot:' + openA.id) && <button className="btn yes big pop" onClick={() => collectSpot(openA)}>🪙 You're here! Collect +50 zeny</button>}
            <div className="row-btns">
              <a className="btn" href={go(openA, !!openA.far || stepsTo(from, openA) > 4000)} target="_blank" rel="noreferrer">🧭 Directions</a>
              <a className="btn ghost" href={openA.url} target="_blank" rel="noreferrer">🌐 Website</a>
              {openA.kind === 'mall' && <button className="btn ghost" onClick={() => { setArea(openA.id); setCat('all'); setQ(''); setOpenA(undefined); }}>🔍 See all shops</button>}
            </div>
            <AddToPlan p={p} title={`${openA.icon} ${openA.short}`} note={openA.addr} onAdd={(i) => { addPlan(i); setOpenA(undefined); }} />
          </div>
        </div>
      )}

      {openS && (() => {
        const a = areaById(openS.a)!; const at = openS.lat != null ? { lat: openS.lat, lng: openS.lng! } : a;
        const hrs = openS.h?.[DAY.indexOf(today)];
        return (
          <div className="sheet-bg" onClick={() => setOpenS(undefined)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head"><h2>{CAT_ICON[openS.c]} {openS.n}</h2><button className="x" aria-label="Close" onClick={() => setOpenS(undefined)}>✕</button></div>
              <p><b>{a.icon} {a.short}</b>{openS.w ? ` · ${openS.w}` : ''}</p>
              <p className="small muted">{CAT_LABEL[openS.c]}{openS.t && openS.t.toLowerCase() !== CAT_LABEL[openS.c].toLowerCase() ? ` · ${openS.t}` : ''}</p>
              {hrs && <p>🕒 Today: <b>{hrs}</b></p>}
              {openS.oh && <p className="small">🕒 {openS.oh}</p>}
              {openS.d?.map((d) => <p key={d} className="tip">{d}</p>)}
              {a.deals && <a className="btn yes" href={a.deals} target="_blank" rel="noreferrer">🎟️ Outlet deals</a>}
              <p className="tip">👣 About <b>{steps(stepsTo(from, at))}</b> from {me ? 'you' : 'your hotel'}</p>
              <div className="row-btns">
                <button className="btn" onClick={() => toggleWish(shopKey(openS))}>{wish.has(shopKey(openS)) ? '⭐ On my list' : '☆ Save to my list'}</button>
                <a className="btn ghost" href={go(at, stepsTo(from, at) > 4000)} target="_blank" rel="noreferrer">🧭 Directions</a>
                {openS.ph && <a className="btn ghost" href={`tel:${openS.ph}`}>📞 Call</a>}
                {openS.web && <a className="btn ghost" href={openS.web} target="_blank" rel="noreferrer">🌐 Website</a>}
              </div>
              <AddToPlan p={p} title={`${CAT_ICON[openS.c]} ${openS.n}`} note={`${a.short}${openS.w ? ' · ' + openS.w : ''}`} onAdd={(i) => { addPlan(i); setOpenS(undefined); }} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

