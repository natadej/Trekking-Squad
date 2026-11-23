export interface Opt { name: string; color?: string; color2?: string }

const c = (name: string, color: string, color2?: string): Opt => ({ name, color, color2 });

export const LOOKS = {
  body: [c('Boy', ''), c('Girl', ''), c('Tall boy', ''), c('Tall girl', ''), c('Strong boy', ''), c('Strong girl', ''), c('Little boy', ''), c('Little girl', ''), c('Sporty boy', ''), c('Sporty girl', '')],
  skin: [c('Porcelain', '#fde7d6'), c('Peach', '#f9d4b4'), c('Sand', '#f1c193'), c('Honey', '#e0a96d'), c('Caramel', '#c68a52'), c('Bronze', '#a86b3c'), c('Chestnut', '#8a5430'), c('Cocoa', '#6b3f22'), c('Espresso', '#4a2a17'), c('Olive', '#c9a27a')],
  hair: [c('Short spikes', ''), c('Buzz cut', ''), c('Side part', ''), c('Curly top', ''), c('Long & straight', ''), c('Ponytail', ''), c('Two buns', ''), c('Braids', ''), c('Afro puff', ''), c('Bob cut', '')],
  hairColor: [c('Jet black', '#1f1a17'), c('Dark brown', '#4b2e1e'), c('Chestnut', '#7b4a2a'), c('Golden blond', '#e8b84a'), c('Ginger', '#d2632a'), c('Silver', '#cfd4dc'), c('Bubblegum pink', '#f472b6'), c('Ocean blue', '#3b82f6'), c('Mint green', '#34d399'), c('Galaxy purple', '#8b5cf6')],
  shirt: [c('AWS orange tee', '#ff9900', '#232f3e'), c('Sky blue tee', '#38bdf8'), c('Red hoodie', '#ef4444', '#b91c1c'), c('Green polo', '#22c55e', '#15803d'), c('Purple tee', '#a855f7'), c('Striped tee', '#fde047', '#1e293b'), c('Denim jacket', '#3b5b8c', '#e5e7eb'), c('Black hoodie', '#1f2937', '#ff9900'), c('Pink tee', '#f9a8d4'), c('White button-up', '#f8fafc', '#94a3b8')],
  dress: [c('No dress', ''), c('Sunny yellow', '#facc15'), c('Cherry red', '#ef4444'), c('Ocean blue', '#3b82f6'), c('Mint', '#6ee7b7'), c('Lavender', '#c4b5fd'), c('Polka dot pink', '#f9a8d4', '#ffffff'), c('Denim', '#3b5b8c', '#93c5fd'), c('Orange AWS', '#ff9900', '#232f3e'), c('Starry night', '#1e1b4b', '#fde047'), c('Rainbow', '#f472b6', '#60a5fa')],
  bottom: [c('Blue jeans', '#2f5d9b'), c('Black jeans', '#1f2937'), c('Khaki pants', '#c8a96a'), c('Gray joggers', '#9ca3af'), c('Red shorts', '#dc2626'), c('Denim shorts', '#5b82c2'), c('Plaid skirt', '#7c3aed', '#fde047'), c('Pink skirt', '#f472b6'), c('Green cargo', '#4d7c0f'), c('Rainbow leggings', '#60a5fa', '#f472b6')],
  shoes: [c('White sneakers', '#f8fafc', '#ef4444'), c('Black sneakers', '#111827', '#f8fafc'), c('Red high-tops', '#dc2626', '#f8fafc'), c('Blue runners', '#2563eb', '#fde047'), c('Glow sneakers', '#a3e635', '#111827'), c('Brown boots', '#7c4a24', '#3f2512'), c('Pink sneakers', '#f472b6', '#f8fafc'), c('Sandals', '#d6a46c', '#8a5430'), c('Cowboy boots', '#92400e', '#fbbf24'), c('Gold sneakers', '#facc15', '#111827')],
  hat: [c('No hat', ''), c('AWS cap', '#232f3e', '#ff9900'), c('Red cap', '#ef4444', '#f8fafc'), c('Cowboy hat', '#a16207', '#78350f'), c('Beanie', '#22c55e', '#f8fafc'), c('Party hat', '#a855f7', '#fde047'), c('Crown', '#facc15', '#ef4444'), c('Headphones', '#111827', '#38bdf8'), c('Bucket hat', '#fde68a', '#a16207'), c('Wizard hat', '#4338ca', '#fde047'), c('Bunny ears', '#f9a8d4', '#ffffff')],
  glasses: [c('No glasses', ''), c('Round', '#111827'), c('Square', '#1f2937'), c('Star shades', '#f472b6'), c('Cool shades', '#0f172a'), c('Heart shades', '#ef4444'), c('Gold aviators', '#ca8a04'), c('Nerd frames', '#2563eb'), c('VR goggles', '#64748b', '#38bdf8'), c('Ski goggles', '#f97316', '#7dd3fc'), c('Monocle', '#ca8a04')],
} satisfies Record<string, Opt[]>;

export type LookKey = keyof typeof LOOKS;

export const LOOK_TABS: { key: LookKey; icon: string; label: string }[] = [
  { key: 'body', icon: '🧍', label: 'Body' },
  { key: 'skin', icon: '✋', label: 'Skin' },
  { key: 'hair', icon: '💇', label: 'Hair style' },
  { key: 'hairColor', icon: '🎨', label: 'Hair color' },
  { key: 'shirt', icon: '👕', label: 'Shirt' },
  { key: 'dress', icon: '👗', label: 'Dress' },
  { key: 'bottom', icon: '👖', label: 'Pants' },
  { key: 'shoes', icon: '👟', label: 'Shoes' },
  { key: 'hat', icon: '🧢', label: 'Hat' },
  { key: 'glasses', icon: '🕶️', label: 'Glasses' },
];
