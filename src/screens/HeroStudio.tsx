import { useState } from 'react';
import type { Avatar, Profile } from '../types';
import Hero from '../components/Hero';
import { LOOKS, LOOK_TABS, type LookKey } from '../data/looks';
import { randomNick } from '../profile';
import { INTERESTS } from '../data/interests';

interface Props {
  p: Profile;
  setAvatar: (a: Avatar) => void;
  setNick: (n: string) => void;
  addInterest: (id: string) => void;
  account: React.ReactNode;
}

export default function HeroStudio({ p, setAvatar, setNick, addInterest, account }: Props) {
  const [cat, setCat] = useState<LookKey>('job');
  const opts = LOOKS[cat];
  const a = p.avatar;
  const job = LOOKS.job[a.job ?? 0] ?? LOOKS.job[0];
  const skill = INTERESTS.find((i) => i.id === job.interest);
  return (
    <div className="screen">
      <div className="card studio">
        <Hero a={a} size={220} wave />
        <p className="nametag">{p.nick}</p>
        <p className="label">JOB: {job.name.toUpperCase()}</p>
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
        {cat === 'job' && skill && (
          <div className="tip bubble">
            {job.icon} <b>{job.name}</b> loves <b>{skill.icon} {skill.label}</b> classes.
            {!p.prefs.interests.includes(skill.id) && <button className="btn small yes" style={{ marginLeft: 8 }} onClick={() => addInterest(skill.id)}>👍 Add to my classes</button>}
          </div>
        )}
        <div className="opts">
          {opts.map((o, i) => {
            const on = a[cat] === i;
            const preview = { ...a, [cat]: i };
            const swatch = cat === 'job' ? <span style={{ height: 52, overflow: 'hidden' }}><Hero a={preview} size={64} /></span>
              : o.color ? <span className="sw" style={{ background: o.color2 && cat !== 'hat' ? `linear-gradient(135deg, ${o.color} 60%, ${o.color2} 60%)` : o.color }} />
              : cat === 'body' || cat === 'hair' ? <span style={{ height: 40, overflow: 'hidden' }}><Hero a={preview} size={cat === 'hair' ? 70 : 52} /></span>
              : <span className="sw" style={{ background: '#fff' }}>🚫</span>;
            return (
              <button key={i} className={`opt ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setAvatar(preview)}>
                {swatch}
                {o.icon ? `${o.icon} ${o.name}` : o.name}
              </button>
            );
          })}
        </div>
      </div>
      {account}
    </div>
  );
}
