export interface Opt { name: string; color?: string; color2?: string; icon?: string; interest?: string }

const c = (name: string, color: string, color2?: string): Opt => ({ name, color, color2 });
const j = (name: string, icon: string, color: string, color2: string, interest: string): Opt => ({ name, icon, color, color2, interest });

export const LOOKS = {
  job: [
    j('Novice', '🔰', '#c8a978', '#8a6a44', 'career'),
    j('Swordman', '🗡️', '#3d6fd8', '#c0c8d8', 'security'),
    j('Mage', '🔮', '#7c3aed', '#fde68a', 'ai'),
    j('Archer', '🏹', '#4d9a3a', '#a16207', 'data'),
    j('Acolyte', '✨', '#f8fafc', '#e8b84a', 'cloud'),
    j('Merchant', '💰', '#d97706', '#7c4a24', 'money'),
    j('Thief', '🥷', '#4b5563', '#a3e635', 'games'),
    j('Blacksmith', '🔨', '#9a3412', '#94a3b8', 'build'),
    j('Alchemist', '⚗️', '#0d9488', '#f472b6', 'robots'),
    j('Knight', '🛡️', '#b91c1c', '#facc15', 'business'),
  ],
  body: [c('Boy', ''), c('Girl', ''), c('Tall boy', ''), c('Tall girl', ''), c('Strong boy', ''), c('Strong girl', ''), c('Little boy', ''), c('Little girl', ''), c('Sporty boy', ''), c('Sporty girl', '')],
  skin: [c('Porcelain', '#fde7d6'), c('Peach', '#f9d4b4'), c('Sand', '#f1c193'), c('Honey', '#e0a96d'), c('Caramel', '#c68a52'), c('Bronze', '#a86b3c'), c('Chestnut', '#8a5430'), c('Cocoa', '#6b3f22'), c('Espresso', '#4a2a17'), c('Olive', '#c9a27a')],
  hair: [c('Hero spikes', ''), c('Messy short', ''), c('Side bangs', ''), c('Fluffy curls', ''), c('Long & straight', ''), c('Ponytail', ''), c('Twin tails', ''), c('Long braids', ''), c('Top bun', ''), c('Bob with bangs', '')],
  hairColor: [c('Raven black', '#2a2233'), c('Cocoa brown', '#5b3a26'), c('Chestnut', '#8b5a2b'), c('Golden blond', '#f2c94c'), c('Flame red', '#e2553a'), c('Silver', '#d9dde6'), c('Sakura pink', '#f9a8d4'), c('Sky blue', '#7cc4ff'), c('Mint green', '#6ee7b7'), c('Lilac', '#c4a8ff')],
  shirt: [c('AWS orange tunic', '#ff9900', '#232f3e'), c('Sky tunic', '#7cc4ff', '#3d6fd8'), c('Red hoodie', '#ef4444', '#b91c1c'), c('Forest vest', '#4d9a3a', '#2f6b22'), c('Purple tunic', '#a78bfa', '#6d28d9'), c('Striped shirt', '#fde68a', '#5b3a26'), c('Leather jacket', '#8b5a2b', '#f1e3c8'), c('Night hoodie', '#334155', '#ff9900'), c('Pink tunic', '#f9a8d4', '#db2777'), c('White shirt', '#f8fafc', '#94a3b8')],
  dress: [c('No robe', ''), c('Sunflower', '#facc15'), c('Cherry', '#ef4444'), c('Ocean', '#3b82f6'), c('Mint', '#6ee7b7'), c('Lavender', '#c4b5fd'), c('Polka pink', '#f9a8d4', '#ffffff'), c('Denim', '#3b5b8c', '#93c5fd'), c('AWS orange', '#ff9900', '#232f3e'), c('Starry night', '#1e1b4b', '#fde047'), c('Rainbow', '#f472b6', '#60a5fa')],
  bottom: [c('Blue trousers', '#3b5b9b'), c('Black trousers', '#2a2233'), c('Khaki trousers', '#c8a96a'), c('Gray trousers', '#9ca3af'), c('Red shorts', '#dc2626'), c('Brown shorts', '#8b5a2b'), c('Plaid skirt', '#7c3aed', '#fde047'), c('Pink skirt', '#f472b6'), c('Green cargo', '#4d7c0f'), c('Rainbow tights', '#60a5fa', '#f472b6')],
  shoes: [c('White sneakers', '#f8fafc', '#ef4444'), c('Black boots', '#2a2233', '#64748b'), c('Red boots', '#dc2626', '#f8fafc'), c('Blue runners', '#2563eb', '#fde047'), c('Glow sneakers', '#a3e635', '#2a2233'), c('Brown boots', '#7c4a24', '#3f2512'), c('Pink sneakers', '#f472b6', '#f8fafc'), c('Sandals', '#d6a46c', '#8a5430'), c('Ranger boots', '#92400e', '#fbbf24'), c('Gold boots', '#facc15', '#7c4a24')],
  hat: [c('No headgear', ''), c('Bunny band', '#ffffff', '#f9a8d4'), c('Kitty band', '#2a2233', '#f9a8d4'), c('Angel wings', '#ffffff', '#bfdbfe'), c('Little horns', '#7c1d1d', '#ef4444'), c('Halo', '#facc15', '#fff7cc'), c('Big ribbon', '#ef4444', '#b91c1c'), c('Flower', '#f472b6', '#facc15'), c('Wizard hat', '#4338ca', '#fde047'), c('Tiara', '#facc15', '#60a5fa'), c('Beret', '#b91c1c', '#7f1d1d'), c('Apple', '#ef4444', '#22c55e')],
  glasses: [c('No glasses', ''), c('Round', '#2a2233'), c('Square', '#334155'), c('Star shades', '#f472b6'), c('Cool shades', '#1e293b'), c('Heart shades', '#ef4444'), c('Gold aviators', '#ca8a04'), c('Book-worm', '#2563eb'), c('Inventor goggles', '#64748b', '#7cc4ff'), c('Flight goggles', '#8b5a2b', '#fde68a'), c('Monocle', '#ca8a04')],
} satisfies Record<string, Opt[]>;

export type LookKey = keyof typeof LOOKS;

export const LOOK_TABS: { key: LookKey; icon: string; label: string }[] = [
  { key: 'job', icon: '⚔️', label: 'Job' },
  { key: 'body', icon: '🧍', label: 'Body' },
  { key: 'skin', icon: '✋', label: 'Skin' },
  { key: 'hair', icon: '💇', label: 'Hair style' },
  { key: 'hairColor', icon: '🎨', label: 'Hair color' },
  { key: 'shirt', icon: '👕', label: 'Tunic' },
  { key: 'dress', icon: '👗', label: 'Robe' },
  { key: 'bottom', icon: '👖', label: 'Pants' },
  { key: 'shoes', icon: '👢', label: 'Shoes' },
  { key: 'hat', icon: '🎀', label: 'Headgear' },
  { key: 'glasses', icon: '🕶️', label: 'Glasses' },
];
