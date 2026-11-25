import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Avatar, PlanItem, Prefs, Profile, Session, Trip } from './types';
import { loadProfile, questPoints, saveProfile } from './profile';
import { buildPlan, tripDays } from './planner';
import { GCAL_PREFIX, syncCalendar } from './gcal';
import { toIcs } from './ics';
import { cloud, googleEnabled, loadRemote, saveRemote, signOutCloud, stepStats, syncCode, loadSyncCode, watchLeaders, watchUser, type CloudUser, type Leader } from './cloud';
import Welcome, { EpisodePicker } from './screens/Welcome';
import { EP } from './episode';
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
import { learnFrom } from './learn';
import { walkReward } from './walks';
import GoogleButton from './components/GoogleButton';
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
  const [user, setUser] = useState<CloudUser | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [google, setGoogle] = useState(false);
  useEffect(() => { googleEnabled().then(setGoogle); }, []);
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
  const shownFix = useRef<{ lat: number; lng: number; acc: number; t: number }>(undefined);

  useEffect(() => {
    (EP.event ? fetch('data/sessions.json') : Promise.resolve(new Response('[]'))).then((r) => r.json()).then(setSessions).catch(() => setToast('Could not load classes. Check your internet.'));
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

  const plan = useMemo(() => (sessions.length || !EP.event ? buildPlan(p, sessions) : []), [p, sessions]);
  const ics = useMemo(() => toIcs(plan), [plan]);

  // cloud: sign-in, profile sync, live leaderboard
  useEffect(() => watchUser(setUser), []);
  // the same profile can be open on two devices: merge the newer save, keeping the most steps per day
  const pullRemote = useCallback((r: Profile) => setP((cur) => {
    const base = r.updatedAt > cur.updatedAt ? r : cur, steps = { ...(r.steps ?? {}) };
    for (const [d, n] of Object.entries(cur.steps ?? {})) steps[d] = Math.max(steps[d] ?? 0, n);
    const m = { ...base, steps, wish: base.wish ?? [] };
    saveProfile(m);
    return m;
  }), []);
  const pRef = useRef(p);
  pRef.current = p;
  useEffect(() => (user ? watchLeaders((rows) => {
    setLeaders(rows);
    const mine = rows.find((r) => r.uid === user.uid);
    if (mine && synced.current && (mine.stepsTotal ?? 0) > stepStats(pRef.current).stepsTotal) loadRemote(user).then((r) => r && pullRemote(r)).catch(() => {});
  }) : undefined), [user, pullRemote]);
  useEffect(() => {
    if (!user) return;
    synced.current = false;
    loadRemote(user).then((r) => {
      if (r) pullRemote(r);
      synced.current = true;
    }).catch(() => { synced.current = true; });
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user || !synced.current) return;
    const t = setTimeout(() => saveRemote(user, p).catch(() => {}), 1200);
    return () => clearTimeout(t);
  }, [p, user]);

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

  // walk challenges: start one, finish it by walking its steps, earn points, streaks and a chest every 3 walks
  const startWalk = (w: { id: string; title: string; steps: number; place?: string }) => {
    if (p.walks?.some((d) => d.id === w.id)) { say('✅ You already finished this walk.'); return; }
    update((x) => ({ ...x, walkNow: { id: w.id, title: w.title, goal: w.steps, base: x.steps?.[nowPT().day] ?? 0, day: nowPT().day, place: w.place } }));
    if (!counting) startSteps();
    say(`🚶 Go! Walk ${w.steps.toLocaleString()} steps to finish.`);
  };
  const stopWalk = () => update((x) => ({ ...x, walkNow: undefined }));
  useEffect(() => {
    const w = p.walkNow;
    if (!w) return;
    if (w.day !== nowPT().day) { update((x) => ({ ...x, walkNow: undefined })); return; }
    if (stepsToday - w.base < w.goal) return;
    if (p.walks?.some((d) => d.id === w.id)) { update((x) => ({ ...x, walkNow: undefined })); return; }
    const done = [...(p.walks ?? []), { id: w.id, day: w.day, steps: w.goal }];
    const r = walkReward(done);
    update((x) => ({ ...x, walkNow: undefined, walks: done, points: x.points + r.points }));
    say(r.chest ? `🎁 Reward chest! Walk done: +${r.points} points` : `🏅 Walk done! +${r.points} points${r.streak > 1 ? ` · 🔥 ${r.streak}-day streak` : ''}`, true);
  }, [stepsToday, p.walkNow, p.walks, update, say]);

  const startGps = () => {
    if (!navigator.geolocation) { setGpsError('This device has no GPS.'); return; }
    if (gpsOn.current) return;
    gpsOn.current = true;
    const onFix = (pos: GeolocationPosition) => {
        setGpsError(undefined);
        const c = pos.coords, shown = shownFix.current, now = Date.now();
        // skip a rough fix (cell / Wi-Fi) while a recent precise one exists
        if (!(shown && c.accuracy > Math.max(60, shown.acc * 2) && now - shown.t < 45000)) {
          // light smoothing so the dot doesn't jitter: blend by accuracy
          const w = shown && now - shown.t < 10000 ? Math.min(0.6, (c.accuracy * c.accuracy) / (c.accuracy * c.accuracy + shown.acc * shown.acc)) : 0;
          const lat = shown ? shown.lat * w + c.latitude * (1 - w) : c.latitude, lng = shown ? shown.lng * w + c.longitude * (1 - w) : c.longitude;
          shownFix.current = { lat, lng, acc: c.accuracy, t: now };
          setMe({ lat, lng, acc: Math.round(c.accuracy), hdg: c.speed && c.speed > 0.5 ? c.heading : null });
        }
        const f = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: Date.now() }, prev = lastFix.current;
        if (pos.coords.accuracy > 35) return;
        if (!prev) { lastFix.current = f; return; }
        const d = distanceM(prev, f), dt = (f.t - prev.t) / 1000;
        if (d < 15) return;
        if (counted.current && Date.now() - lastStep.current > 20000 && d / dt < 2.5) pend.current += Math.round(d / STEP_M);
        lastFix.current = f;
    };
    const onErr = (e: GeolocationPositionError) => {
      if (e.code !== e.PERMISSION_DENIED) return;
      gpsOn.current = false; setGpsError('Please allow location so your hero can move on the map.');
    };
    navigator.geolocation.getCurrentPosition(onFix, () => undefined, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    navigator.geolocation.watchPosition(onFix, onErr, { enableHighAccuracy: true, maximumAge: 5000 });
  };

  async function startSteps() {
    const stop = await startMotionSteps(() => { pend.current++; lastStep.current = Date.now(); });
    startGps();
    counted.current = true;
    setCounting(true);
    if (!stop) say('No motion sensor, so I count steps from GPS walking.');
  }
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
    p.trip.arrive && !answered('pickup') && { id: 'pickup', icon: '🚗', q: 'When you land, is someone picking you up?', yes: 'Yes, a ride!', no: `No, take ${EP.ride.split('/')[0]} to ${hotel}`, onYes: () => answer('pickup', (x) => ({ ...x, trip: { ...x.trip, pickup: 'friend' } })), onNo: () => answer('pickup', (x) => ({ ...x, trip: { ...x.trip, pickup: 'uber' } })) },
    p.trip.arrive && !answered('dinner') && { id: 'dinner', icon: '🍕', q: 'Want me to plan dinner the night you land?', onYes: () => answer('dinner', (x) => ({ ...x, trip: { ...x.trip, arrivalDinner: true } })), onNo: () => answer('dinner', (x) => ({ ...x, trip: { ...x.trip, arrivalDinner: false } })) },
    EP.event && !answered('parties') && { id: 'parties', icon: '🎉', q: 'Go to the fun parties, like re:Play at the stadium?', onYes: () => answer('parties', (x) => ({ ...x, prefs: { ...x.prefs, parties: true } })), onNo: () => answer('parties', (x) => ({ ...x, prefs: { ...x.prefs, parties: false } })) },
    !answered('pace') && { id: 'pace', icon: '⚡', q: 'Want a super busy plan with up to 6 classes a day?', yes: 'Yes, max!', no: 'No, 4 is plenty', onYes: () => answer('pace', (x) => ({ ...x, prefs: { ...x.prefs, pace: 'busy' } })), onNo: () => answer('pace', (x) => ({ ...x, prefs: { ...x.prefs, pace: 'chill' } })) },
  ].filter(Boolean) as Question[];

  const [syncing, setSyncing] = useState(false);
  const syncCal = async () => {
    setSyncing(true);
    try {
      const r = await syncCalendar(plan, tripDays(p.trip));
      update((x) => {
        const t: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r.trip)) if (v !== undefined && x.trip[k as keyof Trip] === undefined) t[k] = v;
        return { ...x, trip: { ...x.trip, ...t }, custom: [...x.custom.filter((c) => !c.id.startsWith(GCAL_PREFIX)), ...r.imported] };
      });
      award('calendar');
      say(`📅 Synced: ${r.imported.length} events from your Google Calendar, ${r.changed} changes sent to it.`);
    } catch (e) {
      say('⚠️ ' + (e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

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
      <h2>🔑 Use my profile on another phone</h2>
      {!cloud() ? <p className="muted">Online save is not set up. Your profile is saved on this device.</p> : user && !user.isAnonymous ? <>
        <p>✅ Signed in with Google{user.email ? <> as <b>{user.email}</b></> : ''}. Sign in on any phone to continue.</p>
        <button className="btn small ghost" onClick={signOutCloud}>Sign out</button>
      </> : <>
        {google && <GoogleButton onError={(e) => say('⚠️ ' + e.message)} />}
        <p className="muted">✅ Your profile is saved online automatically. To use it on another phone or computer, copy this code there.</p>
        <p className="sync-code"><code>{syncCode()}</code></p>
        <button className="btn ghost" onClick={() => navigator.clipboard?.writeText(syncCode()).then(() => say('📋 Code copied. Keep it private.'), () => say('Copy did not work. Select the code and copy it.'))}>📋 Copy my code</button>
        <details className="sync-use"><summary>I have a code from another device</summary>
          <form onSubmit={(e) => {
            e.preventDefault();
            const v = new FormData(e.currentTarget).get('code') as string;
            loadSyncCode(v).then((r) => { const m = { ...r, steps: r.steps ?? {}, wish: r.wish ?? [] }; setP(m); saveProfile(m); award('signin'); say('🔑 Profile loaded.', true); }).catch((er: Error) => say(er.message));
          }}>
            <input name="code" placeholder="Paste the code" autoComplete="off" aria-label="Sync code" />
            <button className="btn primary">Load my profile</button>
          </form>
        </details>
      </>}
    </div>
  );

  if (!p.onboarded) return (
    <div className="app">
      <Welcome p={p} user={user} google={google} onError={(e) => say('⚠️ ' + e.message)} onDone={(x) => { update((o) => ({ ...o, ...x, onboarded: true })); startSteps(); say('👟 Ready. Walk to climb the ranking!', true); }} />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo"><span>Trekking <b>Squad</b></span><small>{EP.name}</small></div>
        <span className="chip steps" title="Steps today">👣 {stepsToday.toLocaleString()}</span>
        <span className="chip gold zeny">🪙 {p.points.toLocaleString()} pts</span>
      </header>
      {tab === 'home' && <Home p={p} plan={plan} questions={questions} me={me} onWalk={startWalk} onStopWalk={stopWalk} onImport={() => setImporting(true)} go={(t) => { if (t === 'map') setMapMode('strip'); setTab(t as Tab); scrollTo(0, 0); }} checkIn={checkIn} />}
      {tab === 'plan' && <Plan p={p} plan={plan}
        onRemove={(i) => update((x) => ({ ...x, removed: [...x.removed, i.code || i.id], added: x.added.filter((c) => c !== i.code), custom: x.custom.filter((c) => c.id !== i.id) }))}
        onMaybe={(i, m) => update((x) => {
          const rest = (x.maybe ?? []).filter((y) => y !== i.id);
          return { ...x, maybe: m ? [...rest, i.id] : rest, custom: x.custom.map((c) => (c.id === i.id ? { ...c, tentative: m || undefined } : c)) };
        })}
        onSync={syncCal} syncing={syncing} onWalk={(i) => { startWalk({ id: i.id, title: i.title, steps: i.steps ?? 1000, place: i.place }); setTab('home'); scrollTo(0, 0); }}
        onAdd={(i: PlanItem) => update((x) => ({ ...x, custom: [...x.custom, i] }))}
        onCalendar={downloadCal}
        onReset={() => update((x) => ({ ...x, removed: [], custom: x.custom }))} />}
      {tab === 'map' && mapMode === 'shop' && (
        <div className="seg" role="group" aria-label="Map">
          <button onClick={() => setMapMode('strip')}>🗺️ Map</button>
          <button className="on" aria-pressed>🛍️ Shopping & Fun</button>
        </div>
      )}
      {tab === 'map' && mapMode === 'shop' && <ShopScreen p={p} me={me} stepsToday={stepsToday} counting={counting} startSteps={startSteps} collectSpot={collectSpot} addPlan={addPlan} toggleWish={toggleWish} />}
      {tab === 'map' && mapMode === 'strip' && <MapScreen p={p} me={me} gpsError={gpsError} startGps={startGps} collect={collect} addPlan={addPlan} today={plan.filter((i) => i.day === (plan.some((j) => j.day === now.day) ? now.day : plan[0]?.day))} onShop={() => setMapMode('shop')} toggleFav={(id) => update((x) => { const f = x.fav ?? []; return { ...x, fav: f.includes(id) ? f.filter((y) => y !== id) : [...f, id] }; })} />}
      {tab === 'classes' && <Classes p={p} sessions={sessions} planned={new Set(plan.map((i) => i.code).filter(Boolean) as string[])}
        setPrefs={(f: (x: Prefs) => Prefs) => update((x) => ({ ...x, prefs: f(x.prefs) }))}
        me={me} onLearn={(s, w) => update((x) => ({ ...x, learn: learnFrom(x.learn, s, w) }))}
        toggle={(c) => update((x) => { const s = sessions.find((y) => y.c === c); const on = x.added.includes(c); const learn = s ? learnFrom(x.learn, s, on ? -1 : 2) : x.learn;
          return on ? { ...x, learn, added: x.added.filter((y) => y !== c) } : { ...x, learn, added: [...x.added, c], removed: x.removed.filter((y) => y !== c) }; })} />}
      {tab === 'hero' && <div className="screen ep-switch"><EpisodePicker /></div>}
      {tab === 'hero' && <HeroStudio p={p} setAvatar={(a: Avatar) => update((x) => ({ ...x, avatar: a }))} setNick={(n) => update((x) => ({ ...x, nick: n }))}
        addInterest={(id) => { update((x) => ({ ...x, prefs: { ...x.prefs, interests: x.prefs.interests.includes(id) ? x.prefs.interests : [...x.prefs.interests, id] } })); say('⭐ Added. Class suggestions now include this topic.', true); }} account={account} />}
      {tab === 'top' && <Leaders p={p} rows={leaders} uid={user?.uid} live={!!user && leaders.length > 0} counting={counting} startSteps={startSteps} />}

      {importing && <ImportSheet initial={shared} onClose={() => setImporting(false)} onDone={(t) => { setTrip(t); setImporting(false); say('✅ Trip saved. Your plan is updated.', true); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
      {party > 0 && <div className="confetti" key={party} aria-hidden>{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, background: ['#facc15', '#f472b6', '#60a5fa', '#34d399', '#a78bfa'][i % 5], animationDelay: `${(i % 7) * 0.08}s` }} />)}</div>}

      <nav className="tabs"><div className="tabs-in">
        {TABS.filter(([id]) => EP.event || id !== 'classes').map(([id, ico, label]) => (
          <button key={id} className={`tab ${tab === id ? 'on' : ''}`} aria-current={tab === id} onClick={() => { setTab(id); scrollTo(0, 0); }}>
            <span className="ti">{ico}</span>{label}
          </button>
        ))}
      </div></nav>
    </div>
  );
}
