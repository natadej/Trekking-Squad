import type { Profile } from './types';

const KEY = 'vq.profile.v1';

const ADJ = ['Captain', 'Rocket', 'Super', 'Turbo', 'Cosmic', 'Lucky', 'Ninja', 'Pixel', 'Mega', 'Sunny', 'Jolly', 'Brave'];
const NOUN = ['Cactus', 'Lambda', 'Panda', 'Dragon', 'Llama', 'Comet', 'Robot', 'Penguin', 'Gecko', 'Falcon', 'Taco', 'Otter'];

export function randomNick() {
  const r = (n: number) => Math.floor(Math.random() * n);
  return `${ADJ[r(ADJ.length)]} ${NOUN[r(NOUN.length)]} ${10 + r(90)}`;
}

function token() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function newProfile(): Profile {
  return {
    v: 1,
    nick: randomNick(),
    avatar: { job: 0, body: 0, skin: 2, hair: 1, hairColor: 1, shirt: 0, bottom: 0, shoes: 1, hat: 0, glasses: 0, dress: 0 },
    prefs: { interests: [], style: 'mix', level: 200, pace: 'chill', parties: true },
    trip: {},
    custom: [],
    removed: [],
    added: [],
    coins: [],
    quests: [],
    points: 0,
    calToken: token(),
    updatedAt: 0,
  };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = newProfile(), s = JSON.parse(raw) as Partial<Profile>;
      return { ...d, ...s, avatar: { ...d.avatar, ...s.avatar } };
    }
  } catch { /* ignore */ }
  return newProfile();
}

export function saveProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export const QUESTS: { id: string; icon: string; title: string; points: number }[] = [
  { id: 'hero', icon: '⚔️', title: 'Create your hero', points: 50 },
  { id: 'flight', icon: '✈️', title: 'Add your flight', points: 100 },
  { id: 'hotel', icon: '🏨', title: 'Add your hotel', points: 100 },
  { id: 'interests', icon: '⭐', title: 'Pick what you love', points: 50 },
  { id: 'plan', icon: '🗓️', title: 'Check your plan', points: 50 },
  { id: 'calendar', icon: '📅', title: 'Put the plan in your calendar', points: 100 },
  { id: 'signin', icon: '🔑', title: 'Save your hero with Google', points: 50 },
];
export const questPoints = (id: string) => QUESTS.find((q) => q.id === id)?.points ?? 0;
