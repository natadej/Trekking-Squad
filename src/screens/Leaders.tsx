import type { Leader } from '../cloud';
import type { Profile } from '../types';
import Hero from '../components/Hero';

export default function Leaders({ p, rows, uid, live }: { p: Profile; rows: Leader[]; uid?: string; live: boolean }) {
  const list = live ? rows : [{ uid: 'me', nick: p.nick, points: p.points, avatar: p.avatar, coins: p.coins.length }];
  const medal = ['🥇', '🥈', '🥉'];
  return (
    <div className="screen">
      <div className="card">
        <h1>🏆 World leaderboard</h1>
        <p className="muted">{live ? '🟢 Live! Scores update by themselves.' : '⚪ Save your hero online to join the world board.'}</p>
        <p className="small muted">Get points by doing quests, visiting places on the map and checking in to classes. Only hero names are shown.</p>
      </div>
      <ol className="leaders">
        {list.map((r, i) => {
          const me = r.uid === uid || r.uid === 'me';
          return (
            <li key={r.uid} className={me ? 'me' : ''}>
              <span className="rank">{medal[i] || i + 1}</span>
              <span className="mini"><Hero a={r.avatar} size={90} /></span>
              <span><b>{r.nick}</b>{me && <span className="chip gold" style={{ marginLeft: 6 }}>YOU</span>}<br /><span className="small muted">🪙 {r.coins} places</span></span>
              <b>⭐ {r.points}</b>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
