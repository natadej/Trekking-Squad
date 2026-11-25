/** Episodes share one template; only city data, dates and the leaderboard differ. */
export type EpisodeId = 'vegas' | 'bangkok';

export interface Episode {
  id: EpisodeId;
  name: string;
  city: string;
  flag: string;
  tagline: string;
  tz: string;
  /** an AWS event with classes and keynotes */
  event: boolean;
  /** main arrival airport */
  airport: string;
  center: { lat: number; lng: number };
  bounds: { north: number; south: number; west: number; east: number };
}

export const EPISODES: Record<EpisodeId, Episode> = {
  vegas: {
    id: 'vegas', name: 'RIV2026 at Vegas', city: 'Las Vegas', flag: '🎰', tagline: 'Walk the Strip during AWS re:Invent 2026.',
    tz: 'America/Los_Angeles', event: true, airport: 'LAS', center: { lat: 36.115, lng: -115.17 },
    bounds: { north: 36.151, south: 36.079, west: -115.19, east: -115.142 },
  },
  bangkok: {
    id: 'bangkok', name: 'Bangkok Walkabout', city: 'Bangkok', flag: '🛕', tagline: 'Temples, markets, malls and riverside walks.',
    tz: 'Asia/Bangkok', event: false, airport: 'BKK', center: { lat: 13.737, lng: 100.515 },
    bounds: { north: 13.76, south: 13.70, west: 100.485, east: 100.55 },
  },
};

const KEY = 'tsq.episode';
const ls = typeof localStorage === 'undefined' ? undefined : localStorage;

/** The episode the player picked, or undefined on the very first visit. */
export const chosenEpisode = () => (ls?.getItem(KEY) as EpisodeId | null) ?? undefined;
export const EP: Episode = EPISODES[chosenEpisode() ?? 'vegas'] ?? EPISODES.vegas;

/** Each episode keeps its own profile, plan, steps and leaderboard identity. */
export const epKey = (k: string) => (EP.id === 'vegas' ? k : `${k}.${EP.id}`);

export function switchEpisode(id: EpisodeId) {
  ls?.setItem(KEY, id);
  location.reload();
}
