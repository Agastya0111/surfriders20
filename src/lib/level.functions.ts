// Server functions for level progression, weapons, and avatar selection.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { WEAPONS, silverTargetForLevel, levelRewards } from "@/game/weapons";
import { AVATARS } from "@/game/avatars";

const CompleteLevelSchema = z.object({
  silverCollected: z.number().int().min(0).max(1_000_000),
  monsterDefeated: z.boolean(),
  clientLevel: z.number().int().min(1).max(9999),
});

export const completeLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CompleteLevelSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("silver_coins, gold_coins, current_level, highest_score")
      .eq("id", userId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!profile) throw new Error("Profile not found");

    const level = profile.current_level ?? 1;
    // If client and server disagree, use server. Never advance more than one level per call.
    const target = silverTargetForLevel(level);
    const cappedSilver = Math.min(data.silverCollected, target + 2000);
    if (cappedSilver < target) throw new Error("Silver target not met");

    const rewards = levelRewards(level);
    const goldGain = data.monsterDefeated ? rewards.gold : Math.floor(rewards.gold * 0.35);
    const bonusSilver = data.monsterDefeated ? rewards.bonusSilver : 0;
    const nextLevel = data.monsterDefeated ? level + 1 : level;

    // Silver "resets" toward next target each level; excess carries over.
    const carryover = Math.max(0, cappedSilver - target);
    const newSilver = (data.monsterDefeated ? carryover : (profile.silver_coins ?? 0)) + bonusSilver;
    const newGold = (profile.gold_coins ?? 0) + goldGain;

    await supabaseAdmin
      .from("profiles")
      .update({ silver_coins: newSilver, gold_coins: newGold, current_level: nextLevel })
      .eq("id", userId);

    // XP -> player_progress
    const { data: prog } = await supabaseAdmin
      .from("player_progress")
      .select("xp, level, skill_points")
      .eq("user_id", userId)
      .maybeSingle();
    const oldXp = prog?.xp ?? 0;
    const newXp = oldXp + rewards.xp;
    let playerLevel = prog?.level ?? 1;
    let acc = newXp;
    for (let l = 1; l < playerLevel; l++) acc -= 100 * l;
    while (acc >= 100 * playerLevel) {
      acc -= 100 * playerLevel;
      playerLevel += 1;
    }
    const skillPoints = (prog?.skill_points ?? 0) + Math.max(0, playerLevel - (prog?.level ?? 1));

    await supabaseAdmin.from("player_progress").upsert({
      user_id: userId,
      xp: newXp,
      level: playerLevel,
      skill_points: skillPoints,
      last_played_at: new Date().toISOString(),
    });

    return {
      nextLevel,
      silverCoins: newSilver,
      goldCoins: newGold,
      xpGained: rewards.xp,
      goldGained: goldGain,
      bonusSilver,
      playerLevel,
      monsterDefeated: data.monsterDefeated,
    };
  });

const PurchaseSchema = z.object({ weaponKey: z.string().min(1).max(64) });
export const purchaseWeapon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PurchaseSchema.parse(d))
  .handler(async ({ data, context }) => {
    const w = WEAPONS.find((x) => x.key === data.weaponKey);
    if (!w) throw new Error("Unknown weapon");
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: prof } = await supabaseAdmin
      .from("profiles").select("gold_coins").eq("id", userId).maybeSingle();
    if (!prof) throw new Error("Profile not found");

    const { data: existing } = await supabaseAdmin
      .from("owned_weapons").select("id").eq("user_id", userId).eq("weapon_key", w.key).maybeSingle();
    if (existing) throw new Error("Already owned");
    if ((prof.gold_coins ?? 0) < w.cost) throw new Error("Not enough gold");

    await supabaseAdmin
      .from("profiles")
      .update({ gold_coins: (prof.gold_coins ?? 0) - w.cost, equipped_weapon: w.key })
      .eq("id", userId);
    await supabaseAdmin.from("owned_weapons").insert({ user_id: userId, weapon_key: w.key });
    return { ok: true, weaponKey: w.key };
  });

const EquipSchema = z.object({ weaponKey: z.string().min(1).max(64) });
export const equipWeapon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => EquipSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: owned } = await supabaseAdmin
      .from("owned_weapons").select("id").eq("user_id", userId).eq("weapon_key", data.weaponKey).maybeSingle();
    if (!owned) throw new Error("Weapon not owned");
    await supabaseAdmin.from("profiles").update({ equipped_weapon: data.weaponKey }).eq("id", userId);
    return { ok: true };
  });

const AvatarSchema = z.object({ avatarKey: z.string().min(1).max(64) });
export const selectAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AvatarSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!AVATARS.find((a) => a.key === data.avatarKey)) throw new Error("Unknown avatar");
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ selected_avatar: data.avatarKey }).eq("id", userId);
    return { ok: true };
  });

export const getArmory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profRes, ownedRes] = await Promise.all([
      supabase.from("profiles").select("gold_coins, silver_coins, equipped_weapon, current_level, selected_avatar").eq("id", userId).maybeSingle(),
      supabase.from("owned_weapons").select("weapon_key").eq("user_id", userId),
    ]);
    return {
      profile: profRes.data,
      ownedWeapons: (ownedRes.data ?? []).map((r) => r.weapon_key as string),
    };
  });
