// Avatar catalog for Surf Riders 2.0

export type Avatar = {
  key: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
};

export const AVATARS: Avatar[] = [
  { key: "kai", name: "Kai", description: "The chosen apprentice of the Ocean Guardian.", emoji: "🏄‍♂️", color: "#3aa6c8" },
  { key: "mira", name: "Mira", description: "Tidal witch with a stormrider's soul.", emoji: "🧜‍♀️", color: "#a8b1ff" },
  { key: "reef", name: "Reef", description: "Coral-born warrior of the deep reef.", emoji: "🐢", color: "#57d68d" },
  { key: "storm", name: "Storm", description: "Ex-pirate turned wave hunter.", emoji: "⛵", color: "#f7c94a" },
  { key: "nova", name: "Nova", description: "Sky-touched surfer with lightning affinity.", emoji: "⚡", color: "#c084fc" },
  { key: "coral", name: "Coral", description: "Guardian of the Coral Kingdom.", emoji: "🪸", color: "#ff7ab8" },
];

export function getAvatar(key: string | null | undefined): Avatar {
  return AVATARS.find((a) => a.key === key) ?? AVATARS[0];
}
