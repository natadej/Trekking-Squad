import { useEffect, useState } from 'react';
import GoogleButton from '../components/GoogleButton';
import type { Profile } from '../types';
import type { CloudUser } from '../cloud';
import { CONTEST_DAYS, CONTEST_LABEL, TROPHIES, goalsOf } from '../trophy';
import { EP, EPISODES, switchEpisode } from '../episode';

/** Pick a city episode. Each episode keeps its own steps, plan and leaderboard. */
export function EpisodePicker() {
  return (
    <div className="card ep-pick">
      <h2>Choose your trip</h2>
      <div className="ep-list">
        {Object.values(EPISODES).map((e) => (
          <button key={e.id} className={`ep-opt ${e.id === EP.id ? 'on' : ''}`} aria-pressed={e.id === EP.id} onClick={() => e.id !== EP.id && switchEpisode(e.id)}>
            <span className="ep-flag" aria-hidden>{e.flag}</span>
            <span><b>{e.name}</b><small>{e.tagline}</small></span>
            {e.id === EP.id && <span className="ep-on">✓ Playing</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  p: Profile;
  user: CloudUser | null;
  google: boolean;
  onError: (e: Error) => void;
  onDone: (x: { nick: string; goalDay: number; goalTrip: number }) => void;
}

const num = (v: FormDataEntryValue | null, d: number) => { const n = Math.round(Number(String(v ?? '').replace(/[^\d]/g, ''))); return n > 0 ? n : d; };

export default function Welcome({ p, user, google, onError, onDone }: Props) {
  const [step, setStep] = useState<'login' | 'goals'>(user && !user.isAnonymous ? 'goals' : 'login');
  const signedIn = !!user && !user.isAnonymous;
  useEffect(() => { if (signedIn) setStep('goals'); }, [signedIn]);
  const g = goalsOf(p);
  return (
    <div className="welcome">
      <div className="wl-hero">
        <p className="wl-ep">{EP.name} · {EP.city}</p>
        <h1>Trekking <b>Squad</b></h1>
        <p>{EP.tagline} Win a trophy.</p>
        <ul className="wl-tro">{TROPHIES.slice(0, 3).map((t) => <li key={t.id}><span>{t.icon}</span><b>{t.min.toLocaleString()}+</b><small>steps a day</small></li>)}</ul>
        <p className="wl-dates">Contest: {CONTEST_LABEL}</p>
      </div>
      {step === 'login' && <EpisodePicker />}
      {step === 'login' ? (
        <div className="card wl-card">
          <h2>Start</h2>
          {google && <GoogleButton onError={onError} />}
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
