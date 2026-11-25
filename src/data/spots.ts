import { EP } from '../episode';

export type SpotKind = 'coffee' | 'shop' | 'sight' | 'photo';
export interface Spot { id: string; name: string; short: string; kind: SpotKind; lat: number; lng: number; why: string }

export const SPOT_ICON: Record<SpotKind, string> = { coffee: '☕', shop: '🛍️', sight: '✨', photo: '📸' };
export const SPOT_VERB: Record<SpotKind, string> = { coffee: 'Coffee break at', shop: 'Browse', sight: 'See', photo: 'Photo stop at' };

/** Interesting walk targets: real spots worth the steps. */
const VEGAS: Spot[] = [
  { id: 's-conservatory', name: 'Bellagio Conservatory & Botanical Gardens', short: 'Bellagio Conservatory', kind: 'sight', lat: 36.1125, lng: -115.1752, why: 'Free giant flower show that changes every season.' },
  { id: 's-patisserie', name: 'Bellagio Patisserie', short: 'Bellagio Patisserie', kind: 'coffee', lat: 36.113, lng: -115.1755, why: 'Coffee and pastries next to the famous chocolate fountain.' },
  { id: 's-bouchon', name: 'Bouchon Bakery (Venetian)', short: 'Bouchon Bakery', kind: 'coffee', lat: 36.1212, lng: -115.1697, why: "Thomas Keller's bakery: great coffee and macarons to go." },
  { id: 's-eataly', name: 'Eataly (Park MGM)', short: 'Eataly', kind: 'coffee', lat: 36.1028, lng: -115.1752, why: 'Italian market with espresso, gelato and fresh pasta.' },
  { id: 's-canal', name: 'Grand Canal Shoppes gondolas', short: 'Grand Canal', kind: 'shop', lat: 36.1215, lng: -115.1696, why: 'Indoor canal with singing gondoliers and 160 shops.' },
  { id: 's-forum', name: 'The Forum Shops at Caesars', short: 'Forum Shops', kind: 'shop', lat: 36.1179, lng: -115.1757, why: 'Luxury shops under a painted Roman sky.' },
  { id: 's-miracle', name: 'Miracle Mile Shops', short: 'Miracle Mile', kind: 'shop', lat: 36.1098, lng: -115.1715, why: '170 shops on a loop that is exactly one walk long.' },
  { id: 's-fashion', name: 'Fashion Show Las Vegas', short: 'Fashion Show', kind: 'shop', lat: 36.1277, lng: -115.1712, why: 'The big mall on the Strip: Nordstrom, Macy’s, Apple.' },
  { id: 's-mms', name: "M&M'S World", short: "M&M'S World", kind: 'shop', lat: 36.1043, lng: -115.1717, why: 'Four floors of colourful candy: easy gifts for home.' },
  { id: 's-linq', name: 'The LINQ Promenade', short: 'LINQ Promenade', kind: 'shop', lat: 36.1176, lng: -115.1702, why: 'Open-air street of bars and snacks leading to the High Roller.' },
  { id: 's-flamingo', name: 'Flamingo Wildlife Habitat', short: 'Flamingo Habitat', kind: 'sight', lat: 36.1162, lng: -115.1712, why: 'Free garden with real flamingos, turtles and koi.' },
  { id: 's-wynn', name: 'Wynn atrium and Lake of Dreams', short: 'Wynn atrium', kind: 'sight', lat: 36.1265, lng: -115.1657, why: 'Huge floral sculptures and a hidden lake show.' },
  { id: 's-rialto', name: 'Venetian Rialto Bridge', short: 'Rialto Bridge', kind: 'photo', lat: 36.1214, lng: -115.1714, why: 'Classic Venice photo, with the bell tower behind you.' },
  { id: 's-eiffel', name: 'Eiffel Tower view (Paris)', short: 'Eiffel Tower', kind: 'photo', lat: 36.1125, lng: -115.1723, why: 'Best photo spot for the Bellagio fountains across the street.' },
  { id: 's-sphere', name: 'Sphere outside view', short: 'Sphere', kind: 'photo', lat: 36.1212, lng: -115.1621, why: 'The giant LED ball: most impressive just after sunset.' },
];

const BANGKOK: Spot[] = [
  { id: 'b-tha-tien', name: 'Tha Tien pier riverside', short: 'Tha Tien', kind: 'photo', lat: 13.7461, lng: 100.4906, why: 'Best view of Wat Arun across the river, especially at sunset.' },
  { id: 'b-sanam-luang', name: 'Sanam Luang', short: 'Sanam Luang', kind: 'sight', lat: 13.7547, lng: 100.4930, why: 'Big royal field with Grand Palace views.' },
  { id: 'b-pak-khlong', name: 'Pak Khlong Talat flower market', short: 'Flower market', kind: 'sight', lat: 13.7429, lng: 100.4966, why: 'Open 24 hours: piles of orchids and jasmine garlands.' },
  { id: 'b-yaowarat-gate', name: 'Chinatown Gate (Odeon Circle)', short: 'Chinatown Gate', kind: 'photo', lat: 13.7387, lng: 100.5135, why: 'Start of Yaowarat Road and its famous street food.' },
  { id: 'b-sampeng', name: 'Sampeng Lane market', short: 'Sampeng Lane', kind: 'shop', lat: 13.7426, lng: 100.5050, why: 'Narrow lane full of cheap gifts, fabrics and snacks.' },
  { id: 'b-erawan', name: 'Erawan Shrine', short: 'Erawan Shrine', kind: 'sight', lat: 13.7444, lng: 100.5404, why: 'Busy Hindu shrine with traditional Thai dancers.' },
  { id: 'b-jim', name: 'Jim Thompson House', short: 'Jim Thompson', kind: 'sight', lat: 13.7493, lng: 100.5283, why: 'Teak houses and gardens of the American silk king.' },
  { id: 'b-centralworld', name: 'centralwOrld', short: 'centralwOrld', kind: 'shop', lat: 13.7466, lng: 100.5393, why: 'One of Asia’s biggest malls, with a big food hall.' },
  { id: 'b-siamsquare', name: 'Siam Square', short: 'Siam Square', kind: 'shop', lat: 13.7451, lng: 100.5341, why: 'Street fashion, cafés and Thai desserts.' },
  { id: 'b-bacc', name: 'Bangkok Art and Culture Centre', short: 'BACC', kind: 'sight', lat: 13.7466, lng: 100.5302, why: 'Free modern-art museum with a spiral gallery.' },
  { id: 'b-lumphini-lake', name: 'Lumphini Park lake', short: 'Lumphini lake', kind: 'sight', lat: 13.7310, lng: 100.5418, why: 'Shady loop walk where giant monitor lizards sunbathe.' },
  { id: 'b-icon-river', name: 'ICONSIAM riverside', short: 'ICONSIAM river', kind: 'photo', lat: 13.7267, lng: 100.5104, why: 'River park with a nightly fountain show.' },
  { id: 'b-sathorn-pier', name: 'Sathorn Pier', short: 'Sathorn Pier', kind: 'photo', lat: 13.7187, lng: 100.5133, why: 'Hop on a river boat and see the city from the water.' },
];

export const SPOTS: Spot[] = EP.id === 'bangkok' ? BANGKOK : VEGAS;
