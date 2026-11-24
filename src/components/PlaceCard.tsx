import { useState } from 'react';
import type { Place } from '../data/places';
import { POI_ICON, POI_LABEL, type Poi, type PoiKind } from '../data/world';
import { photoUrl, placeInfo, shortAbout } from '../data/placeInfo';
import { mapsLink } from '../ui';
import type { PlanItem, Profile } from '../types';
import { AddToPlan } from '../screens/ShopScreen';

const KIND_LABEL: Record<Place['kind'], string> = { airport: 'Airport', hotel: 'Resort & casino', venue: 're:Invent venue', fun: 'Landmark' };
const KINDS: PoiKind[] = ['aws', 'partner', 'food', 'shop'];

interface Props {
  place: Place;
  p: Profile;
  addPlan: (i: PlanItem) => void;
  inside: Poi[];
  collected: boolean;
  distance?: number;
  canCollect: boolean;
  booked: (p: Poi) => boolean;
  onPoi: (p: Poi) => void;
  onCollect: () => void;
  onClose: () => void;
}

export default function PlaceCard({ place: pl, p, addPlan, inside, collected, distance, canCollect, booked, onPoi, onCollect, onClose }: Props) {
  const info = placeInfo(pl.id), img = photoUrl(pl.id);
  const [tab, setTab] = useState<PoiKind | 'all'>('all');
  const [more, setMore] = useState(false);
  const counts = KINDS.map((k) => [k, inside.filter((x) => x.k === k).length] as const).filter(([, n]) => n > 0);
  const list = inside.filter((x) => tab === 'all' || x.k === tab);
  const shown = more ? list : list.slice(0, 6);
  const walk = distance !== undefined && distance < 20000 ? { m: distance, steps: Math.round(distance / 0.75), min: Math.max(1, Math.round(distance / 80)) } : undefined;
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet place-card" onClick={(e) => e.stopPropagation()}>
        <div className="pc-hero" style={img ? { backgroundImage: `url(${img})` } : { background: `linear-gradient(135deg, ${pl.color}, #4c1d95)` }}>
          <button className="x pc-x" aria-label="Close" onClick={onClose}>✕</button>
          {!img && <span className="pc-ico" aria-hidden>{pl.icon}</span>}
          <div className="pc-title">
            <span className="pc-kind">{KIND_LABEL[pl.kind]}</span>
            <h2>{pl.name}</h2>
          </div>
        </div>

        <div className="pc-stats">
          <div><b>{walk ? (walk.m < 1000 ? `${Math.round(walk.m / 10) * 10} m` : `${(walk.m / 1000).toFixed(1)} km`) : '—'}</b><span>{walk ? `${walk.min} min walk` : 'Distance'}</span></div>
          <div><b>{walk ? walk.steps.toLocaleString() : '—'}</b><span>Steps</span></div>
          <div className={collected ? 'ok' : 'gold'}><b>{collected ? '✓' : `+${pl.coins}`}</b><span>{collected ? 'Collected' : 'Points'}</span></div>
          <div><b>{inside.length}</b><span>Places inside</span></div>
        </div>

        <p className="pc-about">{shortAbout(info?.about) || pl.fact}</p>
        {info?.about && <p className="pc-fact">💡 {pl.fact}</p>}

        {pl.eats?.length ? <>
          <h3>Our picks</h3>
          <div className="pc-picks">{pl.eats.map((e) => <span key={e.name} className="pc-pick"><b>{e.name}</b><small>{e.food}</small></span>)}</div>
        </> : null}

        {inside.length > 0 && <>
          <h3>Inside {pl.short}</h3>
          <div className="pc-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => { setTab('all'); setMore(false); }}>All {inside.length}</button>
            {counts.map(([k, n]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setMore(false); }}>{POI_ICON[k]} {POI_LABEL[k]} {n}</button>)}
          </div>
          <ul className="pc-list">{shown.map((x) => (
            <li key={x.n + x.lat}><button onClick={() => onPoi(x)}>
              <span className={`pc-dot ${x.k}`}>{POI_ICON[x.k]}</span>
              <span className="pc-name"><b>{x.n}</b>{x.c && <small>{x.c}</small>}</span>
              {booked(x) && <span className="pc-lock">🔒 Event</span>}
              <span aria-hidden className="pc-go">›</span>
            </button></li>
          ))}</ul>
          {list.length > shown.length && <button className="btn ghost small" onClick={() => setMore(true)}>Show all {list.length}</button>}
        </>}

        <div className="pc-actions">
          <a className="btn primary big" href={mapsLink(pl.id)} target="_blank" rel="noreferrer">🧭 Walk there</a>
          {canCollect && <button className="btn gold big pop" onClick={onCollect}>🪙 Collect +{pl.coins}</button>}
        </div>
        <div className="pc-plan"><AddToPlan p={p} title={`${pl.icon} Visit ${pl.short}`} note={pl.name} onAdd={(i) => { addPlan({ ...i, place: pl.id }); onClose(); }} /></div>
        {info && <p className="pc-credit">
          {info.file && <>Photo: <a href={info.file} target="_blank" rel="noreferrer">{info.credit || 'Wikimedia Commons'}</a> · {info.license}. </>}
          {info.src && <>Text: <a href={info.src} target="_blank" rel="noreferrer">Wikipedia</a> (CC BY-SA).</>}
        </p>}
      </div>
    </div>
  );
}
