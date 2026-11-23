import { useState } from 'react';
import type { PlanItem, Profile } from '../types';
import MapView from '../components/MapView';
import { COLLECT_RADIUS_M, PLACES, distanceM, type Place } from '../data/places';
import { mapsLink } from '../ui';

interface Props {
  p: Profile;
  me: { lat: number; lng: number; acc: number } | null;
  gpsError?: string;
  startGps: () => void;
  collect: (pl: Place) => void;
  today: PlanItem[];
}

const fmt = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1609).toFixed(1)} miles`);

export default function MapScreen({ p, me, gpsError, startGps, collect, today }: Props) {
  const [pick, setPick] = useState<Place>();
  const got = new Set(p.coins);
  const near = me ? PLACES.map((pl) => ({ pl, d: distanceM(me, pl) })).sort((a, b) => a.d - b.d)[0] : undefined;
  const canGet = (pl: Place) => !!me && me.acc <= 120 && distanceM(me, pl) <= COLLECT_RADIUS_M && !got.has(pl.id);
  const route = today.map((i) => i.place).filter((x, k, a): x is string => !!x && x !== a[k - 1]);

  return (
    <div className="screen">
      <div className="card">
        <h1>🗺️ Las Vegas Strip</h1>
        <p className="muted">Walk to a place in real life to grab its coins. {got.size}/{PLACES.length} collected!</p>
        {!me && <button className="btn primary big" onClick={startGps}>📍 Show me on the map</button>}
        {gpsError && <p className="tip">⚠️ {gpsError}</p>}
        {near && (near.d < 20000
          ? <p className="tip">📍 Closest: <b>{near.pl.short}</b>, {fmt(near.d)} away</p>
          : <p className="tip">📍 You are not in Vegas yet. Your hero waits at the airport!</p>)}
        {near && canGet(near.pl) && <button className="btn yes big pop" onClick={() => collect(near.pl)}>🪙 Collect {near.pl.coins} coins at {near.pl.short}!</button>}
      </div>
      <MapView focus={p.trip.hotelId} me={me} avatar={p.avatar} collected={got} highlight={route} onPick={setPick} />
      {pick && (
        <div className="sheet-bg" onClick={() => setPick(undefined)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h2>{pick.icon} {pick.name}</h2>
              <button className="x" aria-label="Close" onClick={() => setPick(undefined)}>✕</button>
            </div>
            <p>{pick.fact}</p>
            <p className="chips">
              <span className={`chip ${got.has(pick.id) ? 'on' : 'gold'}`}>{got.has(pick.id) ? '✅ Coins collected' : `🪙 ${pick.coins} coins here`}</span>
              {me && <span className="chip">{fmt(distanceM(me, pick))} away</span>}
            </p>
            {pick.eats?.length ? <>
              <h3 style={{ marginTop: 10 }}>🍽️ Good places to eat</h3>
              <ul>{pick.eats.map((e) => <li key={e.name}><b>{e.name}</b> · {e.food}{e.kids ? ' · 👧 kid-friendly' : ''}</li>)}</ul>
            </> : null}
            <div className="row">
              <a className="btn" href={mapsLink(pick.id)} target="_blank" rel="noreferrer">🧭 Walk there</a>
              {canGet(pick) && <button className="btn yes" onClick={() => { collect(pick); setPick(undefined); }}>🪙 Collect!</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
