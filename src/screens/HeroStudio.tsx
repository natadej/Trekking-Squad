import { useState } from 'react';
import type { Avatar, Profile } from '../types';
import Hero from '../components/Hero';
import { LOOKS, LOOK_TABS, type LookKey } from '../data/looks';
import { randomNick } from '../profile';

interface Props {
  p: Profile;
  setAvatar: (a: Avatar) => void;
  setNick: (n: string) => void;
  account: React.ReactNode;
}

export default function HeroStudio({ p, setAvatar, setNick, account }: Props) {
  const [cat, setCat] = useState<LookKey>('body');
  const opts = LOOKS[cat];
  const a = p.avatar;
  return (
    <div className="screen">
      <div className="card studio">
        <Hero a={a} size={220} wave />
        <h1 style={{ marginTop: 8 }}>{p.nick}</h1>
        <div className="row">
          <button className="btn small" onClick={() => setNick(randomNick())}>🎲 New hero name</button>
          <button className="btn small" onClick={() => {
            const r = { ...a };
            for (const t of LOOK_TABS) r[t.key] = Math.floor(Math.random() * LOOKS[t.key].length);
            setAvatar(r);
          }}>✨ Surprise me</button>
        </div>
      </div>
      <div className="cats" role="tablist">
        {LOOK_TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={cat === t.key} className={`chip ${cat === t.key ? 'on' : ''}`} onClick={() => setCat(t.key)}>{t.icon} {t.label}</button>
        ))}
      </div>
      <div className="card">
        <div className="opts">
          {opts.map((o, i) => {
            const on = a[cat] === i;
            const preview = { ...a, [cat]: i };
            const swatch = o.color ? <span className="sw" style={{ background: o.color2 && cat !== 'hat' ? `linear-gradient(135deg, ${o.color} 60%, ${o.color2} 60%)` : o.color }} />
              : cat === 'body' || cat === 'hair' ? <span style={{ height: 40, overflow: 'hidden' }}><Hero a={preview} size={cat === 'hair' ? 70 : 40} /></span>
              : <span className="sw" style={{ background: '#fff' }}>🚫</span>;
            return (
              <button key={i} className={`opt ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setAvatar(preview)}>
                {swatch}
                {o.name}
              </button>
            );
          })}
        </div>
      </div>
      {account}
    </div>
  );
}
