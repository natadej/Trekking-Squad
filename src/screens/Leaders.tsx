import { useState } from 'react';
import { stepStats, type Leader } from '../cloud';
import type { Profile } from '../types';
import { nowPT } from '../time';
import Hero from '../components/Hero';

interface Props { p: Profile; rows: Leader[]; uid?: string; live: boolean; counting: boolean; startSteps: () => void }

export default function Leaders({ p, rows, uid, live, counting, startSteps }: Props) {
  const [span, setSpan] = useState<'today' | 'trip'>('today');
  const day = nowPT().day;
  const mine: Leader = { uid: uid ?? 'me', nick: p.nick, points: p.points, avatar: p.avatar, coins: p.coins.length, ...stepStats(p) };
  const all = live ? [mine, ...rows.filter((r) => r.uid !== mine.uid)] : [mine];
  const stepsOf = (r: Leader) => (span === 'trip' ? r.stepsTotal ?? 0 : r.stepsDay === day ? r.stepsToday ?? 0 : 0);
  const list = [...all].sort((a, b) => stepsOf(b) - stepsOf(a) || b.points - a.points);
  const medal = ['🥇', '🥈', '🥉'];
  return (
    <div className="screen">
      <div className="card">
        <h1>🏆 Step leaderboard</h1>
        <p className="muted">{live ? '🟢 Live! Steps update by themselves.' : '⚪ Save your hero online to join the world board.'}</p>
        <p className="small muted">Walk around Vegas to climb. Visiting shops and places gives bonus zeny. Only hero names are shown.</p>
        {!counting && <button className="btn primary big" onClick={startSteps}>👣 Start counting my steps</button>}
      </div>
      <div className="seg" role="group" aria-label="Time">
        <button className={span === 'today' ? 'on' : ''} aria-pressed={span === 'today'} onClick={() => setSpan('today')}>☀️ Today</button>
        <button className={span === 'trip' ? 'on' : ''} aria-pressed={span === 'trip'} onClick={() => setSpan('trip')}>🧳 Whole trip</button>
      </div>
      <ol className="leaders">
        {list.map((r, i) => {
          const me = r.uid === mine.uid, s = stepsOf(r);
          return (
            <li key={r.uid} className={me ? 'me' : ''}>
              <span className="rank">{medal[i] || i + 1}</span>
              <span className="mini"><Hero a={r.avatar} size={90} /></span>
              <span><b>{r.nick}</b>{me && <span className="chip gold" style={{ marginLeft: 6 }}>YOU</span>}<br /><span className="small muted">{((s * 0.75) / 1000).toFixed(1)} km · 🪙 {r.points} z</span></span>
              <b>👣 {s.toLocaleString()}</b>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
