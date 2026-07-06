import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LeaderboardRow = {
  user_id: string;
  username: string;
  avatar: string | null;
  selected_avatar: string | null;
  highest_score: number;
  current_level: number;
  gold_coins: number;
  monsters_defeated: number;
};

export const getGlobalLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LeaderboardRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Top 100 by highest_score. Small games — this is cheap enough to run per view.
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, avatar_url, selected_avatar, highest_score, current_level, gold_coins")
      .order("highest_score", { ascending: false })
      .order("current_level", { ascending: false })
      .limit(100);
    if (error) throw error;
    const ids = (profiles ?? []).map((p) => p.id);
    let progressMap = new Map<string, number>();
    if (ids.length) {
      const { data: progs } = await supabaseAdmin
        .from("player_progress")
        .select("user_id, bosses_defeated")
        .in("user_id", ids);
      progressMap = new Map((progs ?? []).map((p) => [p.user_id, p.bosses_defeated ?? 0]));
    }
    // Signal the caller's identity for row highlighting without exposing others' user_ids beyond need.
    return (profiles ?? []).map((p) => ({
      user_id: p.id === context.userId ? p.id : "",
      username: p.username ?? "Surfer",
      avatar: p.avatar_url ?? null,
      selected_avatar: p.selected_avatar ?? null,
      highest_score: p.highest_score ?? 0,
      current_level: p.current_level ?? 1,
      gold_coins: p.gold_coins ?? 0,
      monsters_defeated: progressMap.get(p.id) ?? 0,
    }));
  });
