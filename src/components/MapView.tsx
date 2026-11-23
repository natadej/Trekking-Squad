import { useEffect, useMemo, useRef, useState } from 'react';
import type { Avatar } from '../types';
import { BOUNDS, PLACES, STRIP_ROAD, type Place } from '../data/places';
import Hero from './Hero';

const W = 400;
const KM_LAT = 111.32, KM_LNG = 111.32 * Math.cos((36.115 * Math.PI) / 180);
const H = Math.round((W * ((BOUNDS.north - BOUNDS.south) * KM_LAT)) / ((BOUNDS.east - BOUNDS.west) * KM_LNG));

export const project = (lat: number, lng: number) => ({
  x: ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * W,
  y: ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * H,
});

const SHAPE: Record<Place['kind'], (x: number, y: number, r: number, fill: string) => React.ReactNode> = {
  hotel: (x, y, r, f) => <g><rect x={x - r} y={y - r} width={r * 2} height={r * 2} fill={f} /><path d={`M${x - r} ${y - r / 3} h${r * 2} M${x - r} ${y + r / 3} h${r * 2}`} strokeWidth="1" opacity=".5" /></g>,
  venue: (x, y, r, f) => <path d={star(x, y, r * 1.35, r * 0.7)} fill={f} />,
  fun: (x, y, r, f) => <circle cx={x} cy={y} r={r} fill={f} />,
  airport: (x, y, r, f) => <path d={`M${x} ${y - r * 1.2} L${x + r * 1.2} ${y} L${x} ${y + r * 1.2} L${x - r * 1.2} ${y} Z`} fill={f} />,
};

function star(cx: number, cy: number, R: number, r: number) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }
  return d + 'Z';
}

interface Props {
  focus?: string;
  me?: { lat: number; lng: number } | null;
  avatar: Avatar;
  collected: Set<string>;
  highlight?: string[];
  onPick: (p: Place) => void;
}

export default function MapView({ focus, me, avatar, collected, highlight = [], onPick }: Props) {
  const [zoom, setZoom] = useState(1.8);
  const box = useRef<HTMLDivElement>(null);
  const center = (lat: number, lng: number) => {
    const el = box.current;
    if (!el) return;
    const { x, y } = project(lat, lng);
    const k = el.scrollWidth / W;
    el.scrollTo({ left: x * k - el.clientWidth / 2, top: y * k - el.clientHeight / 2 });
  };
  const target = PLACES.find((p) => p.id === focus) || PLACES.find((p) => p.id === 'venetian')!;
  useEffect(() => { center(me?.lat ?? target.lat, me?.lng ?? target.lng); }, [zoom, target.id, !!me]); // eslint-disable-line react-hooks/exhaustive-deps
  const road = useMemo(() => STRIP_ROAD.map(([la, ln]) => project(la, ln)).map((p) => `${p.x},${p.y}`).join(' '), []);
  const mePt = me && me.lat < BOUNDS.north && me.lat > BOUNDS.south && me.lng > BOUNDS.west && me.lng < BOUNDS.east ? project(me.lat, me.lng) : null;
  const plan = highlight.map((id) => PLACES.find((p) => p.id === id)).filter(Boolean) as Place[];
  const route = plan.map((p) => project(p.lat, p.lng)).map((p) => `${p.x},${p.y}`).join(' ');
  const airport = PLACES.find((p) => p.id === 'airport')!;
  const ap = project(airport.lat, airport.lng);

  return (
    <div className="map-wrap">
      <div className="map-zoom">
        <button onClick={() => setZoom((z) => Math.min(4, z + 0.5))} aria-label="Zoom in">＋</button>
        <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label="Zoom out">－</button>
      </div>
      <div className="map-scroll" ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} width={`${zoom * 100}%`} className="map" shapeRendering="crispEdges" role="img" aria-label="Cartoon map of the Las Vegas Strip">
          <defs>
            <pattern id="sand" width="24" height="24" patternUnits="userSpaceOnUse">
              <rect width="24" height="24" fill="#f8d878" />
              <rect x="4" y="4" width="3" height="3" fill="#e8b850" />
              <rect x="16" y="15" width="3" height="3" fill="#e8b850" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#sand)" />
          {/* mountains */}
          {[[20, 40], [60, 20], [30, 330], [16, 600]].map(([x, y], i) => (
            <path key={i} d={`M${x - 28} ${y + 30} v-8 h8 v-8 h8 v-8 h8 v-6 h8 v6 h8 v8 h8 v8 h8 v8 Z`} fill="#c84c0c" stroke="#1a1028" strokeWidth="2" />
          ))}
          {/* I-15 */}
          <path d={`M${W * 0.08} ${H} C ${W * 0.2} ${H * 0.6}, ${W * 0.22} ${H * 0.3}, ${W * 0.4} 0`} fill="none" stroke="#8c8c8c" strokeWidth="14" />
          <text x={W * 0.15} y={H * 0.72} className="map-road-label">I-15</text>
          {/* runways */}
          <g transform={`translate(${ap.x + 20} ${ap.y + 10}) rotate(-12)`}>
            <rect x="-40" y="-6" width="110" height="12" rx="3" fill="#94a3b8" />
            <rect x="-30" y="16" width="100" height="12" rx="3" fill="#94a3b8" />
          </g>
          {/* the Strip */}
          <polyline points={road} fill="none" stroke="#3c3c3c" strokeWidth="18" strokeLinecap="square" strokeLinejoin="miter" />
          <polyline points={road} fill="none" stroke="#fde047" strokeWidth="2" strokeDasharray="10 10" />
          <text transform={`translate(${project(36.108, -115.1735).x - 6} ${project(36.108, -115.1735).y}) rotate(-90)`} className="map-road-label">LAS VEGAS BLVD · THE STRIP</text>
          {/* planned route */}
          {plan.length > 1 && <polyline points={route} fill="none" stroke="#2563eb" strokeWidth="4" strokeDasharray="2 8" strokeLinecap="round" />}

          {PLACES.map((p) => {
            const { x, y } = project(p.lat, p.lng);
            const got = collected.has(p.id);
            const r = p.kind === 'hotel' || p.kind === 'venue' ? 13 : 11;
            return (
              <g key={p.id} className="pin" onClick={() => onPick(p)} role="button" aria-label={`${p.name}${got ? ', coins collected' : ''}`}>
                <g stroke="#2b2140" strokeWidth="2.5">{SHAPE[p.kind](x, y, r, p.color)}</g>
                <text x={x} y={y + 5} textAnchor="middle" fontSize="14">{p.icon}</text>
                {got
                  ? <g><circle cx={x + r} cy={y - r} r="7" fill="#22c55e" stroke="#fff" strokeWidth="2" /><path d={`M${x + r - 3.5} ${y - r} l2.5 2.5 l4.5 -4.5`} stroke="#fff" strokeWidth="2" fill="none" /></g>
                  : <g className="coin-bob"><circle cx={x + r} cy={y - r} r="7" fill="#facc15" stroke="#a16207" strokeWidth="2" /><text x={x + r} y={y - r + 3.5} textAnchor="middle" fontSize="9" fontWeight="900" fill="#a16207">$</text></g>}
                <text x={x} y={y + r + 12} textAnchor="middle" className="pin-label">{p.short}</text>
              </g>
            );
          })}

          {mePt && (
            <g transform={`translate(${mePt.x - 15} ${mePt.y - 50})`} className="me">
              <circle cx="15" cy="48" r="10" fill="rgba(37,99,235,.25)" />
              <foreignObject width="30" height="50"><Hero a={avatar} size={50} /></foreignObject>
            </g>
          )}
        </svg>
      </div>
      <div className="map-legend" aria-label="Map key">
        <span><svg width="16" height="16"><rect x="2" y="2" width="12" height="12" fill="#fbbf24" stroke="#2b2140" strokeWidth="2" /></svg> Hotel</span>
        <span><svg width="16" height="16"><path d={star(8, 8, 8, 4)} fill="#fb923c" stroke="#2b2140" strokeWidth="1.5" /></svg> re:Invent venue</span>
        <span><svg width="16" height="16"><circle cx="8" cy="8" r="6" fill="#f472b6" stroke="#2b2140" strokeWidth="2" /></svg> Fun spot</span>
        <span><svg width="16" height="16"><circle cx="8" cy="8" r="6" fill="#facc15" stroke="#a16207" strokeWidth="2" /></svg> Coins to get</span>
        <span><svg width="16" height="16"><circle cx="8" cy="8" r="6" fill="#22c55e" /><path d="M5 8 l2 2 l4 -4" stroke="#fff" strokeWidth="2" fill="none" /></svg> Got it!</span>
      </div>
    </div>
  );
}
