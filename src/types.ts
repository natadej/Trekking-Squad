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
  meTime?: boolean;
}

export type ItemKind =
  | 'flight' | 'ride' | 'hotel' | 'meal' | 'session' | 'keynote' | 'event' | 'badge' | 'free' | 'custom';

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
}

export interface Prefs {
  interests: string[];
  style: 'hands' | 'talks' | 'mix';
  level: number; // 100..400
  pace: 'chill' | 'busy';
  parties: boolean;
}

export interface Avatar {
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
  calToken: string;
  updatedAt: number;
}
