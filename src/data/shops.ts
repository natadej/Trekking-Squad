import { distanceM } from './places';

export type ShopCat = 'food' | 'clothes' | 'shoes' | 'jewelry' | 'bags' | 'beauty' | 'sports' | 'fun' | 'gifts' | 'home' | 'services';

export interface Area {
  id: string; name: string; short: string; icon: string;
  kind: 'mall' | 'store' | 'fun' | 'trip';
  lat: number; lng: number; addr: string; url: string; about: string;
  /** official deals page */
  deals?: string;
  shows?: { n: string; when: string; url: string }[];
  /** day trip, far outside the city map */
  far?: 1;
}

/** A store or restaurant inside a mall (Grand Canal Shoppes directory, or OpenStreetMap for the outlets). */
export interface Shop {
  n: string; a: string; c: ShopCat;
  t?: string; w?: string; ph?: string; web?: string;
  /** promotions the mall lists for this store */
  d?: string[];
  /** hours Sun..Sat */
  h?: string[];
  /** OSM opening_hours */
  oh?: string;
  lat?: number; lng?: number;
}

export interface ShopData { updated: string; areas: Area[]; shops: Shop[]; rings: Record<string, [number, number][]> }

let cache: Promise<ShopData> | undefined;
export const loadShops = () => (cache ??= fetch('data/shops.json').then((r) => r.json() as Promise<ShopData>));

export const CAT_ICON: Record<ShopCat, string> = {
  food: '🍔', clothes: '👕', shoes: '👟', jewelry: '💎', bags: '👜', beauty: '💄', sports: '⚽', fun: '🎮', gifts: '🎁', home: '🏠', services: '🛎️',
};
export const CAT_LABEL: Record<ShopCat, string> = {
  food: 'Food', clothes: 'Clothes', shoes: 'Shoes', jewelry: 'Jewelry', bags: 'Bags & more', beauty: 'Beauty', sports: 'Sports', fun: 'Games & fun', gifts: 'Gifts', home: 'Home', services: 'Services',
};

export const STEP_M = 0.75;
/** Walking steps between two points (streets are ~30% longer than a straight line). */
export const stepsTo = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => Math.round((distanceM(a, b) * 1.3) / STEP_M);
export const shopKey = (s: Shop) => `${s.a}|${s.n}`;
