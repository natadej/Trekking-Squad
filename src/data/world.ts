import { PLACES, placeById } from './places';

export type PoiKind = 'food' | 'shop' | 'partner' | 'aws';

export interface PoiEvent { c: string; d: string; s: number; e: number; t: string }

/** A shop, restaurant, partner spot or AWS zone, from OpenStreetMap and the re:Invent catalog. */
export interface Poi {
  n: string;
  k: PoiKind;
  lat: number;
  lng: number;
  /** id of the hotel or venue it is inside */
  p: string;
  /** cuisine, shop type or booth */
  c?: string;
  /** re:Invent events booked here (the place is reserved for them) */
  ev?: PoiEvent[];
  /** sponsors of those events */
  sp?: string[];
  /** position inside the building is approximate */
  approx?: 1;
}

export interface World {
  /** building outlines per place id: rings of [lat, lng] */
  fp: Record<string, [number, number][][]>;
  /** other big buildings, for scenery */
  other: { n: string; g: [number, number][] }[];
  pois: Poi[];
}

let cache: Promise<World> | undefined;
export const loadWorld = () => (cache ??= fetch('data/world.json').then((r) => r.json() as Promise<World>));

export const POI_ICON: Record<PoiKind, string> = { food: '🍔', shop: '🛍️', partner: '🤝', aws: '⭐' };
export const POI_LABEL: Record<PoiKind, string> = { food: 'Food', shop: 'Shops', partner: 'Partners', aws: 'AWS spots' };

const K = Math.cos((36.115 * Math.PI) / 180);
/** Metres east/south of an origin; good enough across the Strip. */
export const toM = (o: { lat: number; lng: number }, lat: number, lng: number) => ({
  x: (lng - o.lng) * 111320 * K,
  y: (o.lat - lat) * 111320,
});
export const fromM = (o: { lat: number; lng: number }, x: number, y: number) => ({
  lat: o.lat - y / 111320,
  lng: o.lng + x / (111320 * K),
});

/** Compass bearing in degrees from a to b (0 = north). */
export function bearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const { x, y } = toM(a, b.lat, b.lng);
  return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
}

const DIRS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
export const compass = (deg: number) => DIRS[Math.round(deg / 45) % 8];

/** The event booked at this spot right now, or next, on the given day/minute. */
export function bookingAt(poi: Poi, day: string, min: number) {
  return poi.ev?.find((e) => e.d === day && e.s <= min && e.e > min);
}

export const hostName = (poi: Poi) => placeById(poi.p)?.short ?? '';
export const placeIds = new Set(PLACES.map((p) => p.id));
