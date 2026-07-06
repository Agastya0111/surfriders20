import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getPlayerProfile from "./tools/get-player-profile";
import listMyWeapons from "./tools/list-my-weapons";
import getLeaderboard from "./tools/get-leaderboard";

// Use the direct Supabase host as the OAuth issuer (see app-mcp-server-authoring).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "surf-riders-mcp",
  title: "Surf Riders 2.0",
  version: "0.1.0",
  instructions:
    "Tools for the signed-in Surf Riders 2.0 player: read their profile and progression, list weapons they own, and browse the game's leaderboard.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getPlayerProfile, listMyWeapons, getLeaderboard],
});
