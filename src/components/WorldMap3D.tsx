import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Avatar } from '../types';
import { PLACES, STRIP_ROAD, distanceM, type Place } from '../data/places';
import { POI_ICON, bearing, compass, fromM, toM, type Poi, type PoiKind, type World } from '../data/world';
import Hero from './Hero';
import { MiniMap } from './WorldMap';

type LL = { lat: number; lng: number };
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

const O = { lat: 36.115, lng: -115.17 };
const v3 = (o: LL, h = 0) => { const m = toM(O, o.lat, o.lng); return new THREE.Vector3(m.x, h, m.y); };
const PITCH = 0.9, FOV = 50, PODIUM = 22;
type Tower = { h: number; w?: number; d?: number; rot?: number; shape?: 'box' | 'curve' | 'pyramid' | 'cluster' };
/** Approximate real tower heights (m) and shapes. */
const TOWERS: Record<string, Tower> = {
  mandalay: { h: 147, shape: 'curve', rot: 2.3 }, luxor: { h: 107, w: 180, shape: 'pyramid' }, nyny: { h: 160, shape: 'cluster' },
  mgm: { h: 89, w: 120, d: 40, rot: 0.6 }, aria: { h: 182, shape: 'curve', rot: 3.4 }, cosmo: { h: 184, w: 50, d: 30, rot: 0.2 },
  bellagio: { h: 155, shape: 'curve', rot: 2.8 }, paris: { h: 100, w: 90, d: 30, rot: 0.4 }, caesars: { h: 120, w: 110, d: 30, rot: 1.1 },
  venetian: { h: 144, w: 140, d: 30, rot: 0.3 }, palazzo: { h: 196, w: 120, d: 34, rot: 0.9 }, wynn: { h: 187, shape: 'curve', rot: 0.2 },
  encore: { h: 192, shape: 'curve', rot: 0.4 }, resortsworld: { h: 200, w: 110, d: 34, rot: 0.6 }, fontainebleau: { h: 224, shape: 'curve', rot: 4.4 },
};
const topOf = (id: string) => (id === 'sphere' ? 160 : id === 'strat' ? 350 : id === 'allegiant' ? 60 : TOWERS[id]?.h ?? PODIUM);

function windowTex(base: string, lit: string) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = base; g.fillRect(0, 0, 64, 128);
  for (let y = 3; y < 128; y += 8) for (let x = 3; x < 64; x += 8) { g.fillStyle = Math.random() < 0.3 ? lit : 'rgba(30,40,70,.45)'; g.fillRect(x, y, 5, 5); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function sandTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e6cf9c'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${150 + Math.random() * 60},${110 + Math.random() * 50},60,${Math.random() * 0.18})`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 6, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 60); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function markTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d')!;
  g.font = 'bold 120px Georgia'; g.textAlign = 'center'; g.lineWidth = 10; g.strokeStyle = '#4a2e00'; g.strokeText('!', 32, 110); g.fillStyle = '#ffd23f'; g.fillText('!', 32, 110);
  return new THREE.CanvasTexture(c);
}
const ringShape = (ring: [number, number][]) => new THREE.Shape(ring.map(([la, ln]) => { const m = toM(O, la, ln); return new THREE.Vector2(m.x, -m.y); }));

function buildScene(scene: THREE.Scene, world: World) {
  const pick: THREE.Object3D[] = [];
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000), new THREE.MeshLambertMaterial({ map: sandTex() }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // the Strip: road ribbon with a centre line, palm trees on both sides
  const road = new THREE.MeshLambertMaterial({ color: '#5d6270' }), line = new THREE.MeshBasicMaterial({ color: '#f6c445' });
  const palms: THREE.Vector3[] = [];
  for (let i = 0; i < STRIP_ROAD.length - 1; i++) {
    const a = v3({ lat: STRIP_ROAD[i][0], lng: STRIP_ROAD[i][1] }), b = v3({ lat: STRIP_ROAD[i + 1][0], lng: STRIP_ROAD[i + 1][1] });
    const len = a.distanceTo(b), ang = Math.atan2(b.x - a.x, b.z - a.z), mid = a.clone().add(b).multiplyScalar(0.5);
    for (const [w, m, y] of [[44, road, 0.3], [2, line, 0.4]] as const) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w, len + (w > 2 ? 44 : 0)), m); s.rotation.set(-Math.PI / 2, 0, ang); s.position.set(mid.x, y, mid.z); s.receiveShadow = true; scene.add(s);
    }
    const side = new THREE.Vector3(Math.cos(ang), 0, -Math.sin(ang));
    for (let t = 0; t < len; t += 60) { const p = a.clone().lerp(b, t / len); palms.push(p.clone().addScaledVector(side, 28), p.clone().addScaledVector(side, -28)); }
  }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1.6, 16, 6), new THREE.MeshLambertMaterial({ color: '#8b6a44' }), palms.length);
  const leaf = new THREE.InstancedMesh(new THREE.ConeGeometry(9, 6, 7), new THREE.MeshLambertMaterial({ color: '#3f9b4b' }), palms.length);
  const mx = new THREE.Matrix4();
  palms.forEach((p, i) => { trunk.setMatrixAt(i, mx.makeTranslation(p.x, 8, p.z)); leaf.setMatrixAt(i, mx.makeTranslation(p.x, 17, p.z)); });
  trunk.castShadow = leaf.castShadow = true; scene.add(trunk, leaf);

  // resorts: podium from the real footprint plus a tower
  const winA = windowTex('#e9dcc2', '#ffe9a8'), winB = windowTex('#7fa6c9', '#fff3c4');
  for (const pl of PLACES) {
    const rings = world.fp[pl.id];
    if (!rings) continue;
    const g = new THREE.Group(); g.userData.place = pl.id;
    const roof = new THREE.MeshLambertMaterial({ color: new THREE.Color(pl.color).lerp(new THREE.Color('#fff4dc'), 0.35) });
    const wall = new THREE.MeshLambertMaterial({ color: '#f1e3c6' });
    const podH = pl.id === 'allegiant' ? 4 : pl.id === 'sphere' || pl.id === 'strat' ? 8 : pl.id === 'forum' ? 26 : PODIUM;
    for (const r of rings) {
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape(r), { depth: podH, bevelEnabled: false }), [roof, wall]);
      m.rotation.x = -Math.PI / 2; m.castShadow = m.receiveShadow = true; g.add(m);
    }
    const c = v3(pl), T = TOWERS[pl.id];
    if (T) {
      const glass = (pl.id === 'cosmo' || pl.id === 'aria' || pl.id === 'fontainebleau' || pl.id === 'resortsworld' || pl.id === 'mandalay') ? winB : winA;
      const side = new THREE.MeshLambertMaterial({ map: glass.clone(), color: new THREE.Color(pl.color).lerp(new THREE.Color('#ffffff'), 0.55) });
      side.map!.needsUpdate = true;
      const top = new THREE.MeshLambertMaterial({ color: roof.color });
      let t: THREE.Object3D;
      if (T.shape === 'pyramid') {
        t = new THREE.Mesh(new THREE.ConeGeometry((T.w ?? 160) / Math.SQRT2, T.h, 4), new THREE.MeshLambertMaterial({ color: '#2f3442' }));
        t.position.set(c.x, T.h / 2, c.z); t.rotation.y = Math.PI / 4;
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 900, 8), new THREE.MeshBasicMaterial({ color: '#fff6c8', transparent: true, opacity: 0.35 }));
        beam.position.set(c.x, T.h + 450, c.z); scene.add(beam);
      } else if (T.shape === 'curve') {
        const s = new THREE.Shape(), R = 80, A = 0.75; s.absarc(0, 0, R, -A, A, false); s.absarc(0, 0, R - 22, A, -A, true);
        side.map!.repeat.set(1 / 40, 1 / 60);
        const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: T.h, bevelEnabled: false, curveSegments: 18 }), [top, side]);
        m.rotation.x = -Math.PI / 2; t = new THREE.Group(); t.add(m); t.position.set(c.x, 0, c.z); t.rotation.y = T.rot ?? 0;
        m.position.set(-R + 11, 0, 0);
      } else if (T.shape === 'cluster') {
        t = new THREE.Group();
        [[0, 0, 160, 26], [34, 20, 120, 24], [-30, 24, 100, 22], [10, -34, 130, 22]].forEach(([dx, dz, h, w]) => {
          const sm = side.clone(); sm.map = side.map!.clone(); sm.map.repeat.set(w / 40, h / 60); sm.map.needsUpdate = true;
          const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), [sm, sm, top, top, sm, sm]); b.position.set(dx, h / 2, dz); b.castShadow = true; t.add(b);
        });
        t.position.set(c.x, 0, c.z);
      } else {
        const w = T.w ?? 80, d = T.d ?? 30; side.map!.repeat.set(w / 40, T.h / 60);
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, T.h, d), [side, side, top, top, side, side]);
        b.position.set(c.x, T.h / 2, c.z); b.rotation.y = T.rot ?? 0; t = b;
      }
      t.traverse((o) => { o.castShadow = true; }); g.add(t);
    }
    scene.add(g); pick.push(g);
  }

  // landmarks
  const sph = PLACES.find((x) => x.id === 'sphere');
  let sphereMat: THREE.MeshStandardMaterial | undefined;
  if (sph) {
    sphereMat = new THREE.MeshStandardMaterial({ color: '#223', emissive: '#ff4fa3', emissiveIntensity: 0.9, roughness: 0.4 });
    const s = new THREE.Mesh(new THREE.SphereGeometry(78, 40, 24), sphereMat); s.position.copy(v3(sph, 82)); s.castShadow = true; s.userData.place = 'sphere'; scene.add(s); pick.push(s);
  }
  const strat = PLACES.find((x) => x.id === 'strat');
  if (strat) {
    const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: '#e8e4dc' });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(7, 12, 260, 12), m); shaft.position.y = 130;
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(24, 18, 30, 16), new THREE.MeshLambertMaterial({ color: '#c9d3e6' })); pod.position.y = 275;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(4, 60, 8), m); spire.position.y = 320;
    g.add(shaft, pod, spire); g.position.copy(v3(strat)); g.traverse((o) => { o.castShadow = true; }); g.userData.place = 'strat'; scene.add(g); pick.push(g);
  }
  const al = PLACES.find((x) => x.id === 'allegiant');
  if (al) {
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(130, 145, 55, 40), new THREE.MeshLambertMaterial({ color: '#23262e' })); bowl.position.y = 28; bowl.scale.z = 0.8;
    const roofM = new THREE.Mesh(new THREE.SphereGeometry(130, 32, 12, 0, Math.PI * 2, 0, 0.5), new THREE.MeshLambertMaterial({ color: '#e9eef5', transparent: true, opacity: 0.85 })); roofM.position.y = -60; roofM.scale.z = 0.8;
    g.add(bowl, roofM); g.position.copy(v3(al)); g.userData.place = 'allegiant'; scene.add(g); pick.push(g);
  }
  // Eiffel Tower at Paris
  const eiffel = new THREE.Group(), bronze = new THREE.MeshLambertMaterial({ color: '#8a5a32', wireframe: true });
  const e1 = new THREE.Mesh(new THREE.ConeGeometry(26, 150, 4, 10, true), bronze); e1.position.y = 75; e1.rotation.y = Math.PI / 4;
  [40, 95].forEach((y, i) => { const pl = new THREE.Mesh(new THREE.BoxGeometry(30 - i * 14, 3, 30 - i * 14), new THREE.MeshLambertMaterial({ color: '#8a5a32' })); pl.position.y = y; eiffel.add(pl); });
  eiffel.add(e1); eiffel.position.copy(v3({ lat: 36.11246, lng: -115.17227 })); scene.add(eiffel);
  // High Roller wheel
  const wheel = new THREE.Group(), wm = new THREE.MeshLambertMaterial({ color: '#f4f6fb' });
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(76, 2.4, 8, 64), wm));
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2, cab = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), new THREE.MeshLambertMaterial({ color: i % 2 ? '#8fd3ff' : '#ff9ad5' }));
    cab.position.set(Math.cos(a) * 76, Math.sin(a) * 76, 0); wheel.add(cab);
    if (i % 4 === 0) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 76, 4), wm); sp.position.set(Math.cos(a) * 38, Math.sin(a) * 38, 0); sp.rotation.z = a - Math.PI / 2; wheel.add(sp); }
  }
  const wheelBase = new THREE.Group(); wheelBase.add(wheel); wheel.position.y = 90; wheelBase.position.copy(v3({ lat: 36.1176, lng: -115.1683 })); wheelBase.rotation.y = 0.3; scene.add(wheelBase);
  // Bellagio lake with fountains
  const lakeC = v3({ lat: 36.1127, lng: -115.1744 });
  const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshLambertMaterial({ color: '#3fa9f5', emissive: '#0b4f8a', emissiveIntensity: 0.25 }));
  lake.scale.set(70, 160, 1); lake.rotation.x = -Math.PI / 2; lake.position.set(lakeC.x, 0.6, lakeC.z); scene.add(lake);
  const jets = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.2, 2.5, 1, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }), 24);
  scene.add(jets);
  // other big buildings
  const otherMat = [new THREE.MeshLambertMaterial({ color: '#e7d5b4' }), new THREE.MeshLambertMaterial({ color: '#d9c4a0' })];
  world.other.forEach((b, i) => {
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape(b.g), { depth: 12 + ((i * 37) % 30), bevelEnabled: false }), otherMat);
    m.rotation.x = -Math.PI / 2; m.castShadow = m.receiveShadow = true; scene.add(m);
  });
  // airport runways
  const ap = PLACES.find((x) => x.id === 'airport');
  if (ap) [[-300, 0], [300, 0]].forEach(([dz], i) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(3000, 46), new THREE.MeshLambertMaterial({ color: '#4b505c' }));
    const p = v3(ap); r.rotation.set(-Math.PI / 2, 0, 0.17); r.position.set(p.x + 300, 0.35 + i * 0.01, p.z + dz + 500); scene.add(r);
  });
  return { pick, jets, lakeC, sphereMat, wheel };
}

export default function WorldMap3D(props: Props) {
  const { world, me, avatar, nick, focus, next, onPick } = props;
  const box = useRef<HTMLDivElement>(null);
  const P = useRef(props);
  const heroEl = useRef<HTMLDivElement>(null);
  const labelEls = useRef<Record<string, HTMLButtonElement | null>>({});
  const poiEls = useRef<Record<string, HTMLButtonElement | null>>({});
  const cam = useRef({ yaw: 0, dist: 650, target: v3(me ?? focus), follow: true });
  const [follow, setFollow] = useState(true);
  const [pois, setPois] = useState<Poi[]>([]);
  const [view, setView] = useState({ c: me ?? focus, w: 600, h: 600 });
  const [failed, setFailed] = useState(false);
  useEffect(() => { P.current = props; });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#a9d6ff'); scene.fog = new THREE.Fog('#cfe6ff', 1800, 6000);
    scene.add(new THREE.HemisphereLight('#d8eeff', '#c9a36a', 1.5));
    const sun = new THREE.DirectionalLight('#fff1d6', 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -700, right: 700, top: 700, bottom: -700, far: 3000 }); scene.add(sun, sun.target);
    const camera = new THREE.PerspectiveCamera(FOV, 1, 5, 12000);
    const S = buildScene(scene, world);

    // coins over places not yet collected, quest marker over the next stop
    const coinGeo = new THREE.CylinderGeometry(9, 9, 2.5, 24), coinMat = new THREE.MeshStandardMaterial({ color: '#f6c445', metalness: 0.7, roughness: 0.3, emissive: '#7a5200', emissiveIntensity: 0.4 });
    const coins = PLACES.map((pl) => { const m = new THREE.Mesh(coinGeo, coinMat); m.rotation.x = Math.PI / 2; m.position.copy(v3(pl, topOf(pl.id) + 34)); m.userData.id = pl.id; scene.add(m); return m; });
    const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex(), depthTest: false })); mark.scale.set(30, 60, 1); scene.add(mark);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 600, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.22, depthWrite: false })); scene.add(pillar);
    const heroRing = new THREE.Mesh(new THREE.RingGeometry(9, 13, 32), new THREE.MeshBasicMaterial({ color: '#ffd23f' })); heroRing.rotation.x = -Math.PI / 2; scene.add(heroRing);
    const arrowShape = new THREE.Shape([new THREE.Vector2(0, 30), new THREE.Vector2(9, 14), new THREE.Vector2(-9, 14)]);
    const arrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), new THREE.MeshBasicMaterial({ color: '#ffd23f', side: THREE.DoubleSide })); arrow.rotation.x = -Math.PI / 2;
    const arrowG = new THREE.Group(); arrowG.add(arrow); scene.add(arrowG);

    let w = 1, h = 1;
    const ro = new ResizeObserver(() => { w = el.clientWidth; h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); });
    ro.observe(el);

    // input: drag pans, two fingers pinch-zoom and twist, tap opens a building
    const pts = new Map<number, { x: number; y: number }>();
    let start: { x: number; y: number; moved: boolean } | null = null, pinch: { d: number; a: number } | null = null;
    const C = cam.current;
    const pan = (dx: number, dy: number) => {
      const k = (2 * C.dist * Math.tan((FOV * Math.PI) / 360)) / h;
      const right = new THREE.Vector3(Math.cos(C.yaw), 0, -Math.sin(C.yaw)), fwd = new THREE.Vector3(-Math.sin(C.yaw), 0, -Math.cos(C.yaw));
      C.target.addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k * 1.3);
      C.target.x = THREE.MathUtils.clamp(C.target.x, -4000, 4000); C.target.z = THREE.MathUtils.clamp(C.target.z, -5000, 5000);
      if (C.follow) { C.follow = false; setFollow(false); }
    };
    const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x) }; };
    const down = (e: PointerEvent) => { if (e.target !== renderer.domElement) return; el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 1) start = { x: e.clientX, y: e.clientY, moved: false }; else { pinch = two(); if (start) start.moved = true; } };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pts.size >= 2 && pinch) { const n = two(); C.dist = THREE.MathUtils.clamp(C.dist * (pinch.d / n.d), 120, 4000); C.yaw -= n.a - pinch.a; pinch = n; return; }
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) start.moved = true;
      if (start?.moved) pan(dx, dy);
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
      if (pts.size === 0 && start && !start.moved) {
        const r = el.getBoundingClientRect(), ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / w) * 2 - 1, -((e.clientY - r.top) / h) * 2 + 1), camera);
        const hit = ray.intersectObjects(S.pick, true)[0];
        let o: THREE.Object3D | null = hit?.object ?? null;
        while (o && !o.userData.place) o = o.parent;
        const pl = PLACES.find((x) => x.id === o?.userData.place);
        if (pl) P.current.onPick(pl);
      }
      if (pts.size === 0) start = null;
    };
    const wheel = (e: WheelEvent) => { e.preventDefault(); C.dist = THREE.MathUtils.clamp(C.dist * (e.deltaY > 0 ? 1.12 : 0.89), 120, 4000); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });

    const anchors = Object.fromEntries(PLACES.map((pl) => [pl.id, v3(pl, topOf(pl.id) + 16)]));
    const tmp = new THREE.Vector3(), mx = new THREE.Matrix4();
    const place = (node: HTMLElement | null | undefined, v: THREE.Vector3, maxD = 1e9) => {
      if (!node) return;
      tmp.copy(v).project(camera);
      const d = camera.position.distanceTo(v);
      if (tmp.z > 1 || d > maxD || Math.abs(tmp.x) > 1.2 || Math.abs(tmp.y) > 1.2) { node.style.display = 'none'; return; }
      node.style.display = '';
      node.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px) translate(-50%, -100%)`;
    };
    let raf = 0, lastPoi = 0, poiKey = '';
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const p = P.current, heroLL = p.me ?? p.focus, hero = v3(heroLL);
      if (C.follow) C.target.lerp(hero, 0.12);
      camera.position.set(C.target.x + Math.sin(C.yaw) * Math.cos(PITCH) * C.dist, Math.sin(PITCH) * C.dist, C.target.z + Math.cos(C.yaw) * Math.cos(PITCH) * C.dist);
      camera.lookAt(C.target);
      sun.position.set(C.target.x - 500, 900, C.target.z + 300); sun.target.position.copy(C.target);
      heroRing.position.set(hero.x, 0.8, hero.z);
      const hd = p.me?.hdg ?? (p.next ? bearing(heroLL, p.next.place) : undefined);
      arrowG.visible = hd !== undefined; arrowG.position.set(hero.x, 0.9, hero.z); arrowG.rotation.y = -((hd ?? 0) * Math.PI) / 180;
      coins.forEach((m) => { m.visible = !p.collected.has(m.userData.id); m.rotation.z = t / 600; });
      if (p.next) { const n = v3(p.next.place); mark.visible = pillar.visible = true; mark.position.set(n.x, topOf(p.next.place.id) + 80 + Math.sin(t / 300) * 6, n.z); pillar.position.set(n.x, 300, n.z); }
      else mark.visible = pillar.visible = false;
      for (let i = 0; i < 24; i++) {
        const a = (i / 23 - 0.5) * 2.6, hgt = 20 + 50 * Math.max(0, Math.sin(t / 500 + i * 0.5));
        mx.compose(new THREE.Vector3(S.lakeC.x - Math.cos(a) * 60, hgt / 2, S.lakeC.z + Math.sin(a) * 140), new THREE.Quaternion(), new THREE.Vector3(1, hgt, 1));
        S.jets.setMatrixAt(i, mx);
      }
      S.jets.instanceMatrix.needsUpdate = true;
      if (S.sphereMat) S.sphereMat.emissive.setHSL((t / 20000) % 1, 0.8, 0.45);
      S.wheel.rotation.z = t / 40000;
      renderer.render(scene, camera);
      PLACES.forEach((pl) => place(labelEls.current[pl.id], anchors[pl.id], C.dist < 900 ? 2600 : 1e9));
      place(heroEl.current, hero);
      for (const node of Object.values(poiEls.current)) if (node) place(node, new THREE.Vector3(Number(node.dataset.x), PODIUM + 6, Number(node.dataset.z)));
      if (t - lastPoi > 400) {
        lastPoi = t;
        const c = fromM(O, C.target.x, C.target.z);
        const list = C.dist > 700 ? [] : p.world.pois.filter((x) => p.kinds.has(x.k)).map((x) => ({ x, d: distanceM(c, x) })).filter((o) => o.d < C.dist * 0.6).sort((a, b) => a.d - b.d).slice(0, 14).map((o) => o.x);
        const key = list.map((x) => x.n + x.lat).join('|');
        if (key !== poiKey) { poiKey = key; setPois(list); }
        const vw = 2 * C.dist * Math.tan((FOV * Math.PI) / 360);
        setView((v) => (Math.abs(v.c.lat - c.lat) + Math.abs(v.c.lng - c.lng) < 1e-5 && Math.abs(v.h - vw) < 1 ? v : { c, w: vw * (w / h), h: vw }));
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('wheel', wheel);
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => x.dispose()); });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [world]); // eslint-disable-line react-hooks/exhaustive-deps

  const C = cam.current;
  const from = me ?? focus;
  if (failed) return <p className="tip">⚠️ This device can't show the 3D map. Use the World map button instead.</p>;
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
        <div className="hero3" ref={heroEl}><Hero a={avatar} size={70} />{nick && <b>{nick}</b>}</div>
      </div>
      <MiniMap center={view.c} me={me} hdg={me?.hdg ?? (next ? bearing(from, next.place) : undefined)} next={next?.place} view={{ w: view.w, h: view.h }} onJump={(c) => { C.target.copy(v3(c)); C.follow = false; setFollow(false); }} />
      <div className="map-zoom" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => { C.dist = Math.max(120, C.dist * 0.7); }} aria-label="Zoom in">＋</button>
        <button onClick={() => { C.dist = Math.min(4000, C.dist * 1.4); }} aria-label="Zoom out">－</button>
        <button onClick={() => { C.yaw += Math.PI / 4; }} aria-label="Turn left">⟲</button>
        <button onClick={() => { C.yaw -= Math.PI / 4; }} aria-label="Turn right">⟳</button>
        <button className={follow ? 'on' : ''} aria-pressed={follow} onClick={() => { C.follow = true; setFollow(true); }} aria-label={me ? 'Follow me' : 'Back to my hotel'}>🎯</button>
      </div>
      {next && (
        <div className="next-hint" onPointerDown={(e) => e.stopPropagation()}>
          <b>NEXT ▸</b> {next.title}<br />
          <span>{next.place.icon} {next.place.short} · {(() => { const d = distanceM(from, next.place); return d < 1000 ? `${Math.round(d / 10) * 10} m` : `${(d / 1609).toFixed(1)} mi`; })()} {compass(bearing(from, next.place))} · follow the gold ❗</span>
        </div>
      )}
    </div>
  );
}
