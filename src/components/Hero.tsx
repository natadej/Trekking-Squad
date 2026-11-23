import type { Avatar } from '../types';
import { LOOKS } from '../data/looks';

const OUT = '#2b2140';

export default function Hero({ a, size = 160, wave = false }: { a: Avatar; size?: number; wave?: boolean }) {
  const fem = a.body % 2 === 1;
  const kind = Math.floor(a.body / 2); // 0 normal, 1 tall, 2 strong, 3 little, 4 sporty
  const tw = kind === 2 ? 50 : kind === 3 ? 38 : 42; // torso width
  const leg = kind === 1 ? 52 : kind === 3 ? 34 : 44;
  const top = kind === 3 ? 96 : 88; // torso top
  const torsoH = kind === 3 ? 40 : 46;
  const skin = LOOKS.skin[a.skin]?.color ?? '#f1c193';
  const hairC = LOOKS.hairColor[a.hairColor]?.color ?? '#1f1a17';
  const shirt = LOOKS.shirt[a.shirt] ?? LOOKS.shirt[0];
  const dress = a.dress ? LOOKS.dress[a.dress] : undefined;
  const bottom = LOOKS.bottom[a.bottom] ?? LOOKS.bottom[0];
  const shoe = LOOKS.shoes[a.shoes] ?? LOOKS.shoes[0];
  const hat = LOOKS.hat[a.hat];
  const gl = LOOKS.glasses[a.glasses];
  const cx = 60, hy = top - 36, hr = 30;
  const x0 = cx - tw / 2, x1 = cx + tw / 2;
  const legTop = top + torsoH;
  const footY = legTop + leg;
  const skirt = a.bottom === 6 || a.bottom === 7;
  const shorts = a.bottom === 4 || a.bottom === 5;
  const H = footY + 16;

  return (
    <svg viewBox={`0 0 120 ${H}`} width={size * (120 / H) * (H / 200)} height={size * (H / 200)} role="img" aria-label="Your hero" className={wave ? 'hero wave' : 'hero'}>
      <g stroke={OUT} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* back hair */}
        {a.hair === 4 && <path d={`M${cx - 32} ${hy} Q${cx - 36} ${hy + 46} ${cx - 26} ${top + 18} L${cx + 26} ${top + 18} Q${cx + 36} ${hy + 46} ${cx + 32} ${hy} Z`} fill={hairC} />}
        {a.hair === 5 && <path d={`M${cx + 26} ${hy - 14} q24 6 18 40 q-4 18 -12 22 q2 -24 -10 -40 Z`} fill={hairC} />}
        {a.hair === 7 && <>
          <path d={`M${cx - 28} ${hy + 6} q-8 30 -2 58`} fill="none" stroke={hairC} strokeWidth="9" />
          <path d={`M${cx + 28} ${hy + 6} q8 30 2 58`} fill="none" stroke={hairC} strokeWidth="9" />
        </>}
        {a.hair === 8 && <circle cx={cx} cy={hy - 30} r="20" fill={hairC} />}
        {a.hair === 9 && <path d={`M${cx - 33} ${hy - 4} Q${cx - 36} ${hy + 32} ${cx - 24} ${hy + 34} L${cx + 24} ${hy + 34} Q${cx + 36} ${hy + 32} ${cx + 33} ${hy - 4} Z`} fill={hairC} />}

        {/* legs */}
        {!dress && !skirt && <>
          <rect x={cx - 17} y={legTop - 4} width="15" height={shorts ? leg * 0.45 : leg} rx="5" fill={bottom.color} />
          <rect x={cx + 2} y={legTop - 4} width="15" height={shorts ? leg * 0.45 : leg} rx="5" fill={bottom.color} />
          {bottom.color2 && !shorts && <path d={`M${cx - 17} ${legTop + leg * 0.4} h15 M${cx + 2} ${legTop + leg * 0.6} h15`} stroke={bottom.color2} strokeWidth="4" />}
        </>}
        {(dress || skirt || shorts) && <>
          <rect x={cx - 15} y={legTop + (shorts ? leg * 0.4 : 4)} width="11" height={leg - (shorts ? leg * 0.4 : 4)} rx="5" fill={skin} />
          <rect x={cx + 4} y={legTop + (shorts ? leg * 0.4 : 4)} width="11" height={leg - (shorts ? leg * 0.4 : 4)} rx="5" fill={skin} />
        </>}
        {/* shoes */}
        {[cx - 10, cx + 10].map((x, i) => (
          <g key={i}>
            {a.shoes === 7
              ? <path d={`M${x - 10} ${footY + 2} h20 v5 h-20 Z`} fill={shoe.color} />
              : <path d={`M${x - (i ? 8 : 13)} ${footY + (a.shoes === 5 || a.shoes === 8 ? -10 : -2)} h${21} v12 q0 4 -4 4 h-17 q-4 0 -4 -4 Z`} fill={shoe.color} />}
            <path d={`M${x - (i ? 8 : 13)} ${footY + 10} h21`} stroke={shoe.color2} strokeWidth="3" />
          </g>
        ))}

        {/* arms */}
        <path d={`M${x0 + 2} ${top + 8} Q${x0 - 14} ${top + 26} ${x0 - 8} ${top + 44}`} fill="none" stroke={shirt.color} strokeWidth="12" />
        <circle cx={x0 - 8} cy={top + 46} r="6" fill={skin} />
        {wave
          ? <><path d={`M${x1 - 2} ${top + 8} Q${x1 + 16} ${top - 2} ${x1 + 16} ${top - 18}`} fill="none" stroke={shirt.color} strokeWidth="12" /><circle cx={x1 + 16} cy={top - 22} r="6" fill={skin} /></>
          : <><path d={`M${x1 - 2} ${top + 8} Q${x1 + 14} ${top + 26} ${x1 + 8} ${top + 44}`} fill="none" stroke={shirt.color} strokeWidth="12" /><circle cx={x1 + 8} cy={top + 46} r="6" fill={skin} /></>}

        {/* torso: dress or shirt */}
        {dress ? (
          <>
            <path d={`M${x0 + 4} ${top} h${tw - 8} l${10} ${torsoH + 14} h-${tw + 12} Z`} fill={dress.color} />
            {dress.color2 && a.dress !== 10 && [0, 1, 2].map((k) => <circle key={k} cx={cx - 12 + k * 12} cy={top + 24 + (k % 2) * 12} r="3" fill={dress.color2} stroke="none" />)}
            {a.dress === 10 && <path d={`M${x0 - 2} ${top + torsoH} h${tw + 4}`} stroke="#fde047" strokeWidth="5" />}
          </>
        ) : (
          <>
            {skirt && <path d={`M${x0 + 2} ${legTop - 6} h${tw - 4} l8 22 h-${tw + 12} Z`} fill={bottom.color} />}
            {skirt && bottom.color2 && <path d={`M${x0} ${legTop + 6} h${tw}`} stroke={bottom.color2} strokeWidth="3" />}
            <rect x={x0} y={top} width={tw} height={torsoH} rx="12" fill={shirt.color} />
            {a.shirt === 0 && <path d={`M${cx - 10} ${top + 22} q10 8 20 0 l-3 4`} fill="none" stroke={shirt.color2} strokeWidth="3" />}
            {a.shirt === 5 && [12, 24, 36].map((y) => <path key={y} d={`M${x0 + 2} ${top + y} h${tw - 4}`} stroke={shirt.color2} strokeWidth="4" />)}
            {(a.shirt === 6 || a.shirt === 9) && <path d={`M${cx} ${top + 2} v${torsoH - 4}`} stroke={shirt.color2} />}
            {(a.shirt === 2 || a.shirt === 7) && <path d={`M${cx - 8} ${top + 30} h16 v8 h-16 Z`} fill={shirt.color2} strokeWidth="2" />}
            {a.shirt === 3 && <path d={`M${cx - 8} ${top} l8 10 l8 -10`} fill={shirt.color2} />}
          </>
        )}
        {kind === 4 && <path d={`M${x0 - 14} ${top + 38} h10`} stroke="#ef4444" strokeWidth="5" />}

        {/* neck & head */}
        <rect x={cx - 7} y={hy + hr - 6} width="14" height="12" fill={skin} strokeWidth="0" />
        <circle cx={cx} cy={hy} r={hr} fill={skin} />
        <circle cx={cx - hr} cy={hy + 4} r="6" fill={skin} />
        <circle cx={cx + hr} cy={hy + 4} r="6" fill={skin} />

        {/* front hair */}
        <FrontHair style={a.hair} cx={cx} hy={hy} hr={hr} color={hairC} />

        {/* face */}
        <g strokeWidth="0" fill={OUT}>
          <ellipse cx={cx - 11} cy={hy + 2} rx="4" ry="5" />
          <ellipse cx={cx + 11} cy={hy + 2} rx="4" ry="5" />
          <circle cx={cx - 10} cy={hy} r="1.5" fill="#fff" />
          <circle cx={cx + 12} cy={hy} r="1.5" fill="#fff" />
        </g>
        {fem && <path d={`M${cx - 16} ${hy - 4} l-3 -3 M${cx + 16} ${hy - 4} l3 -3`} strokeWidth="2" />}
        <circle cx={cx - 19} cy={hy + 12} r="4" fill="#f9a8b8" stroke="none" opacity="0.7" />
        <circle cx={cx + 19} cy={hy + 12} r="4" fill="#f9a8b8" stroke="none" opacity="0.7" />
        <path d={`M${cx - 9} ${hy + 13} Q${cx} ${hy + 22} ${cx + 9} ${hy + 13}`} fill="#fff" strokeWidth="2.5" />

        {gl && a.glasses > 0 && <Glasses i={a.glasses} cx={cx} y={hy + 2} c={gl.color!} c2={gl.color2} />}
        {hat && a.hat > 0 && <Hat i={a.hat} cx={cx} y={hy - hr + 4} c={hat.color!} c2={hat.color2!} />}
        {kind === 4 && a.hat === 0 && <path d={`M${cx - 29} ${hy - 12} Q${cx} ${hy - 22} ${cx + 29} ${hy - 12}`} fill="none" stroke="#ef4444" strokeWidth="6" />}
      </g>
    </svg>
  );
}

function FrontHair({ style, cx, hy, hr, color }: { style: number; cx: number; hy: number; hr: number; color: string }) {
  const cap = `M${cx - hr - 1} ${hy - 2} Q${cx - hr} ${hy - hr - 6} ${cx} ${hy - hr - 4} Q${cx + hr} ${hy - hr - 6} ${cx + hr + 1} ${hy - 2}`;
  switch (style) {
    case 0: return <path d={`${cap} l-6 -8 l-6 6 l-6 -10 l-7 8 l-7 -10 l-7 8 l-7 -9 l-6 8 l-6 -6 Z`} fill={color} transform={`translate(0 -2)`} />;
    case 1: return <path d={`${cap} Q${cx} ${hy - hr + 6} ${cx - hr - 1} ${hy - 2} Z`} fill={color} opacity="0.85" />;
    case 2: return <path d={`${cap} Q${cx + 6} ${hy - 18} ${cx - 8} ${hy - 14} Q${cx - 22} ${hy - 12} ${cx - hr - 1} ${hy - 2} Z`} fill={color} />;
    case 3: return <g fill={color}>{[-24, -12, 0, 12, 24].map((d) => <circle key={d} cx={cx + d} cy={hy - hr + 2 + Math.abs(d) / 3} r="10" />)}</g>;
    case 8: return <path d={`${cap} Q${cx} ${hy - 20} ${cx - hr - 1} ${hy - 2} Z`} fill={color} />;
    case 6: return <g fill={color}><circle cx={cx - 24} cy={hy - hr + 2} r="11" /><circle cx={cx + 24} cy={hy - hr + 2} r="11" /><path d={`${cap} Q${cx} ${hy - 16} ${cx - hr - 1} ${hy - 2} Z`} /></g>;
    default: return <path d={`${cap} Q${cx + 10} ${hy - 12} ${cx} ${hy - 16} Q${cx - 14} ${hy - 12} ${cx - hr - 1} ${hy - 2} Z`} fill={color} />;
  }
}

function Glasses({ i, cx, y, c, c2 }: { i: number; cx: number; y: number; c: string; c2?: string }) {
  const L = cx - 11, R = cx + 11;
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
    case 8: return <rect x={cx - 24} y={y - 10} width="48" height="20" rx="8" fill={c} stroke="#2b2140" strokeWidth="2.5" />;
    case 9: return <rect x={cx - 24} y={y - 10} width="48" height="20" rx="10" fill={c2} stroke={c} strokeWidth="4" />;
    default: return <g stroke={c} fill="rgba(255,255,255,.3)" strokeWidth="2.5"><circle cx={R} cy={y} r="8" /><path d={`M${R + 6} ${y + 6} q4 14 -2 22`} fill="none" /></g>;
  }
}

function Hat({ i, cx, y, c, c2 }: { i: number; cx: number; y: number; c: string; c2: string }) {
  switch (i) {
    case 1: case 2: return <g><path d={`M${cx - 30} ${y + 8} Q${cx - 30} ${y - 24} ${cx} ${y - 24} Q${cx + 30} ${y - 24} ${cx + 30} ${y + 8} Z`} fill={c} /><path d={`M${cx + 20} ${y + 6} h28 q2 6 -6 6 h-22 Z`} fill={c} /><path d={`M${cx - 10} ${y - 4} q10 6 20 0`} stroke={c2} fill="none" strokeWidth="3" /></g>;
    case 3: return <g fill={c}><path d={`M${cx - 48} ${y + 6} Q${cx} ${y + 20} ${cx + 48} ${y + 6} Q${cx} ${y - 2} ${cx - 48} ${y + 6} Z`} /><path d={`M${cx - 24} ${y + 4} Q${cx - 26} ${y - 30} ${cx} ${y - 22} Q${cx + 26} ${y - 30} ${cx + 24} ${y + 4} Z`} /><path d={`M${cx - 24} ${y - 2} h48`} stroke={c2} strokeWidth="4" /></g>;
    case 4: return <g><path d={`M${cx - 31} ${y + 10} Q${cx - 31} ${y - 26} ${cx} ${y - 26} Q${cx + 31} ${y - 26} ${cx + 31} ${y + 10} Z`} fill={c} /><rect x={cx - 32} y={y + 2} width="64" height="10" rx="4" fill={c2} /><circle cx={cx} cy={y - 28} r="6" fill={c2} /></g>;
    case 5: return <g><path d={`M${cx - 16} ${y + 2} L${cx} ${y - 40} L${cx + 16} ${y + 2} Z`} fill={c} /><circle cx={cx} cy={y - 42} r="5" fill={c2} /><path d={`M${cx - 8} ${y - 12} l4 4 M${cx + 4} ${y - 24} l3 3`} stroke={c2} /></g>;
    case 6: return <path d={`M${cx - 24} ${y + 4} v-24 l12 12 l12 -18 l12 18 l12 -12 v24 Z`} fill={c} />;
    case 7: return <g fill="none"><path d={`M${cx - 33} ${y + 30} Q${cx - 34} ${y - 22} ${cx} ${y - 22} Q${cx + 34} ${y - 22} ${cx + 33} ${y + 30}`} stroke={c} strokeWidth="6" /><rect x={cx - 40} y={y + 20} width="12" height="20" rx="5" fill={c2} /><rect x={cx + 28} y={y + 20} width="12" height="20" rx="5" fill={c2} /></g>;
    case 8: return <path d={`M${cx - 40} ${y + 10} L${cx - 26} ${y - 18} Q${cx} ${y - 26} ${cx + 26} ${y - 18} L${cx + 40} ${y + 10} Q${cx} ${y + 2} ${cx - 40} ${y + 10} Z`} fill={c} />;
    case 9: return <g><path d={`M${cx - 40} ${y + 8} Q${cx} ${y + 16} ${cx + 40} ${y + 8} L${cx + 6} ${y - 50} Z`} fill={c} /><path d={`M${cx - 6} ${y - 14} l3 6 l-6 0 Z M${cx + 10} ${y - 2} l2 4`} stroke={c2} /></g>;
    default: return <g fill={c}><ellipse cx={cx - 14} cy={y - 20} rx="8" ry="22" /><ellipse cx={cx + 14} cy={y - 20} rx="8" ry="22" /><ellipse cx={cx - 14} cy={y - 18} rx="3" ry="14" fill={c2} stroke="none" /><ellipse cx={cx + 14} cy={y - 18} rx="3" ry="14" fill={c2} stroke="none" /></g>;
  }
}
