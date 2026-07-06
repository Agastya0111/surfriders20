import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_leaderboard",
  title: "Get leaderboard",
  description:
    "Get the top Surf Riders 2.0 leaderboard entries ordered by score. Optionally filter by world.",
  inputSchema: {
    world: z.string().trim().min(1).max(64).optional().describe("Optional world key to filter by."),
    limit: z.number().int().min(1).max(50).optional().describe("Max entries to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ world, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("leaderboards")
      .select("username, score, distance, world, achieved_at")
      .order("score", { ascending: false })
      .limit(limit ?? 10);
    if (world) q = q.eq("world", world);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { entries: data ?? [] },
    };
  },
});
