import RAW from './placeInfo.json';

export interface PlaceInfo { title: string; about: string; src?: string; img?: string; credit?: string; license?: string; file?: string }
const INFO = RAW as Record<string, PlaceInfo>;

/** Wikipedia summary + free-licence Wikimedia Commons photo for a Strip place (see scripts/fetch_place_photos.py). */
export const placeInfo = (id?: string): PlaceInfo | undefined => (id ? INFO[id] : undefined);
export const photoUrl = (id?: string) => { const i = placeInfo(id); return i?.img ? `${import.meta.env.BASE_URL}${i.img}` : undefined; };
/** First two sentences, enough for a card. */
export const shortAbout = (s = '') => (s.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [s]).slice(0, 2).join('').trim();
