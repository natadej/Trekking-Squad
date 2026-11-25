import { PLACES, distanceM } from './data/places';
import { epKey } from './episode';

export interface Fix { lat: number; lng: number; acc: number; t: number }
export interface NearPlace { id: string; name: string; kind: string; icon: string; lat: number; lng: number; d: number; own?: string }

const STOP_MS = 60000, STOP_M = 25, MAX_ACC = 30;

/** Fires once when the phone has stayed within ~25 m for a minute with a precise fix. */
export class StopDetector {
  private anchor?: Fix;
  private fired = false;
  push(f: Fix): Fix | undefined {
    if (f.acc > MAX_ACC) return;
    if (!this.anchor || distanceM(this.anchor, f) > STOP_M) { this.anchor = f; this.fired = false; return; }
    if (!this.fired && f.t - this.anchor.t >= STOP_MS) { this.fired = true; return f; }
  }
}

const ICON: Record<string, string> = {
  cafe: '☕', coffee: '☕', restaurant: '🍽️', fast_food: '🍔', bar: '🍸', pub: '🍺', ice_cream: '🍦', bakery: '🥐', casino: '🎰',
  hotel: '🏨', mall: '🛍️', department_store: '🛍️', clothes: '👗', shoes: '👟', jewelry: '💍', gift: '🎁', bag: '👜', cosmetics: '💄', chocolate: '🍫',
  museum: '🏛️', attraction: '📸', viewpoint: '📸', artwork: '🎨', theatre: '🎭', cinema: '🎬', place_of_worship: '🛕', temple: '🛕', park: '🌳',
  pharmacy: '💊', atm: '🏧', bank: '🏦', toilets: '🚻', entrance: '🚪', convenience: '🏪', supermarket: '🛒', car_rental: '🚗', taxi: '🚕', fuel: '⛽',
};
const KEY_ICON: Record<string, string> = { shop: '🛍️', amenity: '📍', tourism: '📸', leisure: '🌳', historic: '🏛️', building: '🏢', office: '🏢' };
const label = (v: string) => (v === 'yes' ? 'Building' : v.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()));

interface PhotonFeature { geometry: { coordinates: [number, number] }; properties: { osm_type?: string; osm_id?: number; osm_key?: string; osm_value?: string; name?: string } }

export function parsePhoton(features: PhotonFeature[], here: { lat: number; lng: number }): NearPlace[] {
  const seen = new Set<string>();
  const out: NearPlace[] = [];
  for (const f of features) {
    const p = f.properties, [lng, lat] = f.geometry.coordinates;
    if (!p.name || !p.osm_key || ['highway', 'place', 'boundary', 'landuse', 'railway'].includes(p.osm_key)) continue;
    const v = p.osm_value ?? '', k = p.name.toLowerCase() + '|' + v;
    if (seen.has(k)) continue;
    seen.add(k);
    const kind = p.osm_key === 'shop' && !['mall', 'department_store', 'convenience', 'supermarket'].includes(v) ? `${label(v)} shop` : label(v);
    out.push({ id: `osm:${p.osm_type ?? ''}${p.osm_id ?? k}`, name: p.name, kind, icon: ICON[v] ?? KEY_ICON[p.osm_key] ?? '📍', lat, lng, d: distanceM(here, { lat, lng }) });
  }
  return out;
}

export function ownNear(here: { lat: number; lng: number }, r = 200): NearPlace[] {
  return PLACES.map((pl) => ({ id: pl.id, own: pl.id, name: pl.name, kind: 'Trekking Squad stop', icon: pl.icon, lat: pl.lat, lng: pl.lng, d: distanceM(here, pl) })).filter((x) => x.d <= r);
}

/** Nearby named places from OpenStreetMap (Photon), merged with the episode's own places, nearest first. */
export async function fetchNearby(here: { lat: number; lng: number }, max = 12): Promise<NearPlace[]> {
  const own = ownNear(here);
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`https://photon.komoot.io/reverse?lat=${here.lat}&lon=${here.lng}&limit=30&radius=0.12&lang=en`, { signal: ctl.signal });
    if (!r.ok) throw new Error(String(r.status));
    const osm = parsePhoton((await r.json()).features ?? [], here).filter((x) => !own.some((o) => o.name.toLowerCase() === x.name.toLowerCase()));
    return [...own, ...osm].sort((a, b) => a.d - b.d).slice(0, max);
  } catch {
    if (!own.length) throw new Error('offline');
    return own.sort((a, b) => a.d - b.d);
  } finally { clearTimeout(timer); }
}

const ASKED = () => epKey('tsq.asked');
const ASK_AGAIN_MS = 3 * 3600 * 1000, ASK_M = 60;
const asked = (): Fix[] => { try { return JSON.parse(localStorage.getItem(ASKED()) || '[]'); } catch { return []; } };
/** True when "Where are you?" was already shown within 60 m in the last 3 hours. */
export const askedNear = (f: Fix) => asked().some((a) => f.t - a.t < ASK_AGAIN_MS && distanceM(a, f) < ASK_M);
export const markAsked = (f: Fix) => localStorage.setItem(ASKED(), JSON.stringify([...asked().filter((a) => f.t - a.t < ASK_AGAIN_MS), f].slice(-50)));
