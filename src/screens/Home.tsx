import type { PlanItem, Profile } from '../types';
import Hero from '../components/Hero';
import { QUESTS } from '../profile';
import { dayLabel, hm, nowPT } from '../time';
import { KIND, YesNo, mapsLink, placeName, uberLink } from '../ui';
import { hotelName } from '../trip';
import { travelMin } from '../planner';

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
          <p className="label">PLAYER 1</p>
          <h1>{p.nick}</h1>
          <p className="muted">{daysTo > 0 ? `${daysTo} days until Episode RIV2026 at Vegas!` : 'Episode RIV2026 at Vegas is ON!'}</p>
          <div className="chips">
            <span className="chip gold">⭐ {p.points} points</span>
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
          <p className="label">{daysTo > 0 ? 'First stage' : 'Next stage'}</p>
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

      {q && <YesNo key={q.id} icon={q.icon} q={q.q} yes={q.yes} no={q.no} onYes={q.onYes} onNo={q.onNo} />}

      <div className="card trip">
        <h2>🧳 My trip</h2>
        <ul className="trip-list">
          <li>{t.arrive ? <>✈️ Land <b>{dayLabel(t.arrive.arrDate)} {hm(t.arrive.arrTime)}</b> · {t.arrive.airline} {t.arrive.number}</> : <span className="muted">✈️ No flight yet</span>}</li>
          <li>{t.hotelId ? <>🏨 <b>{hotelName(t.hotelId)}</b>{t.hotelIn ? ` · ${dayLabel(t.hotelIn)} to ${dayLabel(t.hotelOut || t.hotelIn)}` : ''}</> : <span className="muted">🏨 No hotel yet</span>}</li>
          <li>{t.depart ? <>🏠 Fly home <b>{dayLabel(t.depart.depDate)} {hm(t.depart.depTime)}</b> · {t.depart.number}</> : <span className="muted">🏠 No flight home yet</span>}</li>
        </ul>
        <button className="btn primary big" onClick={onImport}>📩 Add a booking email</button>
        <p className="muted small">Paste or share your flight or hotel email. I read it for you!</p>
      </div>

      <div className="card">
        <h2>🏅 Missions</h2>
        <ul className="quests">
          {QUESTS.map((x) => {
            const done = p.quests.includes(x.id);
            return (
              <li key={x.id} className={done ? 'done' : ''}>
                <span className="q-ico">{done ? '✅' : x.icon}</span>
                <span className="q-title">{x.title}</span>
                <span className="chip gold">{done ? 'Done!' : `+${x.points}`}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
