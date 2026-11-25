import { EP } from '../episode';
import type { PlanItem, Profile } from '../types';
import Hero from '../components/Hero';
import { photoUrl } from '../data/placeInfo';
import { QUESTS } from '../profile';
import { dayLabel, hm, nowPT } from '../time';
import { KIND, YesNo, mapsLink, placeName, uberLink } from '../ui';
import { hotelName } from '../trip';
import { travelMin } from '../planner';
import { contestAvg, goalsOf, trophyOf } from '../trophy';
import { useState } from 'react';
import { placeById, PLACES, distanceM } from '../data/places';
import { walkTo } from '../planner';
import { CHEST_EVERY, badgesOf, streakOf } from '../walks';

const TIPS = [
  '💧 Drink a glass of water every hour. The desert air is very dry.',
  '🪑 Sit for 10 minutes between long walks. Casinos are bigger than they look.',
  '👟 Comfortable shoes beat smart shoes. Most people walk 8–12 km a day here.',
  '🌙 Aim for 7 hours of sleep. Late nights add up fast on a trip.',
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
  me?: { lat: number; lng: number } | null;
  onWalk: (w: { id: string; title: string; steps: number; place?: string }) => void;
  onStopWalk: () => void;
}

const GOALS = [1000, 2000, 3000];

function WalkCard({ p, plan, me, onWalk, onStopWalk }: Pick<Props, 'p' | 'plan' | 'me' | 'onWalk' | 'onStopWalk'>) {
  const now = nowPT();
  const [pick, setPick] = useState(0);
  const done = p.walks ?? [], streak = streakOf(done, now.day), left = CHEST_EVERY - (done.length % CHEST_EVERY), badges = badgesOf(done);
  const w = p.walkNow, st = p.steps?.[now.day] ?? 0;
  const stats = <p className="walk-stats">🔥 <b>{streak}</b>-day streak · 🎁 {left} walk{left > 1 ? 's' : ''} to the next chest{badges.length ? <> · {badges.map((b) => <span key={b.n} title={b.name}>{b.icon}</span>)}</> : null}</p>;
  if (w) {
    const got = Math.max(0, st - w.base), pct = Math.min(100, (got / w.goal) * 100);
    return (
      <div className="card walk on pop">
        <p className="label">🚶 Walk in progress</p>
        <h2>{w.title}</h2>
        <div className="walk-bar" aria-label={`${got} of ${w.goal} steps`}><i style={{ width: `${pct}%` }} /></div>
        <p><b>{got.toLocaleString()}</b> of {w.goal.toLocaleString()} steps · {Math.max(0, w.goal - got).toLocaleString()} to go</p>
        {stats}
        <button className="btn ghost small" onClick={onStopWalk}>Stop this walk</button>
      </div>
    );
  }
  const planned = plan.find((i) => i.kind === 'walk' && !i.tentative && i.day === now.day && i.end > now.min && i.start - 30 <= now.min && !done.some((d) => d.id === i.id));
  const from = me && PLACES.some((x) => distanceM(me, x) < 400) ? PLACES.filter((x) => x.id !== 'airport').sort((a, b) => distanceM(me, a) - distanceM(me, b))[0] : placeById(p.trip.hotelId) ?? placeById(EP.defaultHotel)!;
  const goal = GOALS[pick % 3], quick = walkTo(from, goal, Math.floor(pick / 3));
  const offer = planned ? { id: planned.id, title: planned.title, steps: planned.steps ?? goal, place: planned.place, why: planned.note?.split(' ~')[0] } : quick && { id: `quick-${now.day}-${now.min}`, title: `${quick.to.icon} ${quick.title}`, steps: quick.steps, place: from.id, why: quick.to.why };
  if (!offer) return null;
  return (
    <div className="card walk pop">
      <p className="label">{planned ? '🚶 Walk challenge in your free time' : '🚶 Quick walk challenge'}</p>
      <h2>{offer.title}</h2>
      {offer.why && <p className="walk-why">{offer.why}</p>}
      <p className="small">About <b>{offer.steps.toLocaleString()} steps</b> there and back · {Math.ceil(offer.steps / 100)} min · reward <b>+{Math.round(offer.steps / 10)} points</b></p>
      {stats}
      <div className="row">
        <button className="btn gold big" onClick={() => onWalk(offer)}>▶️ Start walk</button>
        {!planned && <button className="btn ghost" onClick={() => setPick(pick + 1)}>🔀 Another walk</button>}
      </div>
    </div>
  );
}

export default function Home({ p, plan, questions, onImport, go, checkIn, me, onWalk, onStopWalk }: Props) {
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
                <p>{daysTo > 0 ? (EP.event ? `${daysTo} days to re:Invent` : `${daysTo} days to ${EP.city}`) : `Your ${EP.city} trip is on`}</p>
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
        <button onClick={() => go('map')} className="q-map"><span>🗺️</span>Map</button>
        <button onClick={() => go('plan')} className="q-plan"><span>🗓️</span>Trip plan</button>
        <button onClick={() => go('top')} className="q-top"><span>🏆</span>Leaders</button>
        <button onClick={onImport} className="q-mail"><span>📩</span>Add booking</button>
      </div>

      <WalkCard p={p} plan={plan} me={me} onWalk={onWalk} onStopWalk={onStopWalk} />

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
            {EP.uber && next.kind === 'ride' && <a className="btn" href={uberLink(t.hotelId)} target="_blank" rel="noreferrer">🚗 Open Uber</a>}
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
