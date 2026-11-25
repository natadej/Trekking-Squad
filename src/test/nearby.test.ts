import { describe, expect, it } from 'vitest';
import { StopDetector, parsePhoton } from '../nearby';

const at = (lat: number, lng: number, t: number, acc = 10) => ({ lat, lng, acc, t });

describe('stop detector', () => {
  it('fires once after a minute in one spot', () => {
    const s = new StopDetector();
    expect(s.push(at(36.1212, -115.1697, 0))).toBeUndefined();
    expect(s.push(at(36.12121, -115.1697, 30000))).toBeUndefined();
    expect(s.push(at(36.12122, -115.1697, 61000))).toBeDefined();
    expect(s.push(at(36.12122, -115.1697, 90000))).toBeUndefined();
  });
  it('resets when walking and ignores rough fixes', () => {
    const s = new StopDetector();
    s.push(at(36.1212, -115.1697, 0));
    expect(s.push(at(36.123, -115.1697, 61000, 200))).toBeUndefined();
    expect(s.push(at(36.123, -115.1697, 62000))).toBeUndefined();
    expect(s.push(at(36.123, -115.1697, 123000))).toBeDefined();
  });
});

describe('photon parsing', () => {
  it('keeps named shops and places, labels and dedupes them', () => {
    const f = (name: string | undefined, k: string, v: string, lng = -115.1697) => ({ geometry: { coordinates: [lng, 36.1212] as [number, number] }, properties: { name, osm_key: k, osm_value: v, osm_type: 'N', osm_id: name?.length } });
    const r = parsePhoton([f('Starbucks', 'amenity', 'cafe'), f('Tumi', 'shop', 'bag'), f('Tumi', 'shop', 'bag'), f(undefined, 'shop', 'gift'), f('Las Vegas Blvd', 'highway', 'primary')], { lat: 36.1212, lng: -115.1697 });
    expect(r.map((x) => [x.name, x.kind, x.icon])).toEqual([['Starbucks', 'Cafe', '☕'], ['Tumi', 'Bag shop', '👜']]);
  });
});
