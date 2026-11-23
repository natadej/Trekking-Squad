export type PlaceKind = 'airport' | 'hotel' | 'venue' | 'fun';

export interface Restaurant {
  name: string;
  food: string;
  kids?: boolean;
}

export interface Place {
  id: string;
  name: string;
  short: string;
  kind: PlaceKind;
  lat: number;
  lng: number;
  icon: string;
  color: string;
  /** re:Invent venue key used by the session catalog */
  venue?: 'mgm' | 'venetian' | 'wynn' | 'caesars' | 'forum';
  coins: number;
  fact: string;
  eats?: Restaurant[];
}

/** Real coordinates (OpenStreetMap). The 15 hotels are the big Strip resorts most re:Invent attendees stay at. */
export const PLACES: Place[] = [
  { id: 'airport', name: 'Harry Reid Airport (LAS)', short: 'Airport', kind: 'airport', lat: 36.0855, lng: -115.1498, icon: '✈️', color: '#7dd3fc', coins: 50,
    fact: 'Badge pickup desks are in Terminals 1 and 3 on Sun Nov 29 and Mon Nov 30, 7 AM to midnight.' },
  { id: 'mandalay', name: 'Mandalay Bay', short: 'Mandalay Bay', kind: 'hotel', lat: 36.0922, lng: -115.1758, icon: '🌴', color: '#f5c542', coins: 100,
    fact: 'The golden towers really have gold in the windows! Shark Reef Aquarium is inside.',
    eats: [{ name: 'Border Grill', food: 'Mexican', kids: true }, { name: 'Shark Reef Aquarium', food: 'Fun stop, not food!', kids: true }] },
  { id: 'luxor', name: 'Luxor', short: 'Luxor', kind: 'hotel', lat: 36.0959, lng: -115.1758, icon: '🔺', color: '#334155', coins: 100,
    fact: 'A giant glass pyramid with the brightest light beam on Earth shooting from the top.',
    eats: [{ name: 'Pyramid Café', food: 'Diner', kids: true }] },
  { id: 'nyny', name: 'New York-New York', short: 'NY-NY', kind: 'hotel', lat: 36.1021, lng: -115.1745, icon: '🗽', color: '#22c55e', coins: 100,
    fact: 'Has a mini Statue of Liberty and a roller coaster that loops around the skyline.',
    eats: [{ name: 'Shake Shack', food: 'Burgers', kids: true }, { name: "Gallagher's", food: 'Steakhouse' }] },
  { id: 'mgm', name: 'MGM Grand', short: 'MGM Grand', kind: 'venue', venue: 'mgm', lat: 36.1028, lng: -115.1694, icon: '🦁', color: '#10b981', coins: 150,
    fact: 're:Invent venue + badge pickup. One of the biggest hotels in the world.',
    eats: [{ name: 'Wolfgang Puck Bar & Grill', food: 'American', kids: true }, { name: 'Morimoto', food: 'Japanese' }, { name: 'Craftsteak', food: 'Steakhouse' }] },
  { id: 'aria', name: 'ARIA', short: 'ARIA', kind: 'hotel', lat: 36.107, lng: -115.178, icon: '💎', color: '#94a3b8', coins: 100,
    fact: 'Sleek curved glass towers in the middle of the Strip.',
    eats: [{ name: 'Din Tai Fung', food: 'Dumplings', kids: true }, { name: 'Carbone', food: 'Italian' }, { name: 'Catch', food: 'Seafood' }] },
  { id: 'cosmo', name: 'The Cosmopolitan', short: 'Cosmo', kind: 'hotel', lat: 36.1102, lng: -115.1741, icon: '🍸', color: '#a855f7', coins: 100,
    fact: 'Hides a secret pizza place with no sign on the door.',
    eats: [{ name: 'Secret Pizza', food: 'Pizza', kids: true }, { name: 'Wicked Spoon', food: 'Buffet', kids: true }, { name: 'Eggslut', food: 'Breakfast', kids: true }] },
  { id: 'bellagio', name: 'Bellagio', short: 'Bellagio', kind: 'hotel', lat: 36.1131, lng: -115.177, icon: '⛲', color: '#60a5fa', coins: 100,
    fact: 'The famous dancing fountains shoot water higher than a 20-floor building.',
    eats: [{ name: 'Café Bellagio', food: 'All-day café', kids: true }, { name: 'The Buffet', food: 'Buffet', kids: true }, { name: 'Spago', food: 'California' }] },
  { id: 'paris', name: 'Paris Las Vegas', short: 'Paris', kind: 'hotel', lat: 36.1122, lng: -115.1706, icon: '🗼', color: '#f472b6', coins: 100,
    fact: 'Its Eiffel Tower is half the size of the real one in France.',
    eats: [{ name: 'Mon Ami Gabi', food: 'French bistro', kids: true }, { name: 'Eiffel Tower Restaurant', food: 'French, with a view' }] },
  { id: 'caesars', name: 'Caesars Palace', short: 'Caesars', kind: 'venue', venue: 'caesars', lat: 36.1166, lng: -115.1768, icon: '🏛️', color: '#e2c290', coins: 150,
    fact: 're:Invent venue. Built to look like ancient Rome, with statues everywhere.',
    eats: [{ name: 'Bacchanal Buffet', food: 'Giant buffet', kids: true }, { name: "Gordon Ramsay Hell's Kitchen", food: 'British-American' }, { name: 'Mr Chow', food: 'Chinese' }] },
  { id: 'forum', name: 'Caesars Forum', short: 'Forum', kind: 'venue', venue: 'forum', lat: 36.119, lng: -115.1662, icon: '🎪', color: '#fb923c', coins: 150,
    fact: 're:Invent venue: Customer Showcase and Sunday kickoff fun.' },
  { id: 'venetian', name: 'The Venetian', short: 'Venetian', kind: 'venue', venue: 'venetian', lat: 36.1212, lng: -115.1697, icon: '🛶', color: '#fde68a', coins: 150,
    fact: 'Main re:Invent venue: keynotes, Expo and badge pickup. Has indoor canals with gondolas!',
    eats: [{ name: 'Grand Lux Cafe', food: 'Everything', kids: true }, { name: 'Black Tap', food: 'Burgers & crazy shakes', kids: true }, { name: 'TAO', food: 'Asian' }, { name: 'Bouchon', food: 'French' }] },
  { id: 'palazzo', name: 'The Palazzo', short: 'Palazzo', kind: 'hotel', lat: 36.1242, lng: -115.1683, icon: '🏰', color: '#fcd34d', coins: 100,
    fact: 'Twin sister of The Venetian, connected inside so you can walk to the Expo.',
    eats: [{ name: 'Lavo', food: 'Italian' }, { name: 'Mott 32', food: 'Chinese' }] },
  { id: 'wynn', name: 'Wynn Las Vegas', short: 'Wynn', kind: 'venue', venue: 'wynn', lat: 36.1266, lng: -115.1654, icon: '🌸', color: '#d97706', coins: 150,
    fact: 're:Invent venue (Wynn | Encore). Thursday is security day here.',
    eats: [{ name: 'The Buffet at Wynn', food: 'Buffet', kids: true }, { name: 'Wing Lei', food: 'Chinese' }, { name: 'Tableau', food: 'Breakfast & brunch', kids: true }] },
  { id: 'encore', name: 'Encore', short: 'Encore', kind: 'hotel', lat: 36.1294, lng: -115.1649, icon: '🌹', color: '#b45309', coins: 100,
    fact: 'Bronze twin of Wynn. Sessions run at Wynn | Encore together.',
    eats: [{ name: 'Sinatra', food: 'Italian' }, { name: 'Casa Playa', food: 'Mexican' }] },
  { id: 'resortsworld', name: 'Resorts World', short: 'Resorts World', kind: 'hotel', lat: 36.1337, lng: -115.1662, icon: '🐉', color: '#ef4444', coins: 100,
    fact: 'Big red towers. Its food hall serves street food from all over Asia.',
    eats: [{ name: 'Famous Foods Street Eats', food: 'Asian food hall', kids: true }] },
  { id: 'fontainebleau', name: 'Fontainebleau', short: 'Fontainebleau', kind: 'hotel', lat: 36.1374, lng: -115.1592, icon: '🦋', color: '#38bdf8', coins: 100,
    fact: 'The tallest hotel in Las Vegas, a blue glass tower at the north end.',
    eats: [{ name: 'Komodo', food: 'Asian' }, { name: 'Papi Steak', food: 'Steakhouse' }] },
  { id: 'allegiant', name: 'Allegiant Stadium', short: 'Allegiant', kind: 'fun', lat: 36.0907, lng: -115.1833, icon: '🏟️', color: '#111827', coins: 200,
    fact: 're:Play party Thu Dec 3, 6:30–10:30 PM, and the re:Invent 5K run on Wednesday.' },
  { id: 'sphere', name: 'Sphere', short: 'Sphere', kind: 'fun', lat: 36.1212, lng: -115.1621, icon: '🔮', color: '#f97316', coins: 150,
    fact: 'A giant ball covered in 1.2 million LED pucks. It can turn into an eyeball or a planet!' },
  { id: 'fountains', name: 'Fountains of Bellagio', short: 'Fountains', kind: 'fun', lat: 36.1128, lng: -115.1741, icon: '💦', color: '#3b82f6', coins: 120,
    fact: 'Free water show every 15–30 minutes in the evening.' },
  { id: 'highroller', name: 'High Roller', short: 'High Roller', kind: 'fun', lat: 36.1176, lng: -115.1682, icon: '🎡', color: '#ec4899', coins: 120,
    fact: 'A giant observation wheel at The LINQ. One spin takes 30 minutes.' },
  { id: 'sign', name: 'Welcome to Fabulous Las Vegas sign', short: 'Vegas Sign', kind: 'fun', lat: 36.0821, lng: -115.1728, icon: '🪧', color: '#facc15', coins: 200,
    fact: 'The famous sign from 1959. Everyone takes a photo here!' },
  { id: 'strat', name: 'The STRAT Tower', short: 'STRAT', kind: 'fun', lat: 36.1477, lng: -115.1561, icon: '🗼', color: '#64748b', coins: 150,
    fact: 'The tallest observation tower in the USA, with thrill rides on the very top.' },
];

export const HOTELS = PLACES.filter((p) => p.kind === 'hotel' || (p.kind === 'venue' && p.id !== 'forum'));

export const placeById = (id: string | undefined) => PLACES.find((p) => p.id === id);

export const VENUE_PLACE: Record<string, string> = {
  mgm: 'mgm', venetian: 'venetian', wynn: 'wynn', caesars: 'caesars', forum: 'forum',
};

export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Coins can be collected within this many metres of a place (big resorts are huge). */
export const COLLECT_RADIUS_M = 160;

/** Map bounds for the cartoon Strip. */
export const BOUNDS = { north: 36.151, south: 36.079, west: -115.19, east: -115.142 };

/** Las Vegas Blvd (the Strip) centre line, south to north. */
export const STRIP_ROAD: [number, number][] = [
  [36.0805, -115.1724], [36.0921, -115.1727], [36.1027, -115.1727], [36.1105, -115.1727],
  [36.1165, -115.1727], [36.1212, -115.1716], [36.1257, -115.1686], [36.1305, -115.1676],
  [36.1343, -115.1647], [36.1395, -115.1617], [36.1477, -115.1561],
];
