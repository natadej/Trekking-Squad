import type { PlanItem, Profile } from '../types';
import Hero from '../components/Hero';
import { photoUrl } from '../data/placeInfo';
import { QUESTS } from '../profile';
import { dayLabel, hm, nowPT } from '../time';
import { KIND, YesNo, mapsLink, placeName, uberLink } from '../ui';
import { hotelName } from '../trip';
import { travelMin } from '../planner';
import { contestAvg, goalsOf, trophyOf } from '../trophy';

const TIPS = [
  '💧 Drink a glass of water every hour. The desert air is very dry.',
  '🪑 Sit for 10 minutes between long walks. Casinos are bigger than they look.',
  '👟 Comfortable shoes beat smart shoes. Most people walk 8–12 km a day here.',
  '🌙 Aim for 7 hours of sleep. Late nights add up fast in Vegas.',
  '🧴 Use sunscreen and lip balm, even in December.',
];

export interface Question { id: string; icon: string; q: string; yes?: string; no?: string; onYes: () => void; onNo: () => void }

interface Props {
  p: Profile;
  plan: PlanItem[];
  questions: Question[];
  onImport: () => void;
  go: (tab: string) => void;
  checkIn?: { item: PlanItem; claim: () => void };
}

export default function Home({ p, plan, questions, onImport, go, checkIn }: Props) {
  const now = nowPT();
  const upcoming = plan.filter((i) => i.day > now.day || (i.day === now.day && i.end > now.min));
  const next = upcoming[0];
  const prevSame = next && plan[plan.indexOf(next) - 1];
  const first = plan[0];
  const daysTo = first ? Math.ceil((Date.parse(first.day) - Date.parse(now.day)) / 86400000) : 0;
  const leaveBy = next && prevSame && prevSame.day === next.day && prevSame.place !== next.place ? next.start - travelMin(prevSame.place, next.place) : undefined;
  const q = questions[0];
  const t = p.trip;

  return (
    <div className="screen">
      {(() => {
        const st = p.steps?.[now.day] ?? 0, goal = goalsOf(p).day, pct = Math.min(1, st / goal), R = 52, L = 2 * Math.PI * R, c = contestAvg(p.steps), tr = trophyOf(c.avg);
        return (
          <div className="hero-banner">
            <div className="hb-left">
              <Hero a={p.avatar} size={96} wave />
              <div>
                <h1>Hi, {p.nick.split(' ')[0]}</h1>
                <p>{daysTo > 0 ? `${daysTo} days to re:Invent` : 'Your Vegas trip is on'}</p>
                <span className="hb-pts">{tr.icon} {c.avg.toLocaleString()} a day · {tr.id === 'none' ? 'no trophy yet' : tr.name}</span>
              </div>
            </div>
            <button className="ring" onClick={() => go('top')} aria-label={`${st} of ${goal.toLocaleString()} steps today. Open the leaderboard`}>
              <svg viewBox="0 0 120 120" aria-hidden><defs><linearGradient id="rg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#fbbf24" /><stop offset="1" stopColor="#f472b6" /></linearGradient></defs>
                <circle cx="60" cy="60" r={R} className="ring-bg" /><circle cx="60" cy="60" r={R} className="ring-fg" stroke="url(#rg)" strokeDasharray={L} strokeDashoffset={L * (1 - pct)} /></svg>
              <span><b>{st.toLocaleString()}</b><small>of {goal >= 1000 ? `${Math.round(goal / 100) / 10}k` : goal} steps</small></span>
            </button>
          </div>
        );
      })()}

      <div className="quick">
        <button onClick={() => go('map')} className="q-map"><span>🗺️</span>3D map</button>
        <button onClick={() => go('plan')} className="q-plan"><span>🗓️</span>Trip plan</button>
        <button onClick={() => go('top')} className="q-top"><span>🏆</span>Leaders</button>
        <button onClick={onImport} className="q-mail"><span>📩</span>Add booking</button>
      </div>

      {checkIn && (
        <div className="card checkin pop">
          <p><b>You made it to {checkIn.item.title}!</b></p>
          <button className="btn yes big" onClick={checkIn.claim}>✅ Check in: +50 points</button>
        </div>
      )}

      {next && (
        <div className={`card next ${KIND[next.kind].cls}`}>
          {photoUrl(next.place) && <div className="next-photo" style={{ backgroundImage: `url(${photoUrl(next.place)})` }} />}
          <p className="label">{daysTo > 0 ? 'First on your plan' : 'Next on your plan'}</p>
          <h2>{KIND[next.kind].icon} {next.title}</h2>
          <p>{dayLabel(next.day, true)} · {hm(next.start)}{placeName(next) ? ` · ${placeName(next)}` : ''}</p>
          {leaveBy !== undefined && <p className="tip">🚶 Leave by <b>{hm(leaveBy)}</b> to get there on time.</p>}
          <div className="row">
            {mapsLink(next.place) && <a className="btn" href={mapsLink(next.place)} target="_blank" rel="noreferrer">🧭 Directions</a>}
            {next.kind === 'ride' && <a className="btn" href={uberLink(t.hotelId)} target="_blank" rel="noreferrer">🚗 Open Uber</a>}
            <button className="btn ghost" onClick={() => go('plan')}>See full plan</button>
          </div>
        </div>
      )}

      <p className="tip health">{TIPS[Math.floor(now.min / 60) % TIPS.length]}</p>

      {q && <YesNo key={q.id} icon={q.icon} q={q.q} yes={q.yes} no={q.no} onYes={q.onYes} onNo={q.onNo} />}

      <div className="card trip">
        <h2>🧳 My trip</h2>
        <ul className="trip-list">
          <li>{t.arrive ? <>✈️ Land <b>{dayLabel(t.arrive.arrDate)} {hm(t.arrive.arrTime)}</b> · {t.arrive.airline} {t.arrive.number}</> : <span className="muted">✈️ No flight yet</span>}</li>
          <li>{t.hotelId ? <>🏨 <b>{hotelName(t.hotelId)}</b>{t.hotelIn ? ` · ${dayLabel(t.hotelIn)} to ${dayLabel(t.hotelOut || t.hotelIn)}` : ''}</> : <span className="muted">🏨 No hotel yet</span>}</li>
          <li>{t.depart ? <>🏠 Fly home <b>{dayLabel(t.depart.depDate)} {hm(t.depart.depTime)}</b> · {t.depart.number}</> : <span className="muted">🏠 No flight home yet</span>}</li>
        </ul>
        <button className="btn ghost" onClick={onImport}>📩 Add a booking email</button>
      </div>

      <details className="card start">
        <summary><h2>✅ Getting started</h2></summary>
        <ul className="quests">
          {QUESTS.map((x) => {
            const done = p.quests.includes(x.id);
            return (
              <li key={x.id} className={done ? 'done' : ''}>
                <span className="q-ico">{done ? '✅' : x.icon}</span>
                <span className="q-title">{x.title}</span>
                <span className="chip gold">{done ? 'Done' : `+${x.points}`}</span>
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
