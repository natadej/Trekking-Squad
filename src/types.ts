export interface Session {
  c: string; // code
  t: string; // title
  y: string; // type
  l: number; // level 100..500 (0 = none)
  d: string; // date YYYY-MM-DD
  s: number; // start, minutes PT
  e: number; // end, minutes PT
  v: string; // venue key
  r: string; // room
  tp: string[];
  a: string[];
  ind: string[];
  sp: string[];
  ab: string;
  w: number; // walk-up only
}

export interface Flight {
  airline: string;
  number: string;
  from: string;
  to: string;
  depDate: string;
  depTime: number;
  arrDate: string;
  arrTime: number;
  confirmation?: string;
}

export type Pickup = 'uber' | 'friend' | 'shuttle' | 'taxi';

export interface Trip {
  arrive?: Flight;
  depart?: Flight;
  hotelId?: string;
  hotelIn?: string;
  hotelOut?: string;
  hotelConfirmation?: string;
  pickup?: Pickup;
  dropoff?: Pickup;
  arrivalDinner?: boolean;
}

export type ItemKind =
  | 'flight' | 'ride' | 'hotel' | 'meal' | 'session' | 'keynote' | 'event' | 'badge' | 'free' | 'custom' | 'walk';

export interface PlanItem {
  id: string;
  day: string;
  start: number;
  end: number;
  title: string;
  kind: ItemKind;
  place?: string;
  code?: string;
  note?: string;
  /** "Maybe": shown and synced to calendars as tentative */
  tentative?: boolean;
  /** walk challenges: step target */
  steps?: number;
}

export interface Walk { id: string; title: string; goal: number; base: number; day: string; place?: string }

export interface Prefs {
  interests: string[];
  style: 'hands' | 'talks' | 'mix';
  level: number; // 100..400
  pace: 'chill' | 'busy';
  parties: boolean;
}

export interface Avatar {
  job: number;
  body: number;
  skin: number;
  hair: number;
  hairColor: number;
  shirt: number;
  bottom: number;
  shoes: number;
  hat: number;
  glasses: number;
  dress: number; // 0 = none
}

export interface Profile {
  v: 1;
  nick: string;
  avatar: Avatar;
  prefs: Prefs;
  trip: Trip;
  custom: PlanItem[];
  removed: string[]; // plan item ids or session codes removed by the user
  added: string[]; // session codes the user picked
  coins: string[]; // claimed coin ids
  quests: string[];
  points: number;
  /** steps walked, by Vegas day (YYYY-MM-DD) */
  steps: Record<string, number>;
  /** saved shops, "area|name" */
  wish: string[];
  calToken: string;
  /** plan item ids the user answered "Maybe" */
  maybe?: string[];
  /** finished walk challenges */
  walks?: { id: string; day: string; steps: number }[];
  /** walk challenge in progress */
  walkNow?: Walk;
  /** favourite place ids */
  fav?: string[];
  /** learned class taste: topic/area/type -> weight */
  learn?: Record<string, number>;
  /** step goals chosen on the welcome screen */
  goalDay?: number;
  goalTrip?: number;
  onboarded?: boolean;
  updatedAt: number;
}
