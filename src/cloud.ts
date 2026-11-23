import { initializeApp, type FirebaseApp } from 'firebase/app';
import { nowPT } from './time';
import {
  GoogleAuthProvider, getAuth, linkWithPopup, onAuthStateChanged, signInAnonymously, signInWithCredential,
  signInWithPopup, signOut, type Auth, type User,
} from 'firebase/auth';
import {
  collection, doc, getDoc, getFirestore, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, type Firestore,
} from 'firebase/firestore';
import type { Avatar, Profile } from './types';

const CFG_KEY = 'vq.cloud.v1';

function config(): Record<string, string> | null {
  const env = import.meta.env.VITE_FIREBASE_CONFIG as string | undefined;
  const raw = env || localStorage.getItem(CFG_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export const setCloudConfig = (json: string) => { JSON.parse(json); localStorage.setItem(CFG_KEY, json); };

let app: FirebaseApp | undefined, auth: Auth | undefined, db: Firestore | undefined;

export function cloud() {
  if (!app) {
    const c = config();
    if (!c) return null;
    app = initializeApp(c);
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { auth: auth!, db: db! };
}

export function watchUser(cb: (u: User | null) => void) {
  const c = cloud();
  if (!c) { cb(null); return () => {}; }
  return onAuthStateChanged(c.auth, async (u) => {
    if (!u) {
      try { await signInAnonymously(c.auth); } catch { cb(null); }
      return;
    }
    cb(u);
  });
}

export async function signInGoogle() {
  const c = cloud();
  if (!c) throw new Error('Cloud save is not set up yet');
  const provider = new GoogleAuthProvider();
  const cur = c.auth.currentUser;
  if (cur?.isAnonymous) {
    try {
      return (await linkWithPopup(cur, provider)).user;
    } catch (e: unknown) {
      const cred = GoogleAuthProvider.credentialFromError(e as never);
      if (cred) return (await signInWithCredential(c.auth, cred)).user;
      throw e;
    }
  }
  return (await signInWithPopup(c.auth, provider)).user;
}

export const signOutCloud = async () => { const c = cloud(); if (c) await signOut(c.auth); };

export async function loadRemote(uid: string): Promise<Profile | null> {
  const c = cloud();
  if (!c) return null;
  const s = await getDoc(doc(c.db, 'vq_profiles', uid));
  return s.exists() ? (JSON.parse(s.data().json) as Profile) : null;
}

export async function saveRemote(uid: string, p: Profile, icsText: string) {
  const c = cloud();
  if (!c) return;
  await Promise.all([
    setDoc(doc(c.db, 'vq_profiles', uid), { json: JSON.stringify(p), updatedAt: p.updatedAt }),
    setDoc(doc(c.db, 'vq_leaders', uid), { nick: p.nick.slice(0, 24), points: p.points, avatar: p.avatar, coins: p.coins.length, ...stepStats(p), at: serverTimestamp() }),
    setDoc(doc(c.db, 'vq_cal', p.calToken), { uid, ics: icsText, at: serverTimestamp() }),
  ]);
}

export interface Leader { uid: string; nick: string; points: number; avatar: Avatar; coins: number; stepsDay?: string; stepsToday?: number; stepsTotal?: number }

export const stepStats = (p: Profile) => {
  const day = nowPT().day, steps = p.steps ?? {};
  return { stepsDay: day, stepsToday: steps[day] ?? 0, stepsTotal: Object.values(steps).reduce((a, b) => a + b, 0) };
};

export function watchLeaders(cb: (rows: Leader[]) => void) {
  const c = cloud();
  if (!c) return () => {};
  const q = query(collection(c.db, 'vq_leaders'), orderBy('stepsTotal', 'desc'), limit(50));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<Leader, 'uid'>) }))), () => cb([]));
}
