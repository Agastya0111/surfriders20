import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getShopCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [itemsRes, ownedRes, profileRes, surfboardsRes, ownedBoardsRes] = await Promise.all([
      supabase.from("shop_items").select("*").order("price_coins", { ascending: true }),
      supabase.from("owned_items").select("*").eq("user_id", userId),
      supabase.from("profiles").select("coins, gems").eq("id", userId).maybeSingle(),
      supabase.from("surfboards").select("*"),
      supabase.from("owned_surfboards").select("*").eq("user_id", userId),
    ]);
    return {
      items: itemsRes.data ?? [],
      owned: ownedRes.data ?? [],
      profile: profileRes.data,
      surfboards: surfboardsRes.data ?? [],
      ownedSurfboards: ownedBoardsRes.data ?? [],
    };
  });

export const purchaseItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    itemKey: z.string().min(1).max(64),
    kind: z.enum(["item", "surfboard"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: pe } = await supabaseAdmin
      .from("profiles").select("coins, gems").eq("id", userId).maybeSingle();
    if (pe || !profile) throw pe ?? new Error("Profile not found");

    if (data.kind === "surfboard") {
      const { data: board } = await supabaseAdmin.from("surfboards").select("*").eq("key", data.itemKey).maybeSingle();
      if (!board) throw new Error("Surfboard not found");
      const { data: owned } = await supabaseAdmin.from("owned_surfboards")
        .select("surfboard_key").eq("user_id", userId).eq("surfboard_key", data.itemKey).maybeSingle();
      if (owned) throw new Error("Already owned");
      if ((profile.coins ?? 0) < board.price_coins) throw new Error("Not enough coins");
      if ((profile.gems ?? 0) < (board.price_gems ?? 0)) throw new Error("Not enough gems");
      await supabaseAdmin.from("profiles").update({
        coins: profile.coins - board.price_coins,
        gems: (profile.gems ?? 0) - (board.price_gems ?? 0),
      }).eq("id", userId);
      await supabaseAdmin.from("owned_surfboards").insert({ user_id: userId, surfboard_key: data.itemKey });
      return { ok: true };
    }

    const { data: item } = await supabaseAdmin.from("shop_items").select("*").eq("key", data.itemKey).maybeSingle();
    if (!item) throw new Error("Item not found");
    const { data: owned } = await supabaseAdmin.from("owned_items")
      .select("item_key").eq("user_id", userId).eq("item_key", data.itemKey).maybeSingle();
    if (owned) throw new Error("Already owned");
    if ((profile.coins ?? 0) < (item.price_coins ?? 0)) throw new Error("Not enough coins");
    if ((profile.gems ?? 0) < (item.price_gems ?? 0)) throw new Error("Not enough gems");
    await supabaseAdmin.from("profiles").update({
      coins: profile.coins - (item.price_coins ?? 0),
      gems: (profile.gems ?? 0) - (item.price_gems ?? 0),
    }).eq("id", userId);
    await supabaseAdmin.from("owned_items").insert({ user_id: userId, item_key: data.itemKey });
    return { ok: true };
  });

export const getSkillTree = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [skillsRes, ownedRes, progRes] = await Promise.all([
      supabase.from("skills").select("*").order("tier", { ascending: true }),
      supabase.from("user_skills").select("*").eq("user_id", userId),
      supabase.from("player_progress").select("skill_points").eq("user_id", userId).maybeSingle(),
    ]);
    return {
      skills: skillsRes.data ?? [],
      unlocked: ownedRes.data ?? [],
      skillPoints: progRes.data?.skill_points ?? 0,
    };
  });

export const unlockSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ skillKey: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: skill } = await supabaseAdmin.from("skills").select("*").eq("key", data.skillKey).maybeSingle();
    if (!skill) throw new Error("Skill not found");
    const { data: have } = await supabaseAdmin.from("user_skills")
      .select("skill_key").eq("user_id", userId).eq("skill_key", data.skillKey).maybeSingle();
    if (have) throw new Error("Already unlocked");

    // Server-side prerequisite check
    if (skill.prerequisite_key) {
      const { data: prereq } = await supabaseAdmin.from("user_skills")
        .select("skill_key").eq("user_id", userId).eq("skill_key", skill.prerequisite_key).maybeSingle();
      if (!prereq) throw new Error("Prerequisite skill not unlocked");
    }

    const { data: prog } = await supabaseAdmin.from("player_progress")
      .select("skill_points").eq("user_id", userId).maybeSingle();
    const points = prog?.skill_points ?? 0;
    if (points < skill.cost_points) throw new Error("Not enough skill points");
    await supabaseAdmin.from("player_progress").update({ skill_points: points - skill.cost_points }).eq("user_id", userId);
    await supabaseAdmin.from("user_skills").insert({ user_id: userId, skill_key: data.skillKey });

    return { ok: true };
  });

export const claimDailyReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);
    const { data: prog } = await supabaseAdmin.from("player_progress")
      .select("current_streak, last_daily_claim").eq("user_id", userId).maybeSingle();
    if (prog?.last_daily_claim === today) throw new Error("Already claimed today");

    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const streak = prog?.last_daily_claim === yesterday ? (prog.current_streak ?? 0) + 1 : 1;
    const day = ((streak - 1) % 7) + 1;
    const coinsReward = 50 * day;
    const gemsReward = day === 7 ? 5 : 0;

    const { data: profile } = await supabaseAdmin.from("profiles").select("coins, gems").eq("id", userId).maybeSingle();
    await supabaseAdmin.from("profiles").update({
      coins: (profile?.coins ?? 0) + coinsReward,
      gems: (profile?.gems ?? 0) + gemsReward,
    }).eq("id", userId);
    await supabaseAdmin.from("player_progress").update({
      current_streak: streak, last_daily_claim: today,
    }).eq("user_id", userId);
    await supabaseAdmin.from("daily_reward_claims").insert({
      user_id: userId, claim_date: today, day_index: day, reward: { coins: coinsReward, gems: gemsReward },
    });

    return { day, streak, coins: coinsReward, gems: gemsReward };
  });

export const getWorlds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [worldsRes, progRes] = await Promise.all([
      supabase.from("worlds").select("*").order("order_index", { ascending: true }),
      supabase.from("world_progress").select("*").eq("user_id", userId),
    ]);
    return { worlds: worldsRes.data ?? [], progress: progRes.data ?? [] };
  });

export const getAchievements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [allRes, unlockedRes] = await Promise.all([
      supabase.from("achievements").select("*").order("threshold", { ascending: true }),
      supabase.from("user_achievements").select("*").eq("user_id", userId),
    ]);
    return { achievements: allRes.data ?? [], unlocked: unlockedRes.data ?? [] };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    music_enabled: z.boolean().optional(),
    sound_enabled: z.boolean().optional(),
    music_volume: z.number().min(0).max(1).optional(),
    sfx_volume: z.number().min(0).max(1).optional(),
    vibration_enabled: z.boolean().optional(),
    notifications_enabled: z.boolean().optional(),
    graphics_quality: z.enum(["low", "medium", "high"]).optional(),
    touch_sensitivity: z.number().min(0.3).max(2.5).optional(),
    color_blind_mode: z.enum(["off", "protanopia", "deuteranopia", "tritanopia"]).optional(),
    reduce_motion: z.boolean().optional(),
    high_contrast: z.boolean().optional(),
    large_text: z.boolean().optional(),
  }).parse(d))

  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("player_settings")
      .upsert({ user_id: userId, ...data, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { ok: true };
  });

export const getDailyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("player_progress")
      .select("current_streak, last_daily_claim").eq("user_id", userId).maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    return {
      streak: data?.current_streak ?? 0,
      lastClaim: data?.last_daily_claim ?? null,
      canClaim: data?.last_daily_claim !== today,
    };
  });
