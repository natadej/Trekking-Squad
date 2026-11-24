import type { PlanItem, Profile } from '../types';
import Hero from '../components/Hero';
import { LOOKS } from '../data/looks';
import { QUESTS } from '../profile';
import { dayLabel, hm, nowPT } from '../time';
import { KIND, YesNo, mapsLink, placeName, uberLink } from '../ui';
import { hotelName } from '../trip';
import { travelMin } from '../planner';

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
      <div className="hello card">
        <Hero a={p.avatar} size={130} wave />
        <div>
          <p className="label">Level {Math.min(99, 1 + Math.floor(p.points / 100))} · {(LOOKS.job[p.avatar.job ?? 0] ?? LOOKS.job[0]).name}</p>
          <h1>{p.nick}</h1>
          <p className="muted">{daysTo > 0 ? `${daysTo} days until Episode RIV2026 at Vegas!` : 'Episode RIV2026 at Vegas is ON!'}</p>
          <div className="chips">
            <span className="chip gold">🪙 {p.points.toLocaleString()} points</span>
            <span className="chip">🪙 {p.coins.length} places</span>
          </div>
        </div>
      </div>

      {checkIn && (
        <div className="card checkin pop">
          <p><b>You made it to {checkIn.item.title}!</b></p>
          <button className="btn yes big" onClick={checkIn.claim}>✅ Check in: +50 points</button>
        </div>
      )}

      {next && (
        <div className={`card next ${KIND[next.kind].cls}`}>
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

      {(() => {
        const s = p.steps?.[now.day] ?? 0;
        return (
          <div className="card">
            <h2>👣 Today's walk</h2>
            <p className="steps-line"><b>{s.toLocaleString()}</b> of 10,000 steps · {((s * 0.75) / 1000).toFixed(1)} km</p>
            <div className="bar" aria-hidden><i style={{ width: `${Math.min(100, s / 100)}%` }} /></div>
            <p className="small muted">{TIPS[Math.floor(now.min / 60) % TIPS.length]}</p>
            <button className="btn ghost" onClick={() => go('top')}>🏆 Step leaderboard</button>
          </div>
        );
      })()}

      {q && <YesNo key={q.id} icon={q.icon} q={q.q} yes={q.yes} no={q.no} onYes={q.onYes} onNo={q.onNo} />}

      <div className="card trip">
        <h2>🧳 My trip</h2>
        <ul className="trip-list">
          <li>{t.arrive ? <>✈️ Land <b>{dayLabel(t.arrive.arrDate)} {hm(t.arrive.arrTime)}</b> · {t.arrive.airline} {t.arrive.number}</> : <span className="muted">✈️ No flight yet</span>}</li>
          <li>{t.hotelId ? <>🏨 <b>{hotelName(t.hotelId)}</b>{t.hotelIn ? ` · ${dayLabel(t.hotelIn)} to ${dayLabel(t.hotelOut || t.hotelIn)}` : ''}</> : <span className="muted">🏨 No hotel yet</span>}</li>
          <li>{t.depart ? <>🏠 Fly home <b>{dayLabel(t.depart.depDate)} {hm(t.depart.depTime)}</b> · {t.depart.number}</> : <span className="muted">🏠 No flight home yet</span>}</li>
        </ul>
        <button className="btn primary big" onClick={onImport}>📩 Add a booking email</button>
        <p className="muted small">Paste or forward a flight or hotel confirmation. The details are filled in for you.</p>
      </div>

      <div className="card">
        <h2>✅ Getting started</h2>
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
      </div>
    </div>
  );
}
