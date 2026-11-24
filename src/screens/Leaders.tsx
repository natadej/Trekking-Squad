import { useState } from 'react';
import { cloud, stepStats, type Leader } from '../cloud';
import type { Profile } from '../types';
import { nowPT } from '../time';
import { CONTEST_LABEL, TROPHIES, contestAvg, goalsOf, trophyOf } from '../trophy';
import Hero from '../components/Hero';

interface Props { p: Profile; rows: Leader[]; uid?: string; live: boolean; counting: boolean; startSteps: () => void }

export default function Leaders({ p, rows, uid, live, counting, startSteps }: Props) {
  const [span, setSpan] = useState<'trophy' | 'today'>('trophy');
  const day = nowPT().day;
  const c = contestAvg(p.steps), g = goalsOf(p);
  const mine: Leader = { uid: uid ?? 'me', nick: p.nick, points: p.points, avatar: p.avatar, coins: p.coins.length, ...stepStats(p), avg: c.avg, days: c.days, goalDay: g.day, goalTrip: g.trip };
  const all = live ? [mine, ...rows.filter((r) => r.uid !== mine.uid)] : [mine];
  const today = (r: Leader) => (r.stepsDay === day ? r.stepsToday ?? 0 : 0);
  const key = (r: Leader) => (span === 'trophy' ? r.avg ?? 0 : today(r));
  const list = [...all].sort((a, b) => key(b) - key(a) || (b.stepsTotal ?? 0) - (a.stepsTotal ?? 0));
  const me = trophyOf(c.avg), nextT = TROPHIES[TROPHIES.indexOf(me) - 1];
  const row = (r: Leader, i: number) => {
    const mine_ = r.uid === mine.uid;
    return (
      <li key={r.uid} className={mine_ ? 'me' : ''}>
        <span className="rank">{i + 1}</span>
        <span className="mini"><Hero a={r.avatar} size={90} /></span>
        <span><b>{r.nick}</b>{mine_ && <span className="chip gold" style={{ marginLeft: 6 }}>You</span>}<br />
          <span className="small muted">{span === 'trophy' ? `${(r.stepsTotal ?? 0).toLocaleString()} steps · ${r.days ?? 0} days` : `goal ${(r.goalDay ?? 10000).toLocaleString()}`}</span></span>
        <b>👣 {key(r).toLocaleString()}{span === 'trophy' && <small className="muted">/day</small>}</b>
      </li>
    );
  };
  return (
    <div className="screen">
      <div className="card tro-me">
        <h1>🏆 Step contest</h1>
        <p className="muted">{CONTEST_LABEL} · ranked by average steps a day</p>
        <div className="tro-big"><span>{me.icon}</span><div><b>{c.avg.toLocaleString()}</b> steps a day<br /><small>{me.id === 'none' ? 'Walk more than 7,000 a day for Bronze' : me.name}{nextT ? ` · ${(nextT.min + 1 - c.avg).toLocaleString()} more a day for ${nextT.icon}` : ''}</small></div></div>
        <p className="small muted">Trip so far: {c.total.toLocaleString()} of {g.trip.toLocaleString()} steps</p>
        <p className="small muted">{live ? '🟢 Live world ranking' : cloud() ? '⚪ Connecting to the world ranking…' : '⚪ This phone only for now.'}</p>
        {!counting && <button className="btn primary big" onClick={startSteps}>👣 Start counting my steps</button>}
      </div>
      <div className="seg" role="group" aria-label="Ranking">
        <button className={span === 'trophy' ? 'on' : ''} aria-pressed={span === 'trophy'} onClick={() => setSpan('trophy')}>🏆 Trophies</button>
        <button className={span === 'today' ? 'on' : ''} aria-pressed={span === 'today'} onClick={() => setSpan('today')}>☀️ Today</button>
      </div>
      {span === 'today' ? <ol className="leaders">{list.map(row)}</ol> : TROPHIES.map((t) => {
        const grp = list.filter((r) => trophyOf(r.avg ?? 0) === t);
        return (
          <section key={t.id} className={`tro-grp ${t.id}`}>
            <h2>{t.icon} {t.name} <small>{t.min ? `more than ${t.min.toLocaleString()} a day` : 'up to 7,000 a day'}</small></h2>
            {grp.length ? <ol className="leaders">{grp.map((r) => row(r, list.indexOf(r)))}</ol> : <p className="small muted">Nobody yet.</p>}
          </section>
        );
      })}
    </div>
  );
}
