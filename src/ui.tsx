import type { ItemKind, PlanItem } from './types';
import { placeById } from './data/places';

export const KIND: Record<ItemKind, { icon: string; label: string; cls: string }> = {
  flight: { icon: '✈️', label: 'Flight', cls: 'k-flight' },
  ride: { icon: '🚗', label: 'Ride', cls: 'k-ride' },
  hotel: { icon: '🏨', label: 'Hotel', cls: 'k-hotel' },
  meal: { icon: '🍔', label: 'Food', cls: 'k-meal' },
  session: { icon: '🎓', label: 'Class', cls: 'k-session' },
  keynote: { icon: '🎤', label: 'Big show', cls: 'k-keynote' },
  event: { icon: '🎉', label: 'Event', cls: 'k-event' },
  badge: { icon: '🪪', label: 'Badge', cls: 'k-badge' },
  free: { icon: '😌', label: 'Free time', cls: 'k-free' },
  custom: { icon: '📌', label: 'My plan', cls: 'k-custom' },
  walk: { icon: '🚶', label: 'Walk challenge', cls: 'k-walk' },
};

export function mapsLink(placeId?: string, mode: 'walking' | 'driving' = 'walking') {
  const p = placeById(placeId);
  if (!p) return undefined;
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=${mode}`;
}

export function uberLink(placeId?: string) {
  const p = placeById(placeId);
  if (!p) return undefined;
  const q = `action=setPickup&pickup=my_location&dropoff[latitude]=${p.lat}&dropoff[longitude]=${p.lng}&dropoff[nickname]=${encodeURIComponent(p.name)}`;
  return `https://m.uber.com/ul/?${q}`;
}

export const catalogLink = (code: string) =>
  `https://registration.awsevents.com/flow/awsevents/reinvent2026/eventcatalog/page/eventcatalog?search=${encodeURIComponent(code)}`;

export function YesNo({ q, onYes, onNo, yes = 'Yes', no = 'No', icon }: { q: string; onYes: () => void; onNo: () => void; yes?: string; no?: string; icon?: string }) {
  return (
    <div className="yesno card pop">
      <p className="yesno-q">{icon && <span className="big-ico">{icon}</span>} {q}</p>
      <div className="yesno-btns">
        <button className="btn yes" onClick={onYes}>👍 {yes}</button>
        <button className="btn no" onClick={onNo}>👎 {no}</button>
      </div>
    </div>
  );
}

export const placeName = (i: PlanItem) => placeById(i.place)?.short;
