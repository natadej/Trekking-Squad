import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Avatar, PlanItem, Prefs, Profile, Session, Trip } from './types';
import { loadProfile, questPoints, saveProfile } from './profile';
import { buildPlan } from './planner';
import { toIcs } from './ics';
import { cloud, loadRemote, saveRemote, signInGoogle, signOutCloud, watchLeaders, watchUser, type Leader } from './cloud';
import { COLLECT_RADIUS_M, distanceM, placeById, type Place } from './data/places';
import { nowPT } from './time';
import Home, { type Question } from './screens/Home';
import Plan from './screens/Plan';
import Classes from './screens/Classes';
import HeroStudio from './screens/HeroStudio';
import MapScreen from './screens/MapScreen';
import Leaders from './screens/Leaders';
import ImportSheet from './screens/ImportSheet';
import ShopScreen from './screens/ShopScreen';
import { startMotionSteps } from './steps';
import { STEP_M, type Area } from './data/shops';

const TABS = [
  ['home', '🏠', 'Home'], ['plan', '🗓️', 'Plan'], ['map', '🗺️', 'Map'],
  ['classes', '🎓', 'Classes'], ['hero', '👤', 'Profile'], ['top', '🏆', 'Top'],
] as const;
type Tab = (typeof TABS)[number][0];

const shared = (() => {
  const u = new URLSearchParams(location.search);
  return [u.get('title'), u.get('text'), u.get('url')].filter(Boolean).join('\n') || undefined;
})();

export default function App() {
  const [p, setP] = useState<Profile>(loadProfile);
  const [tab, setTab] = useState<Tab>('home');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [importing, setImporting] = useState(!!shared);
  const [toast, setToast] = useState<string>();
  const [party, setParty] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [me, setMe] = useState<{ lat: number; lng: number; acc: number; hdg?: number | null } | null>(null);
  const [gpsError, setGpsError] = useState<string>();
  const synced = useRef(false);
  const [mapMode, setMapMode] = useState<'strip' | 'shop'>('strip');
  const [counting, setCounting] = useState(false);
  const counted = useRef(false);
  const gpsOn = useRef(false);
  const pend = useRef(0);
  const lastStep = useRef(0);
  const lastFix = useRef<{ lat: number; lng: number; t: number }>(undefined);

  useEffect(() => {
    fetch('data/sessions.json').then((r) => r.json()).then(setSessions).catch(() => setToast('Could not load classes. Check your internet.'));
    if (shared) history.replaceState(null, '', location.pathname);
  }, []);

  const say = useCallback((msg: string, confetti = false) => {
    setToast(msg);
    if (confetti) setParty(Date.now());
    setTimeout(() => setToast((t) => (t === msg ? undefined : t)), 2600);
  }, []);

  const update = useCallback((f: (x: Profile) => Profile) => {
    setP((old) => {
      const n = { ...f(old), updatedAt: Date.now() };
      saveProfile(n);
      return n;
    });
  }, []);

  const award = useCallback((id: string) => {
    update((x) => (x.quests.includes(id) ? x : { ...x, quests: [...x.quests, id], points: x.points + questPoints(id) }));
  }, [update]);

  const plan = useMemo(() => (sessions.length ? buildPlan(p, sessions) : []), [p, sessions]);
  const ics = useMemo(() => toIcs(plan), [plan]);

  // cloud: sign-in, profile sync, live leaderboard
  useEffect(() => watchUser(setUser), []);
  useEffect(() => (user ? watchLeaders(setLeaders) : undefined), [user]);
  useEffect(() => {
    if (!user) return;
    synced.current = false;
    loadRemote(user.uid).then((r) => {
      if (r && r.updatedAt > p.updatedAt) { const m = { ...r, steps: r.steps ?? {}, wish: r.wish ?? [] }; setP(m); saveProfile(m); }
      synced.current = true;
    }).catch(() => { synced.current = true; });
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user || !synced.current) return;
    const t = setTimeout(() => saveRemote(user.uid, p, ics).catch(() => {}), 1200);
    return () => clearTimeout(t);
  }, [p, ics, user]);
  useEffect(() => { if (user && !user.isAnonymous) award('signin'); }, [user, award]);

  // quests that complete themselves
  useEffect(() => {
    if (p.trip.arrive || p.trip.depart) award('flight');
    if (p.trip.hotelId) award('hotel');
    if (p.prefs.interests.length) award('interests');
  }, [p.trip, p.prefs.interests, award]);
  useEffect(() => { if (tab === 'plan' && plan.length) award('plan'); if (tab === 'hero') award('hero'); }, [tab, plan.length, award]);

  // steps: motion sensor while the app is open; GPS walking distance when the sensor is quiet
  const flushSteps = useCallback(() => {
    const n = pend.current;
    if (!n) return;
    pend.current = 0;
    const day = nowPT().day;
    update((x) => {
      const steps = x.steps ?? {}, old = steps[day] ?? 0, nw = old + n;
      return { ...x, steps: { ...steps, [day]: nw }, points: x.points + Math.floor(nw / 100) - Math.floor(old / 100) };
    });
  }, [update]);
  useEffect(() => { const t = setInterval(flushSteps, 3000); return () => clearInterval(t); }, [flushSteps]);
  const stepsToday = p.steps?.[nowPT().day] ?? 0;
  useEffect(() => {
    const k = 'walk10k:' + nowPT().day;
    if (stepsToday >= 10000 && !p.quests.includes(k)) {
      update((x) => (x.quests.includes(k) ? x : { ...x, quests: [...x.quests, k], points: x.points + 200 }));
      say('👣 10,000 steps today! +200 points', true);
    }
  }, [stepsToday, p.quests, update, say]);

  const startGps = () => {
    if (!navigator.geolocation) { setGpsError('This device has no GPS.'); return; }
    if (gpsOn.current) return;
    gpsOn.current = true;
    navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(undefined);
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, hdg: pos.coords.heading });
        const f = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: Date.now() }, prev = lastFix.current;
        if (pos.coords.accuracy > 35) return;
        if (!prev) { lastFix.current = f; return; }
        const d = distanceM(prev, f), dt = (f.t - prev.t) / 1000;
        if (d < 15) return;
        if (counted.current && Date.now() - lastStep.current > 20000 && d / dt < 2.5) pend.current += Math.round(d / STEP_M);
        lastFix.current = f;
      },
      () => { gpsOn.current = false; setGpsError('Please allow location so your hero can move on the map.'); },
      { enableHighAccuracy: true, maximumAge: 15000 },
    );
  };

  const startSteps = async () => {
    const stop = await startMotionSteps(() => { pend.current++; lastStep.current = Date.now(); });
    startGps();
    counted.current = true;
    setCounting(true);
    if (!stop) say('No motion sensor, so I count steps from GPS walking.');
  };
  const collectSpot = (a: Area) => {
    update((x) => (x.coins.includes('spot:' + a.id) ? x : { ...x, coins: [...x.coins, 'spot:' + a.id], points: x.points + 50 }));
    say(`🪙 +50! You reached ${a.short}!`, true);
  };
  const addPlan = (i: PlanItem) => { update((x) => ({ ...x, custom: [...x.custom, i] })); say('🗓️ Added to your plan!'); };
  const toggleWish = (k: string) => update((x) => {
    const w = x.wish ?? [];
    return { ...x, wish: w.includes(k) ? w.filter((y) => y !== k) : [...w, k] };
  });

  const collect = (pl: Place) => {
    if (!me || distanceM(me, pl) > COLLECT_RADIUS_M) return;
    update((x) => (x.coins.includes(pl.id) ? x : { ...x, coins: [...x.coins, pl.id], points: x.points + pl.coins }));
    say(`🪙 +${pl.coins}! You found ${pl.short}!`, true);
  };

  // check-in bonus: GPS near the venue of a class happening now
  const now = nowPT();
  const live = plan.find((i) => i.day === now.day && i.start - 10 <= now.min && i.end >= now.min && ['session', 'keynote', 'event'].includes(i.kind));
  const livePlace = placeById(live?.place);
  const checkIn = live && livePlace && me && distanceM(me, livePlace) < 250 && !p.quests.includes('in:' + live.id)
    ? { item: live, claim: () => { update((x) => ({ ...x, quests: [...x.quests, 'in:' + live.id], points: x.points + 50 })); say('✅ +50 for showing up!', true); } }
    : undefined;

  const setTrip = (t: Partial<Trip>) => update((x) => ({ ...x, trip: { ...x.trip, ...t } }));
  const answered = (id: string) => p.quests.includes('a:' + id);
  const answer = (id: string, f: (x: Profile) => Profile) => update((x) => f({ ...x, quests: [...x.quests, 'a:' + id] }));
  const hotel = placeById(p.trip.hotelId)?.short || 'your hotel';
  const questions: Question[] = [
    p.trip.arrive && !answered('pickup') && { id: 'pickup', icon: '🚗', q: 'When you land, is someone picking you up?', yes: 'Yes, a ride!', no: `No, take Uber to ${hotel}`, onYes: () => answer('pickup', (x) => ({ ...x, trip: { ...x.trip, pickup: 'friend' } })), onNo: () => answer('pickup', (x) => ({ ...x, trip: { ...x.trip, pickup: 'uber' } })) },
    p.trip.arrive && !answered('dinner') && { id: 'dinner', icon: '🍕', q: 'Want me to plan dinner the night you land?', onYes: () => answer('dinner', (x) => ({ ...x, trip: { ...x.trip, arrivalDinner: true } })), onNo: () => answer('dinner', (x) => ({ ...x, trip: { ...x.trip, arrivalDinner: false } })) },
    !answered('metime') && { id: 'metime', icon: '😌', q: 'Add a 1-hour rest break every day?', onYes: () => answer('metime', (x) => ({ ...x, trip: { ...x.trip, meTime: true } })), onNo: () => answer('metime', (x) => ({ ...x, trip: { ...x.trip, meTime: false } })) },
    !answered('parties') && { id: 'parties', icon: '🎉', q: 'Go to the fun parties, like re:Play at the stadium?', onYes: () => answer('parties', (x) => ({ ...x, prefs: { ...x.prefs, parties: true } })), onNo: () => answer('parties', (x) => ({ ...x, prefs: { ...x.prefs, parties: false } })) },
    !answered('pace') && { id: 'pace', icon: '⚡', q: 'Want a super busy plan with up to 6 classes a day?', yes: 'Yes, max!', no: 'No, 4 is plenty', onYes: () => answer('pace', (x) => ({ ...x, prefs: { ...x.prefs, pace: 'busy' } })), onNo: () => answer('pace', (x) => ({ ...x, prefs: { ...x.prefs, pace: 'chill' } })) },
  ].filter(Boolean) as Question[];

  const downloadCal = () => {
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trekking-squad-riv2026-at-vegas.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    award('calendar');
    say('📅 Open the file to add your plan to Google, Outlook or Apple Calendar!');
  };

  const account = (
    <div className="card">
      <h2>🔑 Back up my profile</h2>
      {!cloud() ? <p className="muted">Online save is coming soon. Your profile is saved on this device.</p>
        : user && !user.isAnonymous ? <>
          <p>✅ Saved to <b>{user.email}</b>. Sign in on any phone or computer to continue.</p>
          <button className="btn small ghost" onClick={() => signOutCloud()}>Sign out</button>
        </> : <>
          <p className="muted">Sign in with Google to use your profile on every device.</p>
          <button className="btn primary big" onClick={() => signInGoogle().then(() => say('🔑 Profile backed up.', true)).catch(() => say('Sign-in did not finish. Please try again.'))}>Sign in with Google</button>
        </>}
    </div>
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo"><span>Trekking <b>Squad</b></span><small>RIV2026 · Las Vegas</small></div>
        <span className="chip steps" title="Steps today">👣 {stepsToday.toLocaleString()}</span>
        <span className="chip gold zeny">🪙 {p.points.toLocaleString()} pts</span>
      </header>
      {tab === 'home' && <Home p={p} plan={plan} questions={questions} onImport={() => setImporting(true)} go={(t) => { if (t === 'map') setMapMode('strip'); setTab(t as Tab); scrollTo(0, 0); }} checkIn={checkIn} />}
      {tab === 'plan' && <Plan p={p} plan={plan}
        onRemove={(i) => update((x) => ({ ...x, removed: [...x.removed, i.code || i.id], added: x.added.filter((c) => c !== i.code), custom: x.custom.filter((c) => c.id !== i.id) }))}
        onAdd={(i: PlanItem) => update((x) => ({ ...x, custom: [...x.custom, i] }))}
        onCalendar={downloadCal}
        onReset={() => update((x) => ({ ...x, removed: [], custom: x.custom }))} />}
      {tab === 'map' && (
        <div className="seg" role="group" aria-label="Map">
          <button className={mapMode === 'strip' ? 'on' : ''} aria-pressed={mapMode === 'strip'} onClick={() => setMapMode('strip')}>🗺️ Strip map</button>
          <button className={mapMode === 'shop' ? 'on' : ''} aria-pressed={mapMode === 'shop'} onClick={() => setMapMode('shop')}>🛍️ Shopping & Fun</button>
        </div>
      )}
      {tab === 'map' && mapMode === 'shop' && <ShopScreen p={p} me={me} stepsToday={stepsToday} counting={counting} startSteps={startSteps} collectSpot={collectSpot} addPlan={addPlan} toggleWish={toggleWish} />}
      {tab === 'map' && mapMode === 'strip' && <MapScreen p={p} me={me} gpsError={gpsError} startGps={startGps} collect={collect} addPlan={addPlan} today={plan.filter((i) => i.day === (plan.some((j) => j.day === now.day) ? now.day : plan[0]?.day))} />}
      {tab === 'classes' && <Classes p={p} sessions={sessions} planned={new Set(plan.map((i) => i.code).filter(Boolean) as string[])}
        setPrefs={(f: (x: Prefs) => Prefs) => update((x) => ({ ...x, prefs: f(x.prefs) }))}
        toggle={(c) => update((x) => (x.added.includes(c) ? { ...x, added: x.added.filter((y) => y !== c) } : { ...x, added: [...x.added, c], removed: x.removed.filter((y) => y !== c) }))} />}
      {tab === 'hero' && <HeroStudio p={p} setAvatar={(a: Avatar) => update((x) => ({ ...x, avatar: a }))} setNick={(n) => update((x) => ({ ...x, nick: n }))}
        addInterest={(id) => { update((x) => ({ ...x, prefs: { ...x.prefs, interests: x.prefs.interests.includes(id) ? x.prefs.interests : [...x.prefs.interests, id] } })); say('⭐ Added. Class suggestions now include this topic.', true); }} account={account} />}
      {tab === 'top' && <Leaders p={p} rows={leaders} uid={user?.uid} live={!!user && leaders.length > 0} counting={counting} startSteps={startSteps} />}

      {importing && <ImportSheet initial={shared} onClose={() => setImporting(false)} onDone={(t) => { setTrip(t); setImporting(false); say('✅ Trip saved. Your plan is updated.', true); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
      {party > 0 && <div className="confetti" key={party} aria-hidden>{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, background: ['#facc15', '#f472b6', '#60a5fa', '#34d399', '#a78bfa'][i % 5], animationDelay: `${(i % 7) * 0.08}s` }} />)}</div>}

      <nav className="tabs"><div className="tabs-in">
        {TABS.map(([id, ico, label]) => (
          <button key={id} className={`tab ${tab === id ? 'on' : ''}`} aria-current={tab === id} onClick={() => { setTab(id); scrollTo(0, 0); }}>
            <span className="ti">{ico}</span>{label}
          </button>
        ))}
      </div></nav>
    </div>
  );
}
