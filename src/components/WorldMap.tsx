import { useEffect, useMemo, useRef, useState } from 'react';
import type { Avatar } from '../types';
import { BOUNDS, PLACES, STRIP_ROAD, distanceM, type Place } from '../data/places';
import { POI_ICON, bearing, compass, fromM, toM, type Poi, type PoiKind, type World } from '../data/world';
import Hero from './Hero';

type LL = { lat: number; lng: number };
const ZOOMS = [0.35, 0.6, 1, 1.6, 2.6]; // screen px per metre
const SHOW_POI = 0.6, SHOW_POI_LABEL = 1.6;

interface Props {
  world?: World;
  me?: (LL & { hdg?: number | null }) | null;
  avatar: Avatar;
  nick?: string;
  collected: Set<string>;
  focus: LL;
  next?: { place: Place; title: string };
  kinds: Set<PoiKind>;
  booked: (p: Poi) => boolean;
  onPick: (p: Place) => void;
  onPoi: (p: Poi) => void;
}

const centroid = (r: [number, number][]) => ({ lat: r.reduce((a, p) => a + p[0], 0) / r.length, lng: r.reduce((a, p) => a + p[1], 0) / r.length });
const fmt = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1609).toFixed(1)} mi`);

/** Close-up "adventure" map that follows the hero, with a mini-map of the whole Strip in the corner. */
export default function WorldMap({ world, me, avatar, nick, collected, focus, next, kinds, booked, onPick, onPoi }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 480 });
  const [zi, setZi] = useState(3);
  const [center, setCenter] = useState<LL>(me ?? focus);
  const [follow, setFollow] = useState(true);
  const drag = useRef<{ x: number; y: number; c: LL; moved: boolean } | null>(null);
  const last = useRef<LL | null>(null);
  const [walkHdg, setWalkHdg] = useState<number>();
  const [rot, setRot] = useState(0); // map turn in degrees; 0 = north up
  const touch = useRef(new Map<number, { x: number; y: number }>());
  const twist = useRef<{ a: number; d: number; r: number; zi: number } | null>(null);
  const z = ZOOMS[zi];

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // follow the hero (or the hotel when there is no GPS) until the player drags the map
  const target = me ?? focus;
  // calm follow: the map only moves when the hero walks out of the middle of the screen
  useEffect(() => {
    if (!follow) return;
    setCenter((c) => {
      const m = toM(c, target.lat, target.lng), zone = (Math.min(size.w, size.h) * 0.22) / z;
      return Math.hypot(m.x, m.y) > zone || !me ? { lat: target.lat, lng: target.lng } : c;
    });
  }, [follow, target.lat, target.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const backToMe = () => { setFollow(true); setCenter({ lat: target.lat, lng: target.lng }); };

  // heading: the phone compass/GPS course if it has one, else the way you walked, else toward the next stop
  useEffect(() => {
    if (!me) return;
    const prev = last.current;
    if (!prev || distanceM(prev, me) > 8) {
      if (prev) setWalkHdg(bearing(prev, me));
      last.current = { lat: me.lat, lng: me.lng };
    }
  }, [me]);
  const hdg = me?.hdg != null && !Number.isNaN(me.hdg) ? me.hdg : walkHdg ?? (me && next ? bearing(me, next.place) : undefined);

  const rc = Math.cos((rot * Math.PI) / 180), rs = Math.sin((rot * Math.PI) / 180);
  const P = (lat: number, lng: number) => { const m = toM(center, lat, lng); return { x: (m.x * rc - m.y * rs) * z, y: (m.x * rs + m.y * rc) * z }; };
  const pts = (r: [number, number][]) => r.map(([a, b]) => { const p = P(a, b); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
  const inView = (x: number, y: number, pad = 40) => Math.abs(x) < size.w / 2 + pad && Math.abs(y) < size.h / 2 + pad;

  const two = () => { const [a, b] = [...touch.current.values()]; return { a: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI, d: Math.hypot(b.x - a.x, b.y - a.y) }; };
  const onDown = (e: React.PointerEvent) => {
    touch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touch.current.size === 2) { const t = two(); twist.current = { a: t.a, d: t.d, r: rot, zi }; if (drag.current) drag.current.moved = true; return; }
    drag.current = { x: e.clientX, y: e.clientY, c: center, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    if (touch.current.has(e.pointerId)) touch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (twist.current && touch.current.size === 2) {
      const t = two(), s0 = twist.current, step = Math.round(Math.log(t.d / s0.d) / Math.log(1.6));
      setRot((((s0.r + t.a - s0.a) % 360) + 360) % 360);
      setZi(Math.max(0, Math.min(ZOOMS.length - 1, s0.zi + step)));
      return;
    }
    const d = drag.current;
    if (!d || twist.current) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    if (!d.moved) (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    d.moved = true;
    setFollow(false);
    // screen drag -> map metres, undoing the map turn
    const mx = (dx * rc + dy * rs) / z, my = (-dx * rs + dy * rc) / z;
    setCenter(fromM(d.c, -mx, -my));
  };
  const onUp = (e: React.PointerEvent) => {
    touch.current.delete(e.pointerId);
    if (touch.current.size < 2) twist.current = null;
    setTimeout(() => { if (!touch.current.size) drag.current = null; }, 0);
  };
  const tap = (fn: () => void) => () => { if (!drag.current?.moved) fn(); };

  // POIs on screen, with labels that never overlap
  const pois = useMemo(() => {
    if (!world || z < SHOW_POI) return [];
    const boxes: [number, number, number, number][] = [];
    return world.pois.filter((p) => kinds.has(p.k)).map((p) => ({ p, ...P(p.lat, p.lng) })).filter((q) => inView(q.x, q.y)).map((q) => {
      let label = false;
      if (z >= SHOW_POI_LABEL) {
        const w = Math.min(q.p.n.length, 18) * 5.6 + 6, b: [number, number, number, number] = [q.x - w / 2, q.y + 10, q.x + w / 2, q.y + 22];
        label = !boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
        if (label) boxes.push(b);
      }
      return { ...q, label };
    });
  }, [world, z, center, size, kinds]); // eslint-disable-line react-hooks/exhaustive-deps

  const road = pts(STRIP_ROAD);
  const mePt = me ? P(me.lat, me.lng) : null;
  const nextPt = next ? P(next.place.lat, next.place.lng) : null;
  const nextOff = nextPt && !inView(nextPt.x, nextPt.y, -30);
  const edge = nextPt && nextOff ? (() => {
    const a = Math.atan2(nextPt.y, nextPt.x), hw = size.w / 2 - 26, hh = size.h / 2 - 26;
    const k = Math.min(hw / Math.abs(Math.cos(a) || 1e-6), hh / Math.abs(Math.sin(a) || 1e-6));
    return { x: Math.cos(a) * k, y: Math.sin(a) * k, deg: (a * 180) / Math.PI };
  })() : null;
  const from = me ?? center;
  const meOff = mePt && !inView(mePt.x, mePt.y, -30);
  const meEdge = mePt && meOff ? (() => {
    const a = Math.atan2(mePt.y, mePt.x), hw = size.w / 2 - 30, hh = size.h / 2 - 30;
    const k = Math.min(hw / Math.abs(Math.cos(a) || 1e-6), hh / Math.abs(Math.sin(a) || 1e-6));
    return { x: Math.cos(a) * k, y: Math.sin(a) * k, deg: (a * 180) / Math.PI };
  })() : null;

  return (
    <div className="map-wrap">
      <div className="wmap" ref={box} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onWheel={(e) => setZi((i) => Math.max(0, Math.min(ZOOMS.length - 1, i + (e.deltaY < 0 ? 1 : -1))))}>
        <svg viewBox={`${-size.w / 2} ${-size.h / 2} ${size.w} ${size.h}`} width={size.w} height={size.h} className="map" role="img" aria-label="Close-up map around your hero">
          <defs>
            <pattern id="sand" width="24" height="24" patternUnits="userSpaceOnUse">
              <rect width="24" height="24" fill="#ecd9a8" /><circle cx="5" cy="5" r="1.6" fill="#d9bf85" /><circle cx="17" cy="16" r="1.6" fill="#d9bf85" /><circle cx="19" cy="4" r="1" fill="#f6ead0" />
            </pattern>
          </defs>
          <rect x={-size.w / 2} y={-size.h / 2} width={size.w} height={size.h} fill="url(#sand)" />
          <polyline points={road} fill="none" stroke="#8a7c68" strokeWidth={Math.max(12, 30 * z) + 4} strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={road} fill="none" stroke="#b5a68e" strokeWidth={Math.max(12, 30 * z)} strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={road} fill="none" stroke="#d6c9b0" strokeWidth={Math.max(4, 8 * z)} strokeDasharray="6 10" />

          {world?.other.map((b, i) => {
            const c = centroid(b.g), cp = P(c.lat, c.lng);
            if (!inView(cp.x, cp.y, 300)) return null;
            return <g key={i}><polygon points={pts(b.g)} fill="#e2cfa6" stroke="#7a5f45" strokeWidth="1.5" />
              {z >= 1 && b.n && <text x={cp.x} y={cp.y} textAnchor="middle" className="bld-label">{b.n.replace(/ (Hotel|Resort).*$/, '').slice(0, 22)}</text>}</g>;
          })}

          {pois.map(({ p, x, y, label }) => (
            <g key={p.n + p.p + p.lat} className="poi" role="button" aria-label={`${p.n}${booked(p) ? ', booked for an event' : ''}`} onClick={tap(() => onPoi(p))}>
              <rect x={x - 10} y={y - 10} width="20" height="20" rx="5" fill={p.k === 'partner' ? '#ffe58a' : p.k === 'aws' ? '#ffc27a' : '#fffdf6'} stroke="#6f80ad" strokeWidth="2" />
              <text x={x} y={y + 5} textAnchor="middle" fontSize="12">{POI_ICON[p.k]}</text>
              {booked(p) && <text x={x + 10} y={y - 6} fontSize="10">🔒</text>}
              {label && <text x={x} y={y + 20} textAnchor="middle" className="poi-label">{p.n.length > 18 ? p.n.slice(0, 17) + '…' : p.n}</text>}
            </g>
          ))}

          {PLACES.map((pl) => {
            const rings = world?.fp[pl.id] ?? [];
            const c = P(pl.lat, pl.lng);
            if (!inView(c.x, c.y, 400)) return null;
            const got = collected.has(pl.id);
            const lab = { x: c.x, y: c.y };
            return (
              <g key={pl.id} className="pin" role="button" aria-label={`${pl.name}${got ? ', coins collected' : ''}`} onClick={tap(() => onPick(pl))}>
                {rings.map((r, i) => <polygon key={i} points={pts(r)} fill={pl.color} stroke="#5a4030" strokeWidth="2.5" opacity=".9" />)}
                {!rings.length && <circle cx={c.x} cy={c.y} r="12" fill={pl.color} stroke="#5a4030" strokeWidth="2.5" />}
                <text x={lab.x} y={lab.y + 6} textAnchor="middle" fontSize="18">{pl.icon}</text>
                <g transform={`translate(${lab.x} ${lab.y - 22})`}>
                  <rect x={-pl.short.length * 3.6 - 6} y="-9" width={pl.short.length * 7.2 + 12} height="15" rx="4" fill="rgba(44,36,56,.78)" />
                  <text y="2" textAnchor="middle" className="place-label">{pl.short.toUpperCase()}</text>
                </g>
                {got
                  ? <g><circle cx={lab.x + 19} cy={lab.y + 3} r="8" fill="#4fae5a" stroke="#fff" strokeWidth="2" /><path d={`M${lab.x + 15} ${lab.y + 3} l3 3 l5 -6`} stroke="#fff" strokeWidth="2" fill="none" /></g>
                  : <g className="coin-bob"><circle cx={lab.x + 19} cy={lab.y + 3} r="8" fill="#f6c445" stroke="#9a6b00" strokeWidth="2" /><text x={lab.x + 19} y={lab.y + 7} textAnchor="middle" fontSize="9" fontWeight="900" fill="#9a6b00">z</text></g>}
              </g>
            );
          })}

          {next && nextPt && !nextOff && <g transform={`translate(${nextPt.x} ${nextPt.y - 46})`} className="coin-bob"><path d="M-8 -8 h16 v8 h6 l-14 12 l-14 -12 h6 z" fill="#4a7fd8" stroke="#fff" strokeWidth="2" /></g>}
          {edge && (
            <g transform={`translate(${edge.x} ${edge.y}) rotate(${edge.deg})`} className="edge-arrow">
              <path d="M-14 -10 L14 0 L-14 10 L-8 0 Z" fill="#4a7fd8" stroke="#fff" strokeWidth="2.5" />
            </g>
          )}

          {mePt && (
            <g transform={`translate(${mePt.x} ${mePt.y})`} className="me">
              {hdg !== undefined && <path transform={`rotate(${hdg + rot})`} d="M0 -34 L9 -20 L-9 -20 Z" fill="#f6c445" stroke="#5a4030" strokeWidth="2" />}
              <ellipse cx="0" cy="10" rx="12" ry="4" fill="rgba(44,36,56,.3)" />
              <foreignObject x="-18" y="-36" width="36" height="48"><Hero a={avatar} size={60} /></foreignObject>
              {nick && <text y="26" textAnchor="middle" className="me-name">{nick}</text>}
            </g>
          )}
          {meEdge && (
            <g transform={`translate(${meEdge.x} ${meEdge.y})`} className="me-edge-svg" role="button" aria-label="Go back to me" onClick={tap(backToMe)}>
              <circle r="20" fill="#e2604e" stroke="#fff" strokeWidth="3" />
              <path transform={`rotate(${meEdge.deg})`} d="M-7 -8 L10 0 L-7 8 L-3 0 Z" fill="#fff" />
            </g>
          )}
        </svg>

        {!follow && <button className="back-me" onPointerDown={(e) => e.stopPropagation()} onClick={backToMe}>📍 {me ? 'Back to me' : 'Back to my hotel'}</button>}

        <MiniMap rot={rot} center={center} me={me} hdg={hdg} next={next?.place} view={{ w: size.w / z, h: size.h / z }} onJump={(c) => { setFollow(false); setCenter(c); }} />

        <div className="map-zoom" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={() => setZi((i) => Math.min(ZOOMS.length - 1, i + 1))} aria-label="Zoom in">＋</button>
          <button onClick={() => setZi((i) => Math.max(0, i - 1))} aria-label="Zoom out">－</button>
          <button onClick={() => setRot((r) => (r + 315) % 360)} aria-label="Turn left">⟲</button>
          <button onClick={() => setRot((r) => (r + 45) % 360)} aria-label="Turn right">⟳</button>
          <button onClick={() => setRot(0)} aria-label="Turn north up"><span className="needle" style={{ transform: `rotate(${rot}deg)` }}>🧭</span></button>
        </div>

        {next && (
          <div className="next-hint" onPointerDown={(e) => e.stopPropagation()}>
            <b>NEXT ▸</b> {next.title}<br />
            <span>{next.place.icon} {next.place.short} · {fmt(distanceM(from, next.place))} {compass(bearing(from, next.place))}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const MW = 84, MK = Math.cos((36.115 * Math.PI) / 180);
const MH = Math.round((MW * (BOUNDS.north - BOUNDS.south)) / ((BOUNDS.east - BOUNDS.west) * MK));
const mp = (lat: number, lng: number) => ({ x: ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * MW, y: ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * MH });
const mroad = STRIP_ROAD.map(([a, b]) => mp(a, b)).map((p) => `${p.x},${p.y}`).join(' ');
const PERM = MW / ((BOUNDS.east - BOUNDS.west) * 111320 * MK); // mini-map px per metre

export function MiniMap({ rot = 0, center, me, hdg, next, view, onJump }: { rot?: number; center: LL; me?: LL | null; hdg?: number; next?: Place; view: { w: number; h: number }; onJump: (c: LL) => void }) {
  const c = mp(center.lat, center.lng), m = me ? mp(me.lat, me.lng) : null, n = next ? mp(next.lat, next.lng) : null;
  const jump = (e: React.MouseEvent<SVGSVGElement>) => {
    // undo the mini-map turn to find the tapped spot
    const r = e.currentTarget.getBoundingClientRect(), a = (-rot * Math.PI) / 180;
    const sx = e.clientX - (r.left + r.width / 2), sy = e.clientY - (r.top + r.height / 2), sc = MW / (e.currentTarget as SVGSVGElement).clientWidth;
    const x = MW / 2 + (sx * Math.cos(a) - sy * Math.sin(a)) * sc, y = MH / 2 + (sx * Math.sin(a) + sy * Math.cos(a)) * sc;
    onJump({ lat: BOUNDS.north - (y / MH) * (BOUNDS.north - BOUNDS.south), lng: BOUNDS.west + (x / MW) * (BOUNDS.east - BOUNDS.west) });
  };
  return (
    <div className="minimap" onPointerDown={(e) => e.stopPropagation()}>
      <svg viewBox={`0 0 ${MW} ${MH}`} width={MW} height={MH} onClick={jump} style={{ transform: `rotate(${rot}deg)` }} role="img" aria-label="Mini-map of the whole Strip. Tap to jump there.">
        <rect width={MW} height={MH} fill="#ecd9a8" />
        <polyline points={mroad} fill="none" stroke="#a89a86" strokeWidth="4" strokeLinejoin="round" />
        {PLACES.map((p) => { const q = mp(p.lat, p.lng); return <rect key={p.id} x={q.x - 2.5} y={q.y - 2.5} width="5" height="5" fill={p.color} stroke="#5a4030" strokeWidth="1" />; })}
        {n && <path d={`M${n.x} ${n.y - 6} l2 4 h4 l-3 3 l1 4 l-4 -2 l-4 2 l1 -4 l-3 -3 h4 z`} fill="#4a7fd8" stroke="#fff" strokeWidth="1" />}
        <rect x={c.x - (view.w * PERM) / 2} y={c.y - (view.h * PERM) / 2} width={view.w * PERM} height={view.h * PERM} fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 2" />
        {m && <g transform={`translate(${m.x} ${m.y})`}>
          {hdg !== undefined && <path transform={`rotate(${hdg})`} d="M0 -9 L4 -2 L-4 -2 Z" fill="#f6c445" stroke="#5a4030" strokeWidth="1" />}
          <circle r="3.5" fill="#e2604e" stroke="#fff" strokeWidth="1.5" />
        </g>}
        <text x={MW - 8} y="12" textAnchor="middle" className="mini-n" transform={`rotate(${-rot} ${MW - 8} 8)`}>N</text>
      </svg>
      <small>{hdg !== undefined ? `Heading ${compass(hdg)}` : 'Whole Strip'}</small>
    </div>
  );
}
