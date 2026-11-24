import { useState } from 'react';
import type { Profile } from '../types';
import type { CloudUser } from '../cloud';
import { CONTEST_DAYS, CONTEST_LABEL, TROPHIES, goalsOf } from '../trophy';

interface Props {
  p: Profile;
  user: CloudUser | null;
  google: boolean;
  onGoogle: () => void;
  onDone: (x: { nick: string; goalDay: number; goalTrip: number }) => void;
}

const num = (v: FormDataEntryValue | null, d: number) => { const n = Math.round(Number(String(v ?? '').replace(/[^\d]/g, ''))); return n > 0 ? n : d; };

export default function Welcome({ p, user, google, onGoogle, onDone }: Props) {
  const [step, setStep] = useState<'login' | 'goals'>(user && !user.isAnonymous ? 'goals' : 'login');
  const g = goalsOf(p);
  return (
    <div className="welcome">
      <div className="wl-hero">
        <p className="wl-ep">RIV2026 · Las Vegas</p>
        <h1>Trekking <b>Squad</b></h1>
        <p>Walk Vegas during re:Invent and win a trophy.</p>
        <ul className="wl-tro">{TROPHIES.slice(0, 3).map((t) => <li key={t.id}><span>{t.icon}</span><b>{t.min.toLocaleString()}+</b><small>steps a day</small></li>)}</ul>
        <p className="wl-dates">Contest: {CONTEST_LABEL}</p>
      </div>
      {step === 'login' ? (
        <div className="card wl-card">
          <h2>Start</h2>
          {google && <button className="btn google big" onClick={onGoogle}><span className="g-logo" aria-hidden>G</span> Continue with Google</button>}
          <button className="btn primary big" onClick={() => setStep('goals')}>👟 Play as guest</button>
          <p className="small muted">{google ? 'Google keeps your steps on every device.' : 'Your steps are saved online. You can move them to another phone later from Profile.'}</p>
        </div>
      ) : (
        <form className="card wl-card" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onDone({ nick: String(f.get('nick') || '').trim().slice(0, 24) || p.nick, goalDay: num(f.get('day'), g.day), goalTrip: num(f.get('trip'), g.trip) });
        }}>
          <h2>About you</h2>
          {user?.email && <p className="small muted">Signed in as {user.email}</p>}
          <label>Name<input name="nick" defaultValue={p.onboarded ? p.nick : ''} placeholder={p.nick} maxLength={24} autoComplete="nickname" /></label>
          <label>Steps I expect today<input name="day" inputMode="numeric" defaultValue={g.day.toLocaleString()} /></label>
          <label>Steps I expect for the whole trip<small>{CONTEST_DAYS} days</small><input name="trip" inputMode="numeric" defaultValue={g.trip.toLocaleString()} /></label>
          <button className="btn primary big">Let's walk</button>
        </form>
      )}
    </div>
  );
}
