import { useEffect, useMemo, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Avatar } from '../types';
import { LOOKS } from '../data/looks';

const OUT = '#3a2834';
const IRIS = ['#6b4b2a', '#7b5a3a', '#8b5a2b', '#a16207', '#c2410c', '#64748b', '#db2777', '#2563eb', '#059669', '#7c3aed'];
const T = 34; // headroom for tall headgear

/** Zig-zag bang edge from x1 (right) to x0 (left): tips at lo, notches at hi. */
function zig(x0: number, x1: number, n: number, hi: number, lo: number) {
  let d = '';
  for (let i = 0; i <= n * 2; i++) d += ` L${x1 - ((x1 - x0) * i) / (n * 2)} ${i % 2 ? lo : hi}`;
  return d;
}

function HeroSvg({ a, size, wave }: { a: Avatar; size: number; wave: boolean }) {
  const fem = a.body % 2 === 1;
  const kind = Math.floor(a.body / 2); // 0 normal, 1 tall, 2 strong, 3 little, 4 sporty
  const job = a.job ?? 0;
  const J = LOOKS.job[job] ?? LOOKS.job[0];
  const tw = kind === 2 ? 42 : kind === 3 ? 32 : 36;
  const torsoH = kind === 1 ? 30 : kind === 3 ? 24 : 28;
  const leg = kind === 1 ? 22 : kind === 3 ? 12 : 16;
  const skin = LOOKS.skin[a.skin]?.color ?? '#f1c193';
  const hairC = LOOKS.hairColor[a.hairColor]?.color ?? '#2a2233';
  const shirt = LOOKS.shirt[a.shirt] ?? LOOKS.shirt[0];
  const dress = a.dress ? LOOKS.dress[a.dress] : undefined;
  const bottom = LOOKS.bottom[a.bottom] ?? LOOKS.bottom[0];
  const shoe = LOOKS.shoes[a.shoes] ?? LOOKS.shoes[0];
  const hat = LOOKS.hat[a.hat];
  const gl = LOOKS.glasses[a.glasses];
  const cx = 60, hy = T + 50;
  const top = hy + 24;
  const x0 = cx - tw / 2, x1 = cx + tw / 2;
  const legTop = top + torsoH - 2;
  const footY = legTop + leg;
  const skirt = a.bottom === 6 || a.bottom === 7;
  const shorts = a.bottom === 4 || a.bottom === 5;
  const H = footY + 10;
  const hand = wave ? { x: x1 + 10, y: top - 6 } : { x: x1 + 6, y: top + 22 };
  const iris = IRIS[a.hairColor] ?? IRIS[0];
  const eye = (x: number) => (
    <g stroke="none" key={x}>
      <ellipse cx={x} cy={hy + 6} rx="5.5" ry="7.5" fill={OUT} />
      <ellipse cx={x} cy={hy + 9} rx="4" ry="4.2" fill={iris} />
      <circle cx={x + 1.6} cy={hy + 2.6} r="2.3" fill="#fff" />
      <circle cx={x - 2} cy={hy + 10.5} r="1.1" fill="#fff" />
    </g>
  );

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 120 ${H}`} width={size * (120 / H) * (H / 200)} height={size * (H / 200)}>
      <g stroke={OUT} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
        {/* job cape / coat behind the body */}
        {(job === 1 || job === 9) && <path d={`M${x0 + 2} ${top + 2} Q${cx} ${top - 4} ${x1 - 2} ${top + 2} L${x1 + (job === 9 ? 12 : 6)} ${footY - (job === 9 ? 2 : 12)} Q${cx} ${footY + (job === 9 ? 4 : -6)} ${x0 - (job === 9 ? 12 : 6)} ${footY - (job === 9 ? 2 : 12)} Z`} fill={J.color} />}
        {job === 2 && <path d={`M${x0} ${top + 2} L${x1} ${top + 2} L${x1 + 8} ${footY - 4} L${x0 - 8} ${footY - 4} Z`} fill={J.color} />}
        {job === 8 && <path d={`M${x0} ${top + 4} L${x1} ${top + 4} L${x1 + 6} ${footY - 6} L${x0 - 6} ${footY - 6} Z`} fill={J.color} />}
        {job === 3 && <g><rect x={x1 - 6} y={top - 10} width="10" height="26" rx="3" fill={J.color2} transform={`rotate(20 ${x1} ${top})`} />{[0, 4, 8].map((d) => <path key={d} d={`M${x1 - 3 + d} ${top - 10} l-2 -8`} stroke={OUT} strokeWidth="2" />)}</g>}

        <BackHair style={a.hair} cx={cx} hy={hy} top={top} color={hairC} />

        {/* legs */}
        {!dress && !skirt && <>
          <rect x={cx - 13} y={legTop - 4} width="11" height={shorts ? leg * 0.5 + 4 : leg + 4} rx="3" fill={bottom.color} />
          <rect x={cx + 2} y={legTop - 4} width="11" height={shorts ? leg * 0.5 + 4 : leg + 4} rx="3" fill={bottom.color} />
          {bottom.color2 && !shorts && <path d={`M${cx - 13} ${legTop + leg * 0.4} h11 M${cx + 2} ${legTop + leg * 0.6} h11`} stroke={bottom.color2} strokeWidth="3" />}
        </>}
        {(dress || skirt || shorts) && <>
          <rect x={cx - 12} y={legTop + (shorts ? leg * 0.4 : 2)} width="9" height={leg - (shorts ? leg * 0.4 : 2)} rx="3" fill={skin} />
          <rect x={cx + 3} y={legTop + (shorts ? leg * 0.4 : 2)} width="9" height={leg - (shorts ? leg * 0.4 : 2)} rx="3" fill={skin} />
        </>}
        {/* shoes */}
        {[cx - 8, cx + 8].map((x, i) => (
          <g key={i}>
            {a.shoes === 7
              ? <path d={`M${x - 8} ${footY} h16 v4 h-16 Z`} fill={shoe.color} />
              : <path d={`M${x - (i ? 6 : 10)} ${footY - ([1, 2, 5, 8, 9].includes(a.shoes) ? 8 : 2)} h16 v8 q0 4 -4 4 h-12 q-4 0 -4 -4 Z`} fill={shoe.color} />}
            <path d={`M${x - (i ? 6 : 10)} ${footY + 5} h16`} stroke={shoe.color2} strokeWidth="2.5" />
          </g>
        ))}

        {/* left arm + shield */}
        <path d={`M${x0 + 3} ${top + 6} Q${x0 - 8} ${top + 14} ${x0 - 6} ${top + 22}`} fill="none" stroke={shirt.color} strokeWidth="10" />
        <circle cx={x0 - 6} cy={top + 24} r="5" fill={skin} />
        {(job === 1 || job === 9) && <g><circle cx={x0 - 8} cy={top + 20} r="11" fill={job === 9 ? '#c0c8d8' : J.color} /><circle cx={x0 - 8} cy={top + 20} r="5" fill={J.color2} /></g>}

        {/* torso: robe or tunic */}
        {dress ? (
          <>
            <path d={`M${x0 + 3} ${top} h${tw - 6} l8 ${torsoH + 10} h-${tw + 10} Z`} fill={dress.color} />
            {dress.color2 && a.dress !== 10 && [0, 1, 2].map((k) => <circle key={k} cx={cx - 10 + k * 10} cy={top + 14 + (k % 2) * 10} r="2.5" fill={dress.color2} stroke="none" />)}
            {a.dress === 10 && <path d={`M${x0 - 2} ${top + torsoH} h${tw + 4}`} stroke="#fde047" strokeWidth="4" />}
          </>
        ) : (
          <>
            {skirt && <path d={`M${x0 + 2} ${legTop - 6} h${tw - 4} l7 16 h-${tw + 10} Z`} fill={bottom.color} />}
            {skirt && bottom.color2 && <path d={`M${x0} ${legTop + 4} h${tw}`} stroke={bottom.color2} strokeWidth="3" />}
            <rect x={x0} y={top} width={tw} height={torsoH} rx="9" fill={shirt.color} />
            {a.shirt === 0 && <path d={`M${cx - 8} ${top + 14} q8 6 16 0 l-3 3`} fill="none" stroke={shirt.color2} strokeWidth="2.5" />}
            {a.shirt === 5 && [8, 16, 24].map((y) => <path key={y} d={`M${x0 + 2} ${top + y} h${tw - 4}`} stroke={shirt.color2} strokeWidth="3" />)}
            {(a.shirt === 6 || a.shirt === 9) && <path d={`M${cx} ${top + 2} v${torsoH - 4}`} stroke={shirt.color2} />}
            {(a.shirt === 2 || a.shirt === 7) && <path d={`M${cx - 7} ${top + 16} h14 v7 h-14 Z`} fill={shirt.color2} strokeWidth="2" />}
            {a.shirt === 3 && <path d={`M${cx - 7} ${top} l7 9 l7 -9`} fill={shirt.color2} />}
          </>
        )}
        <JobGear job={job} c={J.color!} c2={J.color2!} x0={x0} x1={x1} cx={cx} top={top} torsoH={torsoH} />
        {kind === 4 && <path d={`M${x0 - 11} ${top + 20} h9`} stroke="#ef4444" strokeWidth="4" />}

        {/* weapon + right arm */}
        <Weapon job={job} x={hand.x} y={hand.y} c={J.color!} c2={J.color2!} />
        <path d={`M${x1 - 3} ${top + 6} Q${(x1 + hand.x) / 2 + 4} ${(top + hand.y) / 2 + 2} ${hand.x} ${hand.y}`} fill="none" stroke={shirt.color} strokeWidth="10" />
        <circle cx={hand.x} cy={hand.y} r="5" fill={skin} />

        {/* head */}
        <circle cx={cx - 35} cy={hy + 6} r="5" fill={skin} />
        <circle cx={cx + 35} cy={hy + 6} r="5" fill={skin} />
        <ellipse cx={cx} cy={hy} rx="35" ry="31" fill={skin} />
        <FrontHair style={a.hair} cx={cx} hy={hy} color={hairC} />

        {/* face */}
        {eye(cx - 13)}{eye(cx + 13)}
        {fem && <path d={`M${cx - 19} ${hy - 1} l-3 -3 M${cx + 19} ${hy - 1} l3 -3`} strokeWidth="2" />}
        <ellipse cx={cx - 22} cy={hy + 16} rx="5" ry="3" fill="#f9a8b8" stroke="none" opacity="0.75" />
        <ellipse cx={cx + 22} cy={hy + 16} rx="5" ry="3" fill="#f9a8b8" stroke="none" opacity="0.75" />
        <path d={`M${cx - 4} ${hy + 19} q2 3 4 0 q2 3 4 0`} fill="none" strokeWidth="2" />

        {gl && a.glasses > 0 && <Glasses i={a.glasses} cx={cx} y={hy + 6} c={gl.color!} c2={gl.color2} />}
        {hat && a.hat > 0 && <Hat i={a.hat} cx={cx} y={hy - 30} hy={hy} c={hat.color!} c2={hat.color2!} />}
        {kind === 4 && a.hat === 0 && <path d={`M${cx - 33} ${hy - 12} Q${cx} ${hy - 24} ${cx + 33} ${hy - 12}`} fill="none" stroke="#ef4444" strokeWidth="5" />}
      </g>
    </svg>
  );
}

function JobGear({ job, c, c2, x0, x1, cx, top, torsoH }: { job: number; c: string; c2: string; x0: number; x1: number; cx: number; top: number; torsoH: number }) {
  const belt = (col: string) => <rect x={x0} y={top + torsoH - 9} width={x1 - x0} height="5" fill={col} strokeWidth="2" />;
  switch (job) {
    case 0: return belt(c2);
    case 1: return <g>{[x0 + 2, x1 - 2].map((x) => <ellipse key={x} cx={x} cy={top + 4} rx="8" ry="5" fill={c2} />)}{belt('#5b3a26')}</g>;
    case 2: return <g><path d={`M${x0 + 2} ${top + 1} L${cx} ${top + 12} L${x1 - 2} ${top + 1}`} fill={c} /><circle cx={cx} cy={top + 11} r="3" fill={c2} /></g>;
    case 3: return <path d={`M${x0 + 4} ${top + 2} L${x1 - 4} ${top + torsoH - 4}`} stroke={c2} strokeWidth="4" />;
    case 4: return <g><rect x={cx - 7} y={top + 1} width="14" height={torsoH + 4} fill={c} /><path d={`M${cx - 7} ${top + 1} v${torsoH + 4} M${cx + 7} ${top + 1} v${torsoH + 4}`} stroke={c2} strokeWidth="2.5" /></g>;
    case 5: return <g><path d={`M${x0 + 4} ${top + 12} h${x1 - x0 - 8} l2 ${torsoH - 6} h-${x1 - x0 - 4} Z`} fill={c} />{belt(c2)}<circle cx={x1 - 3} cy={top + torsoH - 2} r="5" fill="#fbbf24" /></g>;
    case 6: return <g><path d={`M${x0 + 2} ${top + 2} Q${cx} ${top + 10} ${x1 - 2} ${top + 2} l4 4 Q${cx} ${top + 16} ${x0 - 2} ${top + 6} Z`} fill={c2} />{belt(c)}</g>;
    case 7: return <g><path d={`M${x0 + 3} ${top + 6} h${x1 - x0 - 6} v${torsoH + 2} h-${x1 - x0 - 6} Z`} fill={c} /><ellipse cx={x0 + 2} cy={top + 4} rx="7" ry="4.5" fill={c2} /></g>;
    case 8: return <g><path d={`M${x0 + 2} ${top + 1} L${cx - 3} ${top + 10} M${x1 - 2} ${top + 1} L${cx + 3} ${top + 10}`} stroke={c} strokeWidth="5" />{belt('#5b3a26')}<rect x={x0 + 3} y={top + torsoH - 13} width="5" height="8" rx="2" fill={c2} /></g>;
    default: return <g><rect x={x0 + 2} y={top + 2} width={x1 - x0 - 4} height={torsoH - 8} rx="6" fill="#c0c8d8" /><path d={`M${cx} ${top + 4} v${torsoH - 12}`} stroke={c2} strokeWidth="3" />{belt(c2)}</g>;
  }
}

function Weapon({ job, x, y, c, c2 }: { job: number; x: number; y: number; c: string; c2: string }) {
  switch (job) {
    case 0: return <g><rect x={x - 1.5} y={y - 18} width="4" height="14" fill="#e5e7eb" /><rect x={x - 5} y={y - 5} width="11" height="3" fill="#8a6a44" /></g>;
    case 1: return <g><path d={`M${x - 2.5} ${y - 4} v-30 l2.5 -5 l2.5 5 v30 Z`} fill="#e5e7eb" /><rect x={x - 8} y={y - 6} width="16" height="4" fill={c} /></g>;
    case 2: return <g><path d={`M${x} ${y + 14} V${y - 30}`} stroke="#7c4a24" strokeWidth="4" /><circle cx={x} cy={y - 34} r="6.5" fill={c2} /><circle cx={x - 2} cy={y - 36} r="2" fill="#fff" stroke="none" /></g>;
    case 3: return <g fill="none"><path d={`M${x} ${y - 28} Q${x + 18} ${y} ${x} ${y + 28}`} stroke={c2} strokeWidth="4" /><path d={`M${x} ${y - 28} V${y + 28}`} stroke="#f1e3c8" strokeWidth="1.5" /></g>;
    case 4: return <g><path d={`M${x} ${y + 14} V${y - 28}`} stroke="#d6a46c" strokeWidth="4" /><circle cx={x} cy={y - 34} r="6" fill="none" stroke={c2} strokeWidth="4" /></g>;
    case 5: return <g><path d={`M${x} ${y + 10} V${y - 24}`} stroke="#7c4a24" strokeWidth="4" /><path d={`M${x} ${y - 24} q12 -4 14 6 q-4 8 -14 6 Z`} fill="#cbd5e1" /></g>;
    case 6: return <g><path d={`M${x - 1.5} ${y + 2} l-1 16 l2.5 4 l2.5 -4 l-1 -16 Z`} fill="#e5e7eb" /><rect x={x - 5} y={y - 2} width="10" height="3" fill={c2} /></g>;
    case 7: return <g><path d={`M${x} ${y + 10} V${y - 22}`} stroke="#7c4a24" strokeWidth="4" /><rect x={x - 9} y={y - 32} width="18" height="11" rx="2" fill="#94a3b8" /></g>;
    case 8: return <g><path d={`M${x - 3} ${y - 22} h6 v6 q8 4 8 12 q0 10 -11 10 q-11 0 -11 -10 q0 -8 8 -12 Z`} fill="#e0f2fe" /><path d={`M${x - 9} ${y - 4} q9 4 18 0 q0 8 -9 8 q-9 0 -9 -8 Z`} fill={c2} strokeWidth="1.5" /></g>;
    default: return <g><path d={`M${x} ${y + 16} V${y - 40}`} stroke="#94a3b8" strokeWidth="4" /><path d={`M${x} ${y - 52} l5 12 h-10 Z`} fill="#e5e7eb" /><path d={`M${x} ${y - 38} l10 4 l-10 4 Z`} fill={c} /></g>;
  }
}

function BackHair({ style, cx, hy, top, color }: { style: number; cx: number; hy: number; top: number; color: string }) {
  switch (style) {
    case 4: return <rect x={cx - 42} y={hy - 22} width="84" height={top - hy + 30} rx="18" fill={color} />;
    case 5: return <g><path d={`M${cx + 20} ${hy - 26} Q${cx + 62} ${hy - 30} ${cx + 52} ${hy + 20} Q${cx + 48} ${hy + 40} ${cx + 38} ${hy + 46} Q${cx + 46} ${hy + 10} ${cx + 18} ${hy - 8} Z`} fill={color} /><circle cx={cx + 30} cy={hy - 24} r="4" fill="#ef4444" /></g>;
    case 6: return <g>{[-1, 1].map((s) => <path key={s} d={`M${cx + 30 * s} ${hy - 24} Q${cx + 64 * s} ${hy - 20} ${cx + 58 * s} ${hy + 30} Q${cx + 56 * s} ${hy + 50} ${cx + 46 * s} ${hy + 58} Q${cx + 52 * s} ${hy + 20} ${cx + 30 * s} ${hy - 4} Z`} fill={color} />)}{[-1, 1].map((s) => <circle key={s} cx={cx + 34 * s} cy={hy - 22} r="5" fill="#f472b6" />)}</g>;
    case 7: return <g>{[-1, 1].map((s) => [0, 1, 2, 3, 4].map((k) => <circle key={`${s}${k}`} cx={cx + 33 * s} cy={hy + 14 + k * 8} r="5.5" fill={color} />))}</g>;
    case 9: return <rect x={cx - 41} y={hy - 22} width="82" height="50" rx="16" fill={color} />;
    default: return null;
  }
}

function FrontHair({ style, cx, hy, color }: { style: number; cx: number; hy: number; color: string }) {
  const cap = `M${cx - 37} ${hy + 2} C${cx - 40} ${hy - 44} ${cx + 40} ${hy - 44} ${cx + 37} ${hy + 2}`;
  const lock = (s: number) => <rect key={s} x={s < 0 ? cx - 41 : cx + 32} y={hy - 10} width="9" height="34" rx="4" fill={color} />;
  switch (style) {
    case 0: return <g fill={color}>
      <path d={`M${cx - 34} ${hy - 12} L${cx - 48} ${hy - 30} L${cx - 26} ${hy - 30} L${cx - 30} ${hy - 50} L${cx - 10} ${hy - 36} L${cx - 2} ${hy - 58} L${cx + 10} ${hy - 36} L${cx + 30} ${hy - 50} L${cx + 26} ${hy - 30} L${cx + 48} ${hy - 30} L${cx + 34} ${hy - 12} Z`} />
      <path d={`${cap}${zig(cx - 34, cx + 34, 4, hy - 4, hy - 16)} Z`} />
    </g>;
    case 1: return <g fill={color}>
      <path d={`${cap}${zig(cx - 34, cx + 34, 3, hy - 6, hy - 18)} Z`} />
      <path d={`M${cx - 8} ${hy - 30} l3 -10 l5 8 l6 -10 l2 12`} />
    </g>;
    case 2: return <g fill={color}>{lock(1)}<path d={`${cap} L${cx + 34} ${hy - 10} Q${cx + 6} ${hy - 22} ${cx - 20} ${hy - 4} Q${cx - 30} ${hy + 8} ${cx - 37} ${hy + 14} Z`} /></g>;
    case 3: return <g fill={color}>
      {[200, 225, 250, 270, 290, 315, 340].map((d) => <circle key={d} cx={cx + 36 * Math.cos((d * Math.PI) / 180)} cy={hy - 6 + 28 * Math.sin((d * Math.PI) / 180)} r="10" />)}
      <path d={`${cap}${zig(cx - 34, cx + 34, 3, hy - 8, hy - 14)} Z`} />
    </g>;
    case 4: return <g fill={color}>{lock(-1)}{lock(1)}<path d={`${cap}${zig(cx - 34, cx + 34, 5, hy - 5, hy - 11)} Z`} /></g>;
    case 7: return <g fill={color}><path d={`${cap} L${cx + 34} ${hy - 4} Q${cx + 8} ${hy - 12} ${cx} ${hy - 26} Q${cx - 8} ${hy - 12} ${cx - 34} ${hy - 4} Z`} /></g>;
    case 8: return <g fill={color}><circle cx={cx} cy={hy - 36} r="12" /><path d={`${cap}${zig(cx - 34, cx + 34, 3, hy - 4, hy - 14)} Z`} /></g>;
    case 9: return <g fill={color}>{lock(-1)}{lock(1)}<path d={`${cap}${zig(cx - 34, cx + 34, 6, hy - 6, hy - 9)} Z`} /></g>;
    default: return <g fill={color}>{style === 6 && [lock(-1), lock(1)]}<path d={`${cap}${zig(cx - 34, cx + 34, 4, hy - 4, hy - 15)} Z`} /></g>;
  }
}

const PX = 0.6; // art pixels per SVG unit: 120 units wide -> 72 pixels, about the size of a classic MMO sprite

/** The chibi hero drawn as a pixel sprite: the vector art is rasterised small, outlined, then scaled up without smoothing. */
export default function Hero({ a, size = 160, wave = false }: { a: Avatar; size?: number; wave?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const svg = useMemo(() => renderToStaticMarkup(<HeroSvg a={a} size={size} wave={wave} />), [a, size, wave]);
  const H = Number(/viewBox="0 0 120 ([\d.]+)"/.exec(svg)?.[1] ?? 200);
  const w = Math.round(120 * PX), h = Math.round(H * PX);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = ref.current, ctx = c?.getContext('2d', { willReadFrequently: true });
      if (!c || !ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const d = ctx.getImageData(0, 0, w, h), px = d.data;
        const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && px[(y * w + x) * 4 + 3] > 110;
        const keep = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) keep[y * w + x] = solid(x, y) ? 1 : 0;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (keep[y * w + x]) px[i + 3] = 255;
          else if (keep[y * w + x - 1] && x > 0 || keep[y * w + x + 1] && x < w - 1 || keep[(y - 1) * w + x] || keep[(y + 1) * w + x]) {
            px[i] = 58; px[i + 1] = 40; px[i + 2] = 52; px[i + 3] = 255;
          } else px[i + 3] = 0;
        }
        ctx.putImageData(d, 0, 0);
      } catch { /* tainted canvas: keep the smooth drawing */ }
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }, [svg, w, h]);
  return <canvas ref={ref} width={w} height={h} role="img" aria-label="Your hero" className={wave ? 'hero wave' : 'hero'}
    style={{ width: size * 0.6, height: size * (H / 200) }} />;
}

function Glasses({ i, cx, y, c, c2 }: { i: number; cx: number; y: number; c: string; c2?: string }) {
  const L = cx - 13, R = cx + 13;
  const pair = (shape: (x: number) => React.ReactNode, fill = 'none') => (
    <g fill={fill} stroke={c} strokeWidth="2.5">{shape(L)}{shape(R)}<path d={`M${L + 7} ${y} h8`} /></g>
  );
  switch (i) {
    case 1: return pair((x) => <circle cx={x} cy={y} r="8" />, 'rgba(255,255,255,.25)');
    case 2: return pair((x) => <rect x={x - 8} y={y - 7} width="16" height="13" rx="2" />, 'rgba(255,255,255,.25)');
    case 3: return pair((x) => <path d={`M${x} ${y - 9} l3 6 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1 Z`} />, c);
    case 4: return pair((x) => <path d={`M${x - 9} ${y - 5} h18 q0 11 -9 11 q-9 0 -9 -11 Z`} />, c);
    case 5: return pair((x) => <path d={`M${x} ${y + 7} l-8 -8 q-3 -6 3 -8 q4 0 5 4 q1 -4 5 -4 q6 2 3 8 Z`} />, c);
    case 6: return pair((x) => <path d={`M${x - 9} ${y - 5} h18 q-1 12 -9 12 q-8 0 -9 -12 Z`} />, 'rgba(120,80,20,.5)');
    case 7: return pair((x) => <rect x={x - 9} y={y - 8} width="18" height="15" rx="4" strokeWidth="4" />, 'rgba(255,255,255,.25)');
    case 8: return <rect x={cx - 24} y={y - 10} width="48" height="20" rx="8" fill={c} stroke={OUT} strokeWidth="2.5" />;
    case 9: return <rect x={cx - 24} y={y - 10} width="48" height="20" rx="10" fill={c2} stroke={c} strokeWidth="4" />;
    default: return <g stroke={c} fill="rgba(255,255,255,.3)" strokeWidth="2.5"><circle cx={R} cy={y} r="8" /><path d={`M${R + 6} ${y + 6} q4 14 -2 22`} fill="none" /></g>;
  }
}

function Hat({ i, cx, y, hy, c, c2 }: { i: number; cx: number; y: number; hy: number; c: string; c2: string }) {
  switch (i) {
    case 1: return <g>{[-1, 1].map((s) => <g key={s}><ellipse cx={cx + 12 * s} cy={y - 18} rx="7" ry="19" fill={c} transform={`rotate(${s * 10} ${cx + 12 * s} ${y})`} /><ellipse cx={cx + 12 * s} cy={y - 16} rx="3" ry="12" fill={c2} stroke="none" transform={`rotate(${s * 10} ${cx + 12 * s} ${y})`} /></g>)}<path d={`M${cx - 30} ${y + 12} Q${cx} ${y - 8} ${cx + 30} ${y + 12}`} fill="none" stroke={c} strokeWidth="4" /></g>;
    case 2: return <g>{[-1, 1].map((s) => <g key={s}><path d={`M${cx + 12 * s} ${y + 2} L${cx + 26 * s} ${y - 20} L${cx + 32 * s} ${y + 8} Z`} fill={c} /><path d={`M${cx + 18 * s} ${y + 2} L${cx + 25 * s} ${y - 10} L${cx + 28 * s} ${y + 4} Z`} fill={c2} stroke="none" /></g>)}</g>;
    case 3: return <g>{[-1, 1].map((s) => <path key={s} d={`M${cx + 34 * s} ${hy - 8} q${14 * s} -22 ${26 * s} -18 q${-4 * s} 6 ${-2 * s} 8 q${-6 * s} 2 ${-6 * s} 6 q${-6 * s} 2 ${-6 * s} 6 Z`} fill={c} />)}<path d={`M${cx + 40} ${hy - 12} l8 -6 M${cx - 40} ${hy - 12} l-8 -6`} stroke={c2} strokeWidth="2" /></g>;
    case 4: return <g>{[-1, 1].map((s) => <path key={s} d={`M${cx + 10 * s} ${y + 4} Q${cx + 14 * s} ${y - 14} ${cx + 24 * s} ${y - 16} Q${cx + 20 * s} ${y - 6} ${cx + 20 * s} ${y + 6} Z`} fill={c} />)}</g>;
    case 5: return <g><ellipse cx={cx} cy={y - 12} rx="20" ry="5.5" fill="none" stroke={c} strokeWidth="5" /><ellipse cx={cx} cy={y - 12} rx="20" ry="5.5" fill="none" stroke={c2} strokeWidth="1.5" /></g>;
    case 6: return <g transform={`translate(${cx + 20} ${y + 4})`}><path d="M0 0 L-16 -10 L-14 10 Z M0 0 L16 -10 L14 10 Z" fill={c} /><circle r="5" fill={c2} /></g>;
    case 7: return <g transform={`translate(${cx + 24} ${y + 8})`}>{[0, 72, 144, 216, 288].map((d) => <circle key={d} cx={7 * Math.cos((d * Math.PI) / 180)} cy={7 * Math.sin((d * Math.PI) / 180)} r="5.5" fill={c} />)}<circle r="4" fill={c2} /></g>;
    case 8: return <g><path d={`M${cx - 24} ${y + 6} Q${cx - 10} ${y - 30} ${cx + 14} ${y - 50} Q${cx + 10} ${y - 24} ${cx + 24} ${y + 6} Z`} fill={c} /><ellipse cx={cx} cy={y + 6} rx="44" ry="9" fill={c} /><path d={`M${cx - 22} ${y} Q${cx} ${y + 6} ${cx + 22} ${y}`} fill="none" stroke={c2} strokeWidth="4" /><path d={`M${cx + 2} ${y - 22} l2 5 h5 l-4 3 l2 5 l-5 -3 l-5 3 l2 -5 l-4 -3 h5 Z`} fill={c2} strokeWidth="1" /></g>;
    case 9: return <g><path d={`M${cx - 22} ${y + 8} L${cx - 18} ${y - 4} L${cx - 9} ${y + 2} L${cx} ${y - 12} L${cx + 9} ${y + 2} L${cx + 18} ${y - 4} L${cx + 22} ${y + 8} Z`} fill={c} /><circle cx={cx} cy={y - 1} r="3.5" fill={c2} /></g>;
    case 10: return <g><ellipse cx={cx + 4} cy={y + 2} rx="38" ry="14" fill={c} transform={`rotate(-8 ${cx} ${y})`} /><rect x={cx + 2} y={y - 16} width="4" height="6" fill={c2} /></g>;
    default: return <g><circle cx={cx} cy={y - 10} r="10" fill={c} /><path d={`M${cx} ${y - 20} v-5`} strokeWidth="2" /><path d={`M${cx + 1} ${y - 24} q8 -6 12 0 q-6 5 -12 0 Z`} fill={c2} strokeWidth="1.5" /></g>;
  }
}
