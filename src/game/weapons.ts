// Weapon catalog + monster/level tuning for Surf Riders 2.0

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type Weapon = {
  key: string;
  name: string;
  description: string;
  damage: number;
  speed: number; // attacks per second
  cost: number; // gold coins
  rarity: Rarity;
  icon: string;
};

export const WEAPONS: Weapon[] = [
  { key: "wooden_sword", name: "Wooden Sword", description: "Basic training blade. Every rider starts here.", damage: 8, speed: 1.2, cost: 0, rarity: "common", icon: "🗡️" },
  { key: "iron_sword", name: "Iron Sword", description: "Forged steel — balanced and reliable.", damage: 16, speed: 1.3, cost: 500, rarity: "common", icon: "⚔️" },
  { key: "pirate_cutlass", name: "Pirate Cutlass", description: "Curved blade of the seven seas. Bonus vs. skeletons.", damage: 26, speed: 1.5, cost: 1200, rarity: "uncommon", icon: "🏴‍☠️" },
  { key: "crystal_spear", name: "Crystal Spear", description: "Long reach, sharp point, cold shine.", damage: 38, speed: 1.4, cost: 2400, rarity: "uncommon", icon: "🔱" },
  { key: "trident", name: "Trident", description: "Weapon of the tide guardian. Strong vs. sea creatures.", damage: 54, speed: 1.6, cost: 4200, rarity: "rare", icon: "🪝" },
  { key: "fire_axe", name: "Fire Axe", description: "Burns through armor. Devastating vs. ice foes.", damage: 74, speed: 1.2, cost: 6800, rarity: "rare", icon: "🪓" },
  { key: "ice_hammer", name: "Ice Hammer", description: "Slow, bone-shattering blow. Freezes lava foes.", damage: 96, speed: 1.0, cost: 10000, rarity: "epic", icon: "🔨" },
  { key: "thunder_blade", name: "Thunder Blade", description: "Strikes at the speed of the storm.", damage: 132, speed: 2.0, cost: 14000, rarity: "epic", icon: "⚡" },
  { key: "magic_staff", name: "Magic Staff", description: "Channels raw ocean magic.", damage: 170, speed: 1.7, cost: 20000, rarity: "epic", icon: "🪄" },
  { key: "legendary_ocean_blade", name: "Legendary Ocean Blade", description: "The blade that shaped the seven seas.", damage: 220, speed: 2.2, cost: 30000, rarity: "legendary", icon: "🌊" },
];

export function getWeapon(key: string | null | undefined): Weapon {
  // Fallback: legacy `lightning_blade` maps to the renamed thunder_blade.
  if (key === "lightning_blade") return WEAPONS.find((w) => w.key === "thunder_blade") ?? WEAPONS[0];
  return WEAPONS.find((w) => w.key === key) ?? WEAPONS[0];
}

export function silverTargetForLevel(level: number): number {
  return Math.max(1, level) * 5000;
}

export function levelRewards(level: number) {
  return {
    gold: 200 + Math.floor(level * 60),
    xp: 100 + Math.floor(level * 25),
    bonusSilver: 500 + Math.floor(level * 100),
  };
}

export type Monster = {
  name: string;
  emoji: string;
  hp: number;
  damage: number;
  interval: number; // seconds between attacks
  weakness?: string; // weapon key that deals bonus damage
};

// Spec roster L1-L5: Giant Crab, Pirate Skeleton, Sea Serpent, Ice Monster, Lava Guardian.
// L6+ continue with stronger themed foes.
const MONSTER_ROSTER: Array<Pick<Monster, "name" | "emoji" | "weakness">> = [
  { name: "Giant Crab",     emoji: "🦀", weakness: "iron_sword" },
  { name: "Pirate Skeleton", emoji: "☠️", weakness: "pirate_cutlass" },
  { name: "Sea Serpent",    emoji: "🐍", weakness: "trident" },
  { name: "Ice Monster",    emoji: "❄️", weakness: "fire_axe" },
  { name: "Lava Guardian",  emoji: "🔥", weakness: "ice_hammer" },
  { name: "Storm Kraken",   emoji: "🐙", weakness: "thunder_blade" },
  { name: "Ghost Galleon",  emoji: "👻", weakness: "magic_staff" },
  { name: "Coral Titan",    emoji: "🪸", weakness: "trident" },
  { name: "Abyss Wyrm",     emoji: "🐉", weakness: "legendary_ocean_blade" },
  { name: "Deep One",       emoji: "👁️", weakness: "legendary_ocean_blade" },
];

export function monsterForLevel(level: number): Monster {
  const pick = MONSTER_ROSTER[(Math.max(1, level) - 1) % MONSTER_ROSTER.length];
  return {
    name: pick.name,
    emoji: pick.emoji,
    weakness: pick.weakness,
    hp: Math.round(60 * Math.pow(1.32, level - 1)),
    damage: 6 + Math.floor(level * 1.4),
    interval: Math.max(1.1, 2.4 - level * 0.05),
  };
}

// Bonus damage multiplier when the equipped weapon exploits the monster weakness.
export const WEAKNESS_MULTIPLIER = 1.6;

export const SHIELD_PRICE = 350; // gold coins per shield in shop


export const RARITY_COLOR: Record<Rarity, string> = {
  common: "text-muted-foreground",
  uncommon: "text-lagoon",
  rare: "text-foam",
  epic: "text-coral",
  legendary: "text-sunset",
};
