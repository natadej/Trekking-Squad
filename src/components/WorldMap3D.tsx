import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { Avatar } from '../types';
import { PLACES, STRIP_ROAD, distanceM, type Place } from '../data/places';
import { POI_ICON, bearing, compass, fromM, toM, type Poi, type PoiKind, type World } from '../data/world';
import { MiniMap } from './WorldMap';
import { O, PODIUM, buildWorld, makeAvatar, markTex, topOf, v3, type LL } from './scene3d';

interface Props {
  world: World;
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
type Light = 'auto' | 'day' | 'night';
const FOV = 50, PITCH_MIN = 0.35, PITCH_MAX = 1.35, WALK = 28;
const vegasHour = () => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
const isNight = (l: Light) => (l === 'auto' ? vegasHour() >= 17 || vegasHour() < 7 : l === 'night');
/** Nearest Strip sidewalk to a point, so the character starts outside, not inside a hotel. */
function curb(ll: LL) {
  const p = v3(ll); let best = p.clone(), bd = Infinity;
  for (let i = 1; i < STRIP_ROAD.length; i++) {
    const a = v3({ lat: STRIP_ROAD[i - 1][0], lng: STRIP_ROAD[i - 1][1] }), b = v3({ lat: STRIP_ROAD[i][0], lng: STRIP_ROAD[i][1] });
    const ab = b.clone().sub(a), t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1), q = a.addScaledVector(ab, t), d = q.distanceTo(p);
    if (d < bd) { bd = d; best = q.addScaledVector(p.clone().sub(q).normalize(), 27); }
  }
  return bd < 700 ? best : p;
}
const QKEY = 'vq.3d.quality', LKEY = 'vq.3d.light';

export default function WorldMap3D(props: Props) {
  const { world, me, avatar, nick, focus, next, onPick } = props;
  const box = useRef<HTMLDivElement>(null);
  const P = useRef(props);
  const tagEl = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLElement>(null);
  const joy = useRef({ x: 0, y: 0, on: false });
  const labelEls = useRef<Record<string, HTMLButtonElement | null>>({});
  const poiEls = useRef<Record<string, HTMLButtonElement | null>>({});
  const cam = useRef({ yaw: 0, pitch: 0.85, dist: 260, target: me ? v3(me) : curb(focus), follow: true, pos: me ? v3(me) : curb(focus), face: Math.PI });
  const [follow, setFollow] = useState(true);
  const [pois, setPois] = useState<Poi[]>([]);
  const [view, setView] = useState({ c: me ?? focus, hero: me ?? focus, w: 600, h: 600 });
  const [failed, setFailed] = useState(false);
  const [hq, setHq] = useState(() => localStorage.getItem(QKEY) !== 'low');
  const [light, setLight] = useState<Light>(() => (localStorage.getItem(LKEY) as Light) || 'auto');
  const lightRef = useRef(light);
  useEffect(() => { P.current = props; });
  useEffect(() => { lightRef.current = light; localStorage.setItem(LKEY, light); }, [light]);
  useEffect(() => { localStorage.setItem(QKEY, hq ? 'high' : 'low'); }, [hq]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, hq ? 2 : 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = hq; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#d6e6f7', 1500, 7000);
    const hemi = new THREE.HemisphereLight('#dbeeff', '#c9a36a', 0.9);
    const sun = new THREE.DirectionalLight('#fff1d6', 2.6); sun.castShadow = hq; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004;
    Object.assign(sun.shadow.camera, { left: -450, right: 450, top: 450, bottom: -450, far: 3000 });
    scene.add(hemi, sun, sun.target);
    const camera = new THREE.PerspectiveCamera(FOV, 1, 2, 25000);
    const W = buildWorld(scene, world, renderer, sun, hemi);
    let night = isNight(lightRef.current); W.setNight(night);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.4, 0.85);
    composer.addPass(bloom); composer.addPass(new OutputPass());
    const setBloom = () => { bloom.enabled = hq; bloom.strength = night ? 0.55 : 0.15; bloom.threshold = night ? 0.75 : 0.95; renderer.toneMappingExposure = night ? 0.8 : 0.9; };
    setBloom();

    const hero = makeAvatar(P.current.avatar); scene.add(hero.g);
    const coinGeo = new THREE.CylinderGeometry(9, 9, 2.5, 32), coinMat = new THREE.MeshStandardMaterial({ color: '#f6c445', metalness: 0.9, roughness: 0.25, emissive: '#7a5200', emissiveIntensity: 0.5 });
    const coins = PLACES.map((pl) => { const m = new THREE.Mesh(coinGeo, coinMat); m.rotation.x = Math.PI / 2; m.position.copy(v3(pl, topOf(pl.id) + 34)); m.userData.id = pl.id; scene.add(m); return m; });
    const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex(), depthTest: false })); mark.scale.set(30, 60, 1); scene.add(mark);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 600, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.22, depthWrite: false })); scene.add(pillar);
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.5, 6, 40), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.9 })); ring.rotation.x = -Math.PI / 2; scene.add(ring);

    let w = 1, h = 1;
    const ro = new ResizeObserver(() => { w = el.clientWidth; h = el.clientHeight; renderer.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); });
    ro.observe(el);

    // drag pans, two fingers pinch-zoom + twist + tilt, tap opens a building
    const pts = new Map<number, { x: number; y: number }>();
    let start: { x: number; y: number; moved: boolean } | null = null, pinch: { d: number; a: number; my: number } | null = null;
    const C = cam.current;
    const unfollow = () => { if (C.follow) { C.follow = false; setFollow(false); } };
    const pan = (dx: number, dy: number) => {
      const k = (2 * C.dist * Math.tan((FOV * Math.PI) / 360)) / h;
      const right = new THREE.Vector3(Math.cos(C.yaw), 0, -Math.sin(C.yaw)), fwd = new THREE.Vector3(-Math.sin(C.yaw), 0, -Math.cos(C.yaw));
      C.target.addScaledVector(right, -dx * k).addScaledVector(fwd, (dy * k) / Math.sin(C.pitch));
      C.target.x = THREE.MathUtils.clamp(C.target.x, -4000, 4000); C.target.z = THREE.MathUtils.clamp(C.target.z, -5000, 5000);
      unfollow();
    };
    const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x), my: (a.y + b.y) / 2 }; };
    const down = (e: PointerEvent) => { if (e.target !== renderer.domElement) return; el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 1) start = { x: e.clientX, y: e.clientY, moved: false }; else { pinch = two(); if (start) start.moved = true; } };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pts.size >= 2 && pinch) {
        const n = two();
        C.dist = THREE.MathUtils.clamp(C.dist * (pinch.d / n.d), 40, 4000); C.yaw -= n.a - pinch.a;
        C.pitch = THREE.MathUtils.clamp(C.pitch + (n.my - pinch.my) * 0.004, PITCH_MIN, PITCH_MAX); pinch = n; return;
      }
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) start.moved = true;
      if (start?.moved) { if (e.shiftKey || e.buttons === 2) { C.yaw -= dx * 0.006; C.pitch = THREE.MathUtils.clamp(C.pitch + dy * 0.004, PITCH_MIN, PITCH_MAX); } else pan(dx, dy); }
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
      if (pts.size === 0 && start && !start.moved) {
        const r = el.getBoundingClientRect(), ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / w) * 2 - 1, -((e.clientY - r.top) / h) * 2 + 1), camera);
        let o: THREE.Object3D | null = ray.intersectObjects(W.pick, true)[0]?.object ?? null;
        while (o && !o.userData.place) o = o.parent;
        const pl = PLACES.find((x) => x.id === o?.userData.place);
        if (pl) P.current.onPick(pl);
      }
      if (pts.size === 0) start = null;
    };
    const wheel = (e: WheelEvent) => { e.preventDefault(); C.dist = THREE.MathUtils.clamp(C.dist * (e.deltaY > 0 ? 1.12 : 0.89), 40, 4000); };
    const ctx = (e: Event) => e.preventDefault();
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false }); el.addEventListener('contextmenu', ctx);

    const anchors = Object.fromEntries(PLACES.map((pl) => [pl.id, v3(pl, topOf(pl.id) + 16)]));
    const tmp = new THREE.Vector3(), headV = new THREE.Vector3();
    type R = { l: number; t: number; r: number; b: number };
    const place = (node: HTMLElement | null | undefined, v: THREE.Vector3, maxD = 1e9, taken?: R[]) => {
      if (!node) return;
      tmp.copy(v).project(camera);
      const d = camera.position.distanceTo(v);
      if (tmp.z > 1 || d > maxD || Math.abs(tmp.x) > 1.2 || Math.abs(tmp.y) > 1.2) { node.style.display = 'none'; return; }
      const sx = ((tmp.x + 1) / 2) * w, sy = ((1 - tmp.y) / 2) * h;
      if (node.offsetWidth) { node.dataset.w = String(node.offsetWidth); node.dataset.h = String(node.offsetHeight); }
      const bw = Number(node.dataset.w) || 80, bh = Number(node.dataset.h) || 20, rc = { l: sx - bw / 2 - 2, r: sx + bw / 2 + 2, t: sy - bh - 2, b: sy + 2 };
      if (taken) {
        if (taken.some((o) => rc.l < o.r && rc.r > o.l && rc.t < o.b && rc.b > o.t)) { node.style.display = 'none'; return; }
        taken.push(rc);
      }
      node.style.display = '';
      node.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
    };
    const heroRect = (): R => {
      tmp.copy(C.pos).project(camera); const fx = ((tmp.x + 1) / 2) * w, fy = ((1 - tmp.y) / 2) * h;
      tmp.copy(headV).project(camera); const hy = ((1 - tmp.y) / 2) * h, half = Math.max(14, (fy - hy) * 0.3);
      return { l: fx - half, r: fx + half, t: hy - 26, b: fy };
    };
    let ctrl: R[] = [];
    const readCtrl = () => {
      const o = el.getBoundingClientRect();
      ctrl = [...el.querySelectorAll('.minimap, .wmini, .joy, .map-zoom, .m3-toggle, .next-hint')].map((n) => { const r = n.getBoundingClientRect(); return { l: r.left - o.left, r: r.right - o.left, t: r.top - o.top, b: r.bottom - o.top }; });
    };
    const last = { t: performance.now(), poi: 0, key: '' };
    let raf = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (t - last.t) / 1000); last.t = t;
      const p = P.current;
      const n = isNight(lightRef.current);
      if (n !== night) { night = n; W.setNight(n); setBloom(); }
      // move the character: GPS when available, otherwise the on-screen joystick
      const before = C.pos.clone();
      const J = joy.current;
      if (p.me) C.pos.lerp(v3(p.me), Math.min(1, dt * 3));
      else if (J.on && Math.hypot(J.x, J.y) > 0.08) {
        const right = new THREE.Vector3(Math.cos(C.yaw), 0, -Math.sin(C.yaw)), fwd = new THREE.Vector3(-Math.sin(C.yaw), 0, -Math.cos(C.yaw));
        C.pos.addScaledVector(right, J.x * WALK * dt).addScaledVector(fwd, -J.y * WALK * dt);
        C.pos.x = THREE.MathUtils.clamp(C.pos.x, -4000, 4000); C.pos.z = THREE.MathUtils.clamp(C.pos.z, -5000, 5000);
        if (!C.follow) { C.follow = true; setFollow(true); }
      }
      const mv = C.pos.clone().sub(before), speed = mv.length() / Math.max(dt, 1e-3) / WALK;
      if (mv.lengthSq() > 1e-4) {
        const f = Math.atan2(mv.x, mv.z);
        C.face += Math.atan2(Math.sin(f - C.face), Math.cos(f - C.face)) * Math.min(1, dt * 10);
        if (C.follow && J.on && J.y < -0.3) { const want = C.face + Math.PI; C.yaw += Math.atan2(Math.sin(want - C.yaw), Math.cos(want - C.yaw)) * Math.min(1, dt * 1.2); }
      }
      hero.g.position.x = C.pos.x; hero.g.position.z = C.pos.z; hero.g.rotation.y = C.face; hero.animate(speed, dt);
      ring.position.set(C.pos.x, 0.7, C.pos.z); ring.scale.setScalar(1 + 0.08 * Math.sin(t / 300));
      headV.set(C.pos.x, 15.5, C.pos.z);
      if (C.follow) C.target.lerp(C.pos, Math.min(1, dt * 6));
      const cp = Math.cos(C.pitch) * C.dist;
      camera.position.set(C.target.x + Math.sin(C.yaw) * cp, Math.max(4, Math.sin(C.pitch) * C.dist), C.target.z + Math.cos(C.yaw) * cp);
      camera.lookAt(C.target.x, C.target.y + 6, C.target.z);
      sun.position.set(C.target.x - 400, 800, C.target.z + 250); sun.target.position.copy(C.target);
      coins.forEach((m) => { m.visible = !p.collected.has(m.userData.id); m.rotation.z = t / 600; });
      if (p.next) { const nx = v3(p.next.place); mark.visible = pillar.visible = true; mark.position.set(nx.x, topOf(p.next.place.id) + 80 + Math.sin(t / 300) * 6, nx.z); pillar.position.set(nx.x, 300, nx.z); }
      else mark.visible = pillar.visible = false;
      W.update(t, dt);
      if (hq) composer.render(); else renderer.render(scene, camera);
      place(tagEl.current, headV);
      const taken: R[] = [heroRect(), ...ctrl];
      PLACES.forEach((pl) => place(labelEls.current[pl.id], anchors[pl.id], C.dist < 900 ? 2600 : 1e9, taken));
      for (const node of Object.values(poiEls.current)) if (node) place(node, new THREE.Vector3(Number(node.dataset.x), PODIUM + 6, Number(node.dataset.z)), 1e9, taken);
      if (t - last.poi > 400) {
        last.poi = t; readCtrl();
        const c = fromM(O, C.target.x, C.target.z), hp = fromM(O, C.pos.x, C.pos.z);
        const list = C.dist > 700 ? [] : p.world.pois.filter((x) => p.kinds.has(x.k)).map((x) => ({ x, d: distanceM(c, x) })).filter((o) => o.d < Math.max(150, C.dist * 0.6)).sort((a, b) => a.d - b.d).slice(0, 14).map((o) => o.x);
        const key = list.map((x) => x.n + x.lat).join('|');
        if (key !== last.key) { last.key = key; setPois(list); }
        const vw = 2 * C.dist * Math.tan((FOV * Math.PI) / 360);
        setView((v) => (Math.abs(v.c.lat - c.lat) + Math.abs(v.c.lng - c.lng) + Math.abs(v.hero.lat - hp.lat) + Math.abs(v.hero.lng - hp.lng) < 1e-5 && Math.abs(v.h - vw) < 1 ? v : { c, hero: hp, w: vw * (w / h), h: vw }));
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel); el.removeEventListener('contextmenu', ctx);
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => { (x as THREE.MeshStandardMaterial).map?.dispose(); (x as THREE.MeshStandardMaterial).emissiveMap?.dispose(); x.dispose(); }); });
      scene.environment?.dispose(); composer.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [world, hq, avatar]); // eslint-disable-line react-hooks/exhaustive-deps

  const C = cam.current;
  const from = me ?? view.hero;
  const joyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joy.current.on) return;
    const r = e.currentTarget.getBoundingClientRect(), R = r.width / 2;
    let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R;
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    joy.current.x = x; joy.current.y = y;
    if (knob.current) knob.current.style.transform = `translate(${x * R * 0.6}px, ${y * R * 0.6}px)`;
  };
  const joyEnd = () => { joy.current = { x: 0, y: 0, on: false }; if (knob.current) knob.current.style.transform = ''; };
  if (failed) return <p className="tip">⚠️ This device can't show the 3D map. Use the World map button instead.</p>;
  const night = isNight(light);
  return (
    <div className="map3d" ref={box}>
      <div className="m3-layer">
        {PLACES.map((pl) => (
          <button key={pl.id} ref={(n) => { labelEls.current[pl.id] = n; }} className={`plate ${pl.kind}`} onClick={() => onPick(pl)}>{pl.icon} {pl.short}</button>
        ))}
        {pois.map((x) => {
          const m = toM(O, x.lat, x.lng), k = x.n + x.lat;
          return <button key={k} ref={(n) => { poiEls.current[k] = n; }} data-x={m.x} data-z={m.y} className={`poi3 ${x.k} ${props.booked(x) ? 'lock' : ''}`} onClick={() => props.onPoi(x)}>{POI_ICON[x.k]}{props.booked(x) ? '🔒' : ''} <span>{x.n.length > 20 ? x.n.slice(0, 19) + '…' : x.n}</span></button>;
        })}
        <div className="hero3" ref={tagEl}>{nick && <b>{nick}</b>}</div>
      </div>
      <div className="m3-toggle">
        <button onClick={() => setLight(light === 'auto' ? (night ? 'day' : 'night') : light === 'day' ? 'night' : 'auto')} aria-label="Change lighting">
          {night ? '🌙' : '☀️'} {light === 'auto' ? 'Auto' : night ? 'Night' : 'Day'}
        </button>
        <button onClick={() => setHq(!hq)} aria-label="Change graphics quality">{hq ? 'HD' : 'Lite'}</button>
      </div>
      {!me && (
        <div className="joy" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); joy.current.on = true; joyMove(e); }} onPointerMove={joyMove} onPointerUp={joyEnd} onPointerCancel={joyEnd} role="application" aria-label="Walk joystick">
          <span>Walk</span><i ref={knob} />
        </div>
      )}
      <MiniMap center={view.c} me={me ?? view.hero} hdg={me?.hdg ?? (next ? bearing(from, next.place) : undefined)} next={next?.place} view={{ w: view.w, h: view.h }} onJump={(c) => { C.target.copy(v3(c)); C.follow = false; setFollow(false); }} />
      <div className="map-zoom" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => { C.dist = Math.max(40, C.dist * 0.7); }} aria-label="Zoom in">+</button>
        <button onClick={() => { C.dist = Math.min(4000, C.dist * 1.4); }} aria-label="Zoom out">−</button>
        <button onClick={() => { C.yaw += Math.PI / 4; }} aria-label="Turn left">⟲</button>
        <button onClick={() => { C.yaw -= Math.PI / 4; }} aria-label="Turn right">⟳</button>
        <button className={follow ? 'on' : ''} aria-pressed={follow} onClick={() => { C.follow = true; setFollow(true); }} aria-label={me ? 'Follow me' : 'Back to my character'}>◎</button>
      </div>
      {next && (
        <div className="next-hint" onPointerDown={(e) => e.stopPropagation()}>
          <b>Next</b> · {next.title}<br />
          <span>{next.place.icon} {next.place.short} · {(() => { const d = distanceM(from, next.place); return d < 1000 ? `${Math.round(d / 10) * 10} m` : `${(d / 1609).toFixed(1)} mi`; })()} {compass(bearing(from, next.place))} · follow the gold marker</span>
        </div>
      )}
    </div>
  );
}
