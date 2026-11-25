import { useEffect, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MlMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { PLACES, type Place } from '../data/places';
import { POI_ICON, type Poi, type PoiKind, type World } from '../data/world';

interface Props {
  world?: World;
  me: { lat: number; lng: number; acc: number; hdg?: number | null } | null;
  nick: string;
  collected: Set<string>;
  focus: Place;
  next?: { place: Place; title: string };
  kinds: Set<PoiKind>;
  onPick: (p: Place) => void;
  onPoi: (p: Poi) => void;
}

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/** A real street map with the same gestures as Google Maps: drag, pinch, twist to rotate, two-finger drag to tilt. */
export default function RealMap({ world, me, nick, collected, focus, next, kinds, onPick, onPoi }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | undefined>(undefined);
  const meMark = useRef<maplibregl.Marker | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [follow, setFollow] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [tilt, setTilt] = useState(false);
  const cb = useRef({ onPick, onPoi, world });
  cb.current = { onPick, onPoi, world };

  useEffect(() => {
    const m = new maplibregl.Map({
      container: box.current!, style: STYLE, center: [focus.lng, focus.lat], zoom: 15.2, pitch: 0,
      minZoom: 9.5, maxZoom: 19.5, maxPitch: 70, attributionControl: { compact: true },
    });
    map.current = m;
    m.touchZoomRotate.enableRotation();
    m.on('rotate', () => setBearing(m.getBearing()));
    m.on('pitchend', () => setTilt(m.getPitch() > 10));
    const stop = (e: { originalEvent?: unknown }) => { if (e.originalEvent) setFollow(false); };
    m.on('dragstart', stop); m.on('rotatestart', stop);
    m.on('load', () => {
      m.addSource('pois', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'poi-dot', type: 'circle', source: 'pois', minzoom: 15,
        paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 15, 4, 18, 8], 'circle-color': ['match', ['get', 'k'], 'food', '#f97316', 'shop', '#8b5cf6', 'partner', '#0ea5e9', '#eab308'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
      m.addLayer({ id: 'poi-name', type: 'symbol', source: 'pois', minzoom: 17,
        layout: { 'text-field': ['concat', ['get', 'i'], ' ', ['get', 'n']], 'text-size': 12, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-font': ['Noto Sans Regular'], 'text-max-width': 9 },
        paint: { 'text-color': '#1f2937', 'text-halo-color': '#fff', 'text-halo-width': 1.5 } });
      m.on('click', 'poi-dot', (e) => {
        const f = e.features?.[0]; const x = f && cb.current.world?.pois[Number(f.properties?.ix)];
        if (x) cb.current.onPoi(x);
      });
      m.on('mouseenter', 'poi-dot', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'poi-dot', () => { m.getCanvas().style.cursor = ''; });
      setReady(true);
    });
    return () => { m.remove(); map.current = undefined; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // places as tappable name pins
  useEffect(() => {
    const m = map.current; if (!m) return;
    const marks = PLACES.map((pl) => {
      const el = document.createElement('button');
      el.className = `rm-pin${collected.has(pl.id) ? ' got' : ''}${next?.place.id === pl.id ? ' next' : ''}`;
      el.innerHTML = `<span class="rm-ico">${pl.icon}</span><span class="rm-name">${pl.short}</span>`;
      el.setAttribute('aria-label', pl.name);
      el.onclick = (e) => { e.stopPropagation(); cb.current.onPick(pl); };
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([pl.lng, pl.lat]).addTo(m);
    });
    return () => marks.forEach((x) => x.remove());
  }, [collected, next?.place.id]);

  useEffect(() => {
    const src = ready && (map.current?.getSource('pois') as GeoJSONSource | undefined);
    if (!src || !world) return;
    src.setData({ type: 'FeatureCollection', features: world.pois.map((x, ix) => ({ x, ix })).filter(({ x }) => kinds.has(x.k)).map(({ x, ix }) => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [x.lng, x.lat] }, properties: { n: x.n, k: x.k, i: POI_ICON[x.k], ix },
    })) });
  }, [ready, world, kinds]);

  // GPS dot: moves on its own, the camera only moves when following
  useEffect(() => {
    const m = map.current; if (!m) return;
    if (!me) { meMark.current?.remove(); meMark.current = undefined; return; }
    if (!meMark.current) {
      const el = document.createElement('div'); el.className = 'rm-me';
      el.innerHTML = '<i class="rm-cone"></i><b></b><span></span>';
      meMark.current = new maplibregl.Marker({ element: el, rotationAlignment: 'map' }).setLngLat([me.lng, me.lat]).addTo(m);
    }
    const el = meMark.current.getElement();
    (el.querySelector('span') as HTMLElement).textContent = nick;
    (el.querySelector('.rm-cone') as HTMLElement).style.display = me.hdg == null ? 'none' : '';
    meMark.current.setLngLat([me.lng, me.lat]).setRotation(me.hdg ?? 0);
    if (follow) m.easeTo({ center: [me.lng, me.lat], duration: 600 });
  }, [me, nick, follow]);

  const backToMe = () => {
    const m = map.current; if (!m || !me) return;
    setFollow(true); m.easeTo({ center: [me.lng, me.lat], zoom: Math.max(m.getZoom(), 16.5), duration: 900 });
  };
  const toggleTilt = () => { const m = map.current; if (!m) return; const on = m.getPitch() < 10; m.easeTo({ pitch: on ? 60 : 0, duration: 600 }); setTilt(on); };

  return (
    <div className="rmap">
      <div ref={box} className="rmap-gl" />
      <div className="rm-ctl">
        <button aria-label="Zoom in" onClick={() => map.current?.zoomIn()}>+</button>
        <button aria-label="Zoom out" onClick={() => map.current?.zoomOut()}>−</button>
        <button aria-label="North up" title="North up" onClick={() => map.current?.easeTo({ bearing: 0, pitch: 0 })}>
          <span className="rm-needle" style={{ transform: `rotate(${-bearing}deg)` }}>▲</span>
        </button>
        <button aria-label={tilt ? 'Flat view' : '3D view'} aria-pressed={tilt} className={tilt ? 'on' : ''} onClick={toggleTilt}>{tilt ? '2D' : '3D'}</button>
      </div>
      {me && <button className={`rm-loc ${follow ? 'on' : ''}`} aria-pressed={follow} aria-label="Back to me" onClick={backToMe}>{follow ? '◉' : '◎'}</button>}
    </div>
  );
}
