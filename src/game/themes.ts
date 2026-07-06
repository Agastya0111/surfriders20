// World theme configs — palettes, boss, weather, day/night.
// Keep in sync with public.worlds rows in Supabase.

export type Weather = "clear" | "fog" | "snow" | "ash" | "storm";
export type Daytime = "day" | "dusk" | "night" | "twilight";

export type WorldTheme = {
  key: string;
  name: string;
  sky: [string, string];
  water: [string, string];
  accent: string;
  bossName: string;
  bossHp: number;
  weather: Weather;
  daytime: Daytime;
  obstacles: string[];
};

export const DEFAULT_THEME: WorldTheme = {
  key: "sunny_beach",
  name: "Sunny Beach",
  sky: ["#ffd9a8", "#7ed1e6"],
  water: ["#3aa6c8", "#0f3a5e"],
  accent: "#ffd166",
  bossName: "Giant Crab",
  bossHp: 6,
  weather: "clear",
  daytime: "day",
  obstacles: ["rock", "palm", "wave"],
};

export const FALLBACK_THEMES: Record<string, WorldTheme> = {
  sunny_beach: DEFAULT_THEME,
  pirate_bay: {
    key: "pirate_bay", name: "Pirate Bay",
    sky: ["#3a2a52", "#1a1638"], water: ["#1d3a5a", "#0a1830"], accent: "#c9a86b",
    bossName: "Ghost Pirate Captain", bossHp: 8, weather: "fog", daytime: "dusk",
    obstacles: ["barrel", "cannon", "wave", "spike"],
  },
  frozen_ocean: {
    key: "frozen_ocean", name: "Frozen Ocean",
    sky: ["#cfe9ff", "#7fb5d6"], water: ["#9fd7e8", "#2c5e7a"], accent: "#e8f3ff",
    bossName: "Ice Leviathan", bossHp: 10, weather: "snow", daytime: "day",
    obstacles: ["iceberg", "floe", "wave", "spike"],
  },
  volcano_sea: {
    key: "volcano_sea", name: "Volcano Sea",
    sky: ["#3a1a0f", "#7a2a14"], water: ["#a83a14", "#3a0a02"], accent: "#ffb347",
    bossName: "Lava Serpent", bossHp: 12, weather: "ash", daytime: "night",
    obstacles: ["lava", "rock", "spike", "wave"],
  },
  coral_kingdom: {
    key: "coral_kingdom", name: "Coral Kingdom",
    sky: ["#ffb6d5", "#7df0ea"], water: ["#23c4c4", "#0a4a6e"], accent: "#ff7ab8",
    bossName: "Coral Guardian", bossHp: 14, weather: "clear", daytime: "day",
    obstacles: ["coral", "fish", "wave", "spike"],
  },
  storm_ocean: {
    key: "storm_ocean", name: "Storm Ocean",
    sky: ["#222a3a", "#0a1018"], water: ["#1a3a5e", "#020812"], accent: "#a5d8ff",
    bossName: "Kraken", bossHp: 16, weather: "storm", daytime: "night",
    obstacles: ["wave", "spike", "tentacle", "barrel"],
  },
  lost_atlantis: {
    key: "lost_atlantis", name: "Lost Atlantis",
    sky: ["#1a2e5a", "#0a1838"], water: ["#2a5e9e", "#0a1a3e"], accent: "#ffd700",
    bossName: "Pirate King", bossHp: 20, weather: "clear", daytime: "twilight",
    obstacles: ["pillar", "spike", "coral", "wave"],
  },
};
