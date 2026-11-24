import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import type { Avatar } from '../types';
import { LOOKS } from '../data/looks';
import { PLACES, STRIP_ROAD } from '../data/places';
import { toM, type World } from '../data/world';

export type LL = { lat: number; lng: number };
export const O = { lat: 36.115, lng: -115.17 };
export const v3 = (o: LL, h = 0) => { const m = toM(O, o.lat, o.lng); return new THREE.Vector3(m.x, h, m.y); };
export const PODIUM = 22;

type Tower = { h: number; w?: number; d?: number; rot?: number; shape?: 'box' | 'curve' | 'pyramid' | 'cluster' };
/** Approximate real tower heights (m) and shapes. */
const TOWERS: Record<string, Tower> = {
  mandalay: { h: 147, shape: 'curve', rot: 2.3 }, luxor: { h: 107, w: 180, shape: 'pyramid' }, nyny: { h: 160, shape: 'cluster' },
  mgm: { h: 89, w: 120, d: 40, rot: 0.6 }, aria: { h: 182, shape: 'curve', rot: 3.4 }, cosmo: { h: 184, w: 50, d: 30, rot: 0.2 },
  bellagio: { h: 155, shape: 'curve', rot: 2.8 }, paris: { h: 100, w: 90, d: 30, rot: 0.4 }, caesars: { h: 120, w: 110, d: 30, rot: 1.1 },
  venetian: { h: 144, w: 140, d: 30, rot: 0.3 }, palazzo: { h: 196, w: 120, d: 34, rot: 0.9 }, wynn: { h: 187, shape: 'curve', rot: 0.2 },
  encore: { h: 192, shape: 'curve', rot: 0.4 }, resortsworld: { h: 200, w: 110, d: 34, rot: 0.6 }, fontainebleau: { h: 224, shape: 'curve', rot: 4.4 },
};
export const topOf = (id: string) => (id === 'sphere' ? 160 : id === 'strat' ? 350 : id === 'allegiant' ? 60 : TOWERS[id]?.h ?? PODIUM);

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** Facade texture plus a matching emissive map so windows light up at night. */
function facade(base: string, glass: string) {
  const lit: [number, number][] = [];
  const map = canvasTex(128, 256, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 128, 256);
    for (let y = 4; y < 256; y += 10) {
      g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, y + 7, 128, 2);
      for (let x = 4; x < 128; x += 10) { g.fillStyle = glass; g.fillRect(x, y, 7, 6); if (Math.random() < 0.38) lit.push([x, y]); }
    }
  });
  const em = canvasTex(128, 256, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 128, 256);
    for (const [x, y] of lit) { g.fillStyle = Math.random() < 0.8 ? '#ffd27a' : '#bfe0ff'; g.fillRect(x, y, 7, 6); }
  });
  return { map, em };
}
const sand = () => canvasTex(512, 512, (g) => {
  g.fillStyle = '#e2c995'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${140 + Math.random() * 70},${100 + Math.random() * 60},60,${Math.random() * 0.14})`; g.beginPath(); g.arc(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 9, 0, 7); g.fill(); }
});
export const markTex = () => canvasTex(64, 128, (g) => {
  g.font = 'bold 120px Inter, Arial'; g.textAlign = 'center'; g.lineWidth = 10; g.strokeStyle = '#4a2e00'; g.strokeText('!', 32, 110); g.fillStyle = '#ffd23f'; g.fillText('!', 32, 110);
});
const ringShape = (ring: [number, number][]) => new THREE.Shape(ring.map(([la, ln]) => { const m = toM(O, la, ln); return new THREE.Vector2(m.x, -m.y); }));
const std = (color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });

/** Road polyline sampler shared by palms, lights and traffic. */
function roadPath() {
  const pts = STRIP_ROAD.map(([lat, lng]) => v3({ lat, lng }));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const total = cum[cum.length - 1];
  const at = (s: number, out: THREE.Vector3, dir: THREE.Vector3) => {
    s = ((s % total) + total) % total;
    let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const a = pts[i - 1], b = pts[i], t = (s - cum[i - 1]) / (cum[i] - cum[i - 1]);
    out.copy(a).lerp(b, t); dir.copy(b).sub(a).normalize();
  };
  return { pts, total, at };
}

export interface Built {
  pick: THREE.Object3D[];
  update: (t: number, dt: number) => void;
  setNight: (n: boolean) => void;
}

export function buildWorld(scene: THREE.Scene, world: World, renderer: THREE.WebGLRenderer, sun: THREE.DirectionalLight, hemi: THREE.HemisphereLight): Built {
  const pick: THREE.Object3D[] = [];
  const nightMats: { m: THREE.MeshStandardMaterial; day: number; night: number }[] = [];
  const nightOnly: THREE.Object3D[] = [];

  // sky + image-based light
  const sky = new Sky(); sky.scale.setScalar(20000);
  const su = sky.material.uniforms;
  su.turbidity.value = 3; su.rayleigh.value = 1.2; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.8;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(58), THREE.MathUtils.degToRad(200));
  su.sunPosition.value.copy(sunDir);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(sky);
  const env = pmrem.fromScene(envScene).texture; pmrem.dispose();
  scene.add(sky); scene.environment = env;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), std('#ffffff', { map: sand() }));
  (ground.material as THREE.MeshStandardMaterial).map!.repeat.set(120, 120);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // the Strip: sidewalks, asphalt, lane lines
  const road = roadPath();
  const walkM = std('#d8cfbf'), roadM = std('#3d424d', { roughness: 0.7 }), lineM = new THREE.MeshBasicMaterial({ color: '#f6c445' }), dashM = new THREE.MeshBasicMaterial({ color: '#e5e7eb' });
  for (let i = 0; i < road.pts.length - 1; i++) {
    const a = road.pts[i], b = road.pts[i + 1], len = a.distanceTo(b), ang = Math.atan2(b.x - a.x, b.z - a.z), mid = a.clone().add(b).multiplyScalar(0.5);
    for (const [w, m, y, ext] of [[64, walkM, 0.2, 64], [44, roadM, 0.3, 44], [1.2, lineM, 0.4, 0], [0.8, dashM, 0.4, 0]] as const) {
      const offs = m === dashM ? [-11, 11] : [0];
      for (const o of offs) {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(w, len + ext), m); s.rotation.set(-Math.PI / 2, 0, ang);
        s.position.set(mid.x + Math.cos(ang) * o, y, mid.z - Math.sin(ang) * o); s.receiveShadow = true; scene.add(s);
      }
    }
  }
  // palms and street lights along both sides
  const palms: { p: THREE.Vector3; r: number }[] = [], lamps: THREE.Vector3[] = [];
  const P = new THREE.Vector3(), D = new THREE.Vector3();
  for (let s = 0; s < road.total; s += 45) {
    road.at(s, P, D);
    const side = new THREE.Vector3(-D.z, 0, D.x);
    palms.push({ p: P.clone().addScaledVector(side, 27), r: s * 1.7 }, { p: P.clone().addScaledVector(side, -27), r: s * 2.3 });
    if (Math.round(s / 45) % 2) lamps.push(P.clone().addScaledVector(side, 23.5), P.clone().addScaledVector(side, -23.5));
  }
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  const trunkG = new THREE.CylinderGeometry(0.7, 1.2, 15, 7); trunkG.translate(0, 7.5, 0);
  const leafG = new THREE.BoxGeometry(1.8, 0.25, 8); leafG.translate(0, 0, 4);
  const trunk = new THREE.InstancedMesh(trunkG, std('#8b6a44'), palms.length);
  const leaf = new THREE.InstancedMesh(leafG, std('#3f8f45', { roughness: 0.6 }), palms.length * 7);
  palms.forEach(({ p, r }, i) => {
    trunk.setMatrixAt(i, mx.compose(p, q.setFromEuler(e.set(0.06 * Math.sin(r), 0, 0.06 * Math.cos(r))), one));
    for (let k = 0; k < 7; k++) leaf.setMatrixAt(i * 7 + k, mx.compose(new THREE.Vector3(p.x, 15, p.z), q.setFromEuler(e.set(0.45, r + (k * Math.PI * 2) / 7, 0, 'YXZ')), one));
  });
  trunk.castShadow = leaf.castShadow = true; scene.add(trunk, leaf);
  const poleG = new THREE.CylinderGeometry(0.3, 0.4, 12, 5); poleG.translate(0, 6, 0);
  const poles = new THREE.InstancedMesh(poleG, std('#4b5563', { metalness: 0.6, roughness: 0.4 }), lamps.length);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(1.3, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffcf7a' }), lamps.length);
  lamps.forEach((p, i) => { poles.setMatrixAt(i, mx.makeTranslation(p.x, 0, p.z)); bulbs.setMatrixAt(i, mx.makeTranslation(p.x, 12.4, p.z)); });
  scene.add(poles, bulbs); nightOnly.push(bulbs);

  // resorts: podium from the real footprint plus a lit tower
  for (const pl of PLACES) {
    const rings = world.fp[pl.id];
    if (!rings) continue;
    const g = new THREE.Group(); g.userData.place = pl.id;
    const roof = std(new THREE.Color(pl.color).lerp(new THREE.Color('#f5efe3'), 0.45));
    const podF = facade('#efe4cf', '#9fb7cf');
    podF.map.repeat.set(1 / 40, 1 / 30); podF.em.repeat.copy(podF.map.repeat);
    const wall = std('#ffffff', { map: podF.map, emissiveMap: podF.em, emissive: '#ffcf8a', emissiveIntensity: 0 });
    nightMats.push({ m: wall, day: 0, night: 0.35 });
    const podH = pl.id === 'allegiant' ? 4 : pl.id === 'sphere' || pl.id === 'strat' ? 8 : pl.id === 'forum' ? 26 : PODIUM;
    for (const r of rings) {
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape(r), { depth: podH, bevelEnabled: false }), [roof, wall]);
      m.rotation.x = -Math.PI / 2; m.castShadow = m.receiveShadow = true; g.add(m);
    }
    const c = v3(pl), T = TOWERS[pl.id];
    if (T) {
      const glassy = ['cosmo', 'aria', 'fontainebleau', 'resortsworld', 'mandalay', 'encore', 'wynn'].includes(pl.id);
      const f = facade(glassy ? '#9cb6cf' : '#efe2c8', glassy ? '#3d5a7a' : '#8fa9c4');
      const side = std(new THREE.Color(pl.color).lerp(new THREE.Color('#ffffff'), 0.7), { map: f.map, emissiveMap: f.em, emissive: '#ffd08a', emissiveIntensity: 0, roughness: glassy ? 0.25 : 0.8, metalness: glassy ? 0.5 : 0 });
      nightMats.push({ m: side, day: 0, night: 0.85 });
      const top = std(roof.color);
      const crown = std(pl.color, { emissive: pl.color, emissiveIntensity: 0.15 });
      nightMats.push({ m: crown, day: 0.15, night: 2 });
      const rep = (w: number, h: number) => { const r = new THREE.Vector2(w / 40, h / 50); f.map.repeat.copy(r); f.em.repeat.copy(r); };
      let t: THREE.Object3D;
      if (T.shape === 'pyramid') {
        t = new THREE.Mesh(new THREE.ConeGeometry((T.w ?? 160) / Math.SQRT2, T.h, 4), std('#1f2430', { roughness: 0.15, metalness: 0.8 }));
        t.position.set(c.x, T.h / 2, c.z); t.rotation.y = Math.PI / 4;
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1400, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#fff6c8', transparent: true, opacity: 0.5, depthWrite: false }));
        beam.position.set(c.x, T.h + 700, c.z); scene.add(beam); nightOnly.push(beam);
      } else if (T.shape === 'curve') {
        const s = new THREE.Shape(), R = 80, A = 0.75; s.absarc(0, 0, R, -A, A, false); s.absarc(0, 0, R - 22, A, -A, true);
        f.map.repeat.set(1 / 40, 1 / 50); f.em.repeat.copy(f.map.repeat);
        const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: T.h, bevelEnabled: false, curveSegments: 18 }), [top, side]);
        m.rotation.x = -Math.PI / 2; m.position.set(-R + 11, 0, 0);
        const cr = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 3, bevelEnabled: false, curveSegments: 18 }), crown);
        cr.rotation.x = -Math.PI / 2; cr.position.set(-R + 11, T.h, 0);
        t = new THREE.Group(); t.add(m, cr); t.position.set(c.x, 0, c.z); t.rotation.y = T.rot ?? 0;
      } else if (T.shape === 'cluster') {
        t = new THREE.Group();
        [[0, 0, 160, 26], [34, 20, 120, 24], [-30, 24, 100, 22], [10, -34, 130, 22]].forEach(([dx, dz, h, w]) => {
          const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), [side, side, top, top, side, side]); b.position.set(dx, h / 2, dz);
          const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.6, 18, 4), crown); cap.position.set(dx, h + 9, dz); cap.rotation.y = Math.PI / 4;
          t.add(b, cap);
        });
        rep(26, 130); t.position.set(c.x, 0, c.z);
      } else {
        const w = T.w ?? 80, d = T.d ?? 30; rep(w, T.h);
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, T.h, d), [side, side, top, top, side, side]); b.position.y = T.h / 2;
        const cr = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 3, d + 2), crown); cr.position.y = T.h;
        t = new THREE.Group(); t.add(b, cr); t.position.set(c.x, 0, c.z); t.rotation.y = T.rot ?? 0;
      }
      t.traverse((o) => { o.castShadow = true; o.receiveShadow = true; }); g.add(t);
    }
    scene.add(g); pick.push(g);
  }

  // landmarks
  let sphereMat: THREE.MeshStandardMaterial | undefined;
  const sph = PLACES.find((x) => x.id === 'sphere');
  if (sph) {
    sphereMat = std('#111827', { emissive: '#ff4fa3', emissiveIntensity: 1.2, roughness: 0.35 });
    const s = new THREE.Mesh(new THREE.SphereGeometry(78, 48, 32), sphereMat); s.position.copy(v3(sph, 82)); s.castShadow = true; s.userData.place = 'sphere'; scene.add(s); pick.push(s);
  }
  const strat = PLACES.find((x) => x.id === 'strat');
  if (strat) {
    const g = new THREE.Group(), m = std('#e8e4dc');
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(7, 12, 260, 16), m); shaft.position.y = 130;
    const podM = std('#c9d3e6', { emissive: '#7cc4ff', emissiveIntensity: 0, roughness: 0.3, metalness: 0.4 }); nightMats.push({ m: podM, day: 0, night: 1.5 });
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(24, 18, 30, 24), podM); pod.position.y = 275;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(4, 60, 8), m); spire.position.y = 320;
    g.add(shaft, pod, spire); g.position.copy(v3(strat)); g.traverse((o) => { o.castShadow = true; }); g.userData.place = 'strat'; scene.add(g); pick.push(g);
  }
  const al = PLACES.find((x) => x.id === 'allegiant');
  if (al) {
    const g = new THREE.Group();
    const bowlM = std('#1f2937', { emissive: '#e5e7eb', emissiveIntensity: 0 }); nightMats.push({ m: bowlM, day: 0, night: 0.25 });
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(130, 145, 55, 48), bowlM); bowl.position.y = 28; bowl.scale.z = 0.8;
    const roofM = new THREE.Mesh(new THREE.SphereGeometry(130, 40, 12, 0, Math.PI * 2, 0, 0.5), std('#eef2f7', { transparent: true, opacity: 0.85, roughness: 0.2, metalness: 0.3 })); roofM.position.y = -60; roofM.scale.z = 0.8;
    g.add(bowl, roofM); g.position.copy(v3(al)); g.userData.place = 'allegiant'; scene.add(g); pick.push(g);
  }
  // Eiffel Tower at Paris: four legs, two decks, spire
  const eiffel = new THREE.Group(), bronze = std('#7a4f2c', { metalness: 0.5, roughness: 0.5 });
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4, leg = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.4, 80, 4), bronze);
    leg.position.set(Math.cos(a) * 14, 40, Math.sin(a) * 14); leg.rotation.set(Math.sin(a) * 0.32, 0, -Math.cos(a) * 0.32); eiffel.add(leg);
  }
  const deck1 = new THREE.Mesh(new THREE.BoxGeometry(26, 3, 26), bronze); deck1.position.y = 42;
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 6, 70, 4), bronze); upper.position.y = 112; upper.rotation.y = Math.PI / 4;
  const deck2 = new THREE.Mesh(new THREE.BoxGeometry(12, 2, 12), bronze); deck2.position.y = 92;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe8a3' })); tip.position.y = 150; nightOnly.push(tip);
  eiffel.add(deck1, upper, deck2, tip); eiffel.traverse((o) => { o.castShadow = true; }); eiffel.position.copy(v3({ lat: 36.11246, lng: -115.17227 })); scene.add(eiffel);
  // High Roller wheel
  const wheel = new THREE.Group(), wm = std('#f4f6fb', { metalness: 0.6, roughness: 0.3, emissive: '#ff6ad5', emissiveIntensity: 0 });
  nightMats.push({ m: wm, day: 0, night: 1.2 });
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(76, 2.4, 8, 72), wm));
  const cabM = std('#9bd3ff', { roughness: 0.1, metalness: 0.3, emissive: '#9bd3ff', emissiveIntensity: 0 }); nightMats.push({ m: cabM, day: 0, night: 1 });
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2, cab = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 8), cabM);
    cab.position.set(Math.cos(a) * 76, Math.sin(a) * 76, 0); wheel.add(cab);
    if (i % 2 === 0) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 76, 4), wm); sp.position.set(Math.cos(a) * 38, Math.sin(a) * 38, 0); sp.rotation.z = a - Math.PI / 2; wheel.add(sp); }
  }
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 92, 6), wm); legs.position.y = 46;
  const wheelBase = new THREE.Group(); wheelBase.add(wheel, legs); wheel.position.y = 92; wheelBase.position.copy(v3({ lat: 36.1176, lng: -115.1683 })); wheelBase.rotation.y = 0.3; scene.add(wheelBase);
  // Bellagio lake with dancing fountains
  const lakeC = v3({ lat: 36.1127, lng: -115.1744 });
  const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 64), std('#1f6fae', { roughness: 0.05, metalness: 0.6 }));
  lake.scale.set(70, 160, 1); lake.rotation.x = -Math.PI / 2; lake.position.set(lakeC.x, 0.6, lakeC.z); scene.add(lake);
  const jets = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.8, 2.5, 1, 8), new THREE.MeshBasicMaterial({ color: '#f0f9ff', transparent: true, opacity: 0.75 }), 32);
  scene.add(jets);
  // other big buildings
  const others = [std('#e7d5b4'), std('#d9c4a0'), std('#cdbb9a')];
  world.other.forEach((b, i) => {
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape(b.g), { depth: 12 + ((i * 37) % 30), bevelEnabled: false }), [others[i % 3], others[(i + 1) % 3]]);
    m.rotation.x = -Math.PI / 2; m.castShadow = m.receiveShadow = true; scene.add(m);
  });
  // airport runways
  const ap = PLACES.find((x) => x.id === 'airport');
  if (ap) [-300, 300].forEach((dz) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(3000, 46), std('#3f444f'));
    const p = v3(ap); r.rotation.set(-Math.PI / 2, 0, 0.17); r.position.set(p.x + 300, 0.35, p.z + dz + 500); scene.add(r);
  });

  // traffic on the Strip
  const CARS = 70, carCols = ['#f8fafc', '#111827', '#dc2626', '#2563eb', '#9ca3af', '#facc15', '#16a34a', '#f8fafc'];
  const carG = new THREE.BoxGeometry(4.6, 3, 9); carG.translate(0, 1.6, 0);
  const cars = new THREE.InstancedMesh(carG, std('#ffffff', { roughness: 0.3, metalness: 0.5 }), CARS);
  const lightG = new THREE.BoxGeometry(4, 1, 0.6); lightG.translate(0, 1.6, 4.8);
  const carLights = new THREE.InstancedMesh(lightG, new THREE.MeshBasicMaterial({ color: '#fff4c2' }), CARS);
  const carS = Array.from({ length: CARS }, (_, i) => ({ s: (i / CARS) * road.total, lane: i % 2 ? 1 : -1, v: 10 + ((i * 7) % 9), off: i % 4 < 2 ? 6 : 15 }));
  carS.forEach((_, i) => cars.setColorAt(i, new THREE.Color(carCols[i % carCols.length])));
  cars.castShadow = true; scene.add(cars, carLights); nightOnly.push(carLights);

  const tmpP = new THREE.Vector3(), tmpD = new THREE.Vector3();
  return {
    pick,
    update(t, dt) {
      for (let i = 0; i < 32; i++) {
        const a = (i / 31 - 0.5) * 2.6, hgt = 15 + 70 * Math.max(0, Math.sin(t / 450 + i * 0.45));
        mx.compose(new THREE.Vector3(lakeC.x - Math.cos(a) * 60, hgt / 2, lakeC.z + Math.sin(a) * 140), q.identity(), new THREE.Vector3(1, hgt, 1));
        jets.setMatrixAt(i, mx);
      }
      jets.instanceMatrix.needsUpdate = true;
      carS.forEach((c, i) => {
        c.s += c.v * c.lane * dt;
        road.at(c.s, tmpP, tmpD);
        if (c.lane < 0) tmpD.negate();
        tmpP.add(new THREE.Vector3(-tmpD.z, 0, tmpD.x).multiplyScalar(c.off));
        mx.compose(tmpP, q.setFromEuler(e.set(0, Math.atan2(tmpD.x, tmpD.z), 0)), one);
        cars.setMatrixAt(i, mx); carLights.setMatrixAt(i, mx);
      });
      cars.instanceMatrix.needsUpdate = carLights.instanceMatrix.needsUpdate = true;
      if (sphereMat) sphereMat.emissive.setHSL((t / 20000) % 1, 0.85, 0.5);
      wheel.rotation.z = t / 40000;
    },
    setNight(n) {
      sky.visible = !n;
      scene.background = n ? new THREE.Color('#0a1230') : null;
      (scene.fog as THREE.Fog).color.set(n ? '#0d1736' : '#d6e6f7');
      scene.environmentIntensity = n ? 0.18 : 1;
      hemi.intensity = n ? 0.35 : 0.9; hemi.color.set(n ? '#5b6fb0' : '#dbeeff'); hemi.groundColor.set(n ? '#2a1e10' : '#c9a36a');
      sun.intensity = n ? 0.35 : 2.6; sun.color.set(n ? '#9fb3ff' : '#fff1d6');
      for (const x of nightMats) x.m.emissiveIntensity = n ? x.night : x.day;
      if (sphereMat) sphereMat.emissiveIntensity = n ? 1.8 : 0.9;
      for (const o of nightOnly) o.visible = n;
    },
  };
}

/** A simple 3D person built from the avatar's chosen colours. */
export function makeAvatar(a: Avatar) {
  const col = (o: { color?: string } | undefined, d: string) => o?.color || d;
  const skin = std(col(LOOKS.skin[a.skin], '#f1c193'), { roughness: 0.6 });
  const hair = std(col(LOOKS.hairColor[a.hairColor], '#2a2233'), { roughness: 0.5 });
  const shirt = std(col(LOOKS.shirt[a.shirt], '#ff9900'));
  const pants = std(col(LOOKS.bottom[a.bottom], '#3b5b9b'));
  const shoes = std(col(LOOKS.shoes[a.shoes], '#f8fafc'), { roughness: 0.4 });
  const g = new THREE.Group();
  const limb = (r: number, len: number, m: THREE.Material, x: number, y: number) => {
    const piv = new THREE.Group(), mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m);
    mesh.position.y = -len / 2 - r * 0.2; piv.add(mesh); piv.position.set(x, y, 0); g.add(piv); return piv;
  };
  const legL = limb(0.85, 3.8, pants, -0.95, 5.2), legR = limb(0.85, 3.8, pants, 0.95, 5.2);
  [legL, legR].forEach((l) => { const s = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 2.6), shoes); s.position.set(0, -5.1, 0.45); l.add(s); });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.9, 2.6, 6, 14), shirt); torso.position.y = 7.6; torso.scale.z = 0.7; g.add(torso);
  if (a.dress) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 3, 3.6, 16), std(col(LOOKS.dress[a.dress], '#facc15'))); skirt.position.y = 4.6; g.add(skirt);
  }
  const armL = limb(0.6, 3.4, shirt, -2.55, 9.4), armR = limb(0.6, 3.4, shirt, 2.55, 9.4);
  [armL, armR].forEach((l) => { const h = new THREE.Mesh(new THREE.SphereGeometry(0.65, 10, 8), skin); h.position.y = -4.4; l.add(h); });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.9, 10), skin); neck.position.y = 10.4;
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.75, 24, 18), skin); head.position.y = 12.2; head.scale.set(0.95, 1.05, 1);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.9, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair); cap.position.set(0, 12.35, -0.12);
  const eyeM = new THREE.MeshBasicMaterial({ color: '#1f2937' });
  [-0.6, 0.6].forEach((x) => { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), eyeM); eye.position.set(x, 12.35, 1.62); g.add(eye); });
  if (a.glasses) { const gl = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 6, 16), std(col(LOOKS.glasses[a.glasses], '#334155'))); [-0.6, 0.6].forEach((x) => { const c = gl.clone(); c.position.set(x, 12.35, 1.7); g.add(c); }); }
  g.add(neck, head, cap);
  g.traverse((o) => { o.castShadow = true; });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(3, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.5; g.add(shadow);
  let phase = 0;
  return {
    g,
    animate(speed: number, dt: number) {
      phase += dt * (speed > 0.05 ? 9 * Math.min(1.4, speed) : 0);
      const amp = Math.min(0.7, speed * 0.7), sw = Math.sin(phase) * amp;
      legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw * 0.8; armR.rotation.x = sw * 0.8;
      g.position.y = Math.abs(Math.cos(phase)) * amp * 0.5;
      if (speed <= 0.05) { legL.rotation.x *= 0.8; legR.rotation.x *= 0.8; }
    },
    dispose() { g.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); }); },
  };
}
