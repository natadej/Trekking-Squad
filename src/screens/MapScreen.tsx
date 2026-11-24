import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import type { PlanItem, Profile } from '../types';
import WorldMap from '../components/WorldMap';
import { COLLECT_RADIUS_M, PLACES, distanceM, placeById, type Place } from '../data/places';
import { POI_ICON, POI_LABEL, bookingAt, hostName, loadWorld, type Poi, type PoiKind, type World } from '../data/world';
import PlaceCard from '../components/PlaceCard';

const WorldMap3D = lazy(() => import('../components/WorldMap3D'));

interface Props {
  p: Profile;
  me: { lat: number; lng: number; acc: number; hdg?: number | null } | null;
  gpsError?: string;
  startGps: () => void;
  collect: (pl: Place) => void;
  today: PlanItem[];
  addPlan: (i: PlanItem) => void;
}

const fmt = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1609).toFixed(1)} miles`);
const hm = (m: number) => `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${m >= 720 ? 'PM' : 'AM'}`;
const dayName = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const KINDS: PoiKind[] = ['food', 'shop', 'partner', 'aws'];
const ORDER: PoiKind[] = ['partner', 'aws', 'food', 'shop'];

function vegasNow() {
  const t = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return { day: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`, min: t.getHours() * 60 + t.getMinutes() };
}

export default function MapScreen({ p, me, gpsError, startGps, collect, today, addPlan }: Props) {
  const [pick, setPick] = useState<Place>();
  const [poi, setPoi] = useState<Poi>();
  const [world, setWorld] = useState<World>();
  const [full, setFull] = useState(false);
  const [kinds, setKinds] = useState<Set<PoiKind>>(new Set(KINDS));
  useEffect(() => { loadWorld().then(setWorld).catch(() => undefined); }, []);
  const got = new Set(p.coins);
  const now = vegasNow();
  const near = me ? PLACES.map((pl) => ({ pl, d: distanceM(me, pl) })).sort((a, b) => a.d - b.d)[0] : undefined;
  const canGet = (pl: Place) => !!me && me.acc <= 120 && distanceM(me, pl) <= COLLECT_RADIUS_M && !got.has(pl.id);
  const home = placeById(p.trip.hotelId) ?? placeById('venetian')!;

  const next = useMemo(() => {
    const it = today.find((i) => i.place && (i.day !== now.day || i.end > now.min) && i.kind !== 'ride') ?? today.find((i) => i.place);
    const pl = placeById(it?.place);
    return it && pl ? { place: pl, title: it.title } : undefined;
  }, [today, now.day, now.min]);

  const booked = (x: Poi) => !!x.ev?.length;
  const inside = (pl: Place) => (world?.pois ?? []).filter((x) => x.p === pl.id && kinds.has(x.k))
    .sort((a, b) => Number(booked(b)) - Number(booked(a)) || ORDER.indexOf(a.k) - ORDER.indexOf(b.k) || a.n.localeCompare(b.n));
  const toggle = (k: PoiKind) => setKinds((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const walk = (x: { lat: number; lng: number }) => `https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lng}&travelmode=walking`;

  return (
    <div className="screen">
      <div className="map-bar">
        <div className="map-stat"><b>{PLACES.filter((x) => got.has(x.id)).length}<small>/{PLACES.length}</small></b><span>places collected</span></div>
        {!me ? <button className="btn primary" onClick={startGps}>📍 Find me</button>
          : near && <span className="map-near">📍 {near.d < 20000 ? <><b>{near.pl.short}</b> · {fmt(near.d)}</> : <>Not in Vegas yet</>}</span>}
      </div>
      {gpsError && <p className="tip">⚠️ {gpsError}</p>}
      {near && canGet(near.pl) && <button className="btn gold big pop" onClick={() => collect(near.pl)}>🪙 Collect +{near.pl.coins} at {near.pl.short}</button>}
      <div className="chips cats" role="group" aria-label="Show on map">
        {KINDS.map((k) => (
          <button key={k} className={`chip ${kinds.has(k) ? 'on' : ''}`} aria-pressed={kinds.has(k)} onClick={() => toggle(k)}>{POI_ICON[k]} {POI_LABEL[k]}</button>
        ))}
      </div>

      {(() => {
        const mapProps = { me: me && me.lat < 36.2 && me.lat > 36 && me.lng > -115.3 && me.lng < -115 ? me : null, avatar: p.avatar, nick: p.nick, collected: got, focus: home, next, kinds, booked,
          onPick: (x: Place) => { setFull(false); setPoi(undefined); setPick(x); }, onPoi: (x: Poi) => { setFull(false); setPick(undefined); setPoi(x); } };
        return <>
          {world ? <Suspense fallback={<div className="map3d loading">Loading the 3D world…</div>}><WorldMap3D world={world} {...mapProps} /></Suspense> : <div className="map3d loading">Loading the 3D world…</div>}
          <button className="btn big" onClick={() => setFull(true)}>🗺️ Open the world map</button>
          {full && (
            <div className="fullmap">
              <div className="sheet-head"><h2>🗺️ World map · Las Vegas Strip</h2><button className="x" aria-label="Close" onClick={() => setFull(false)}>✕</button></div>
              <WorldMap world={world} {...mapProps} />
            </div>
          )}
        </>;
      })()}
      <p className="map-key muted">Tap any building for photos and what's inside. 🔒 = booked for an event.</p>

      {pick && <PlaceCard place={pick} p={p} addPlan={addPlan} inside={inside(pick)} collected={got.has(pick.id)} distance={me ? distanceM(me, pick) : undefined} canCollect={canGet(pick)} booked={booked}
        onPoi={(x) => { setPick(undefined); setPoi(x); }} onCollect={() => { collect(pick); setPick(undefined); }} onClose={() => setPick(undefined)} />}

      {poi && (
        <div className="sheet-bg" onClick={() => setPoi(undefined)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h2>{POI_ICON[poi.k]} {poi.n}</h2>
              <button className="x" aria-label="Close" onClick={() => setPoi(undefined)}>✕</button>
            </div>
            <p className="chips">
              <span className="chip">{POI_LABEL[poi.k]}</span>
              <span className="chip">📍 Inside {hostName(poi)}</span>
              {poi.c && <span className="chip">{poi.c}</span>}
              {me && <span className="chip">{fmt(distanceM(me, poi))} away</span>}
            </p>
            {poi.sp?.length ? <p>🤝 Partner host: <b>{poi.sp.join(', ')}</b></p> : null}
            {poi.ev?.length ? <>
              {bookingAt(poi, now.day, now.min) ? <p className="tip">🔒 <b>Booked right now</b> for a re:Invent event. Regular guests may not get in.</p> : null}
              <h3 style={{ marginTop: 10 }}>{poi.k === 'aws' || poi.k === 'partner' && !poi.sp ? '🕑 Open hours' : '🔒 Booked for re:Invent'}</h3>
              <ul>{poi.ev.map((e) => <li key={e.c}><b>{dayName(e.d)}</b> {hm(e.s)}–{hm(e.e)}{e.t !== 'Open' ? ` · ${e.t}` : ''}</li>)}</ul>
              {poi.k !== 'aws' && !(poi.k === 'partner' && !poi.sp) && <p className="muted">Plan your own meal here at a different time.</p>}
            </> : null}
            {poi.approx && <p className="muted">The pin shows roughly where it is inside the building.</p>}
            <div className="row">
              <a className="btn" href={walk(poi)} target="_blank" rel="noreferrer">🧭 Walk there</a>
              <button className="btn" onClick={() => { const h = placeById(poi.p); setPoi(undefined); if (h) setPick(h); }}>🏬 See {hostName(poi)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
