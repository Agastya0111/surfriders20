
-- =================== WORLDS ===================
CREATE TABLE IF NOT EXISTS public.worlds (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  order_index int NOT NULL DEFAULT 0,
  unlock_distance int NOT NULL DEFAULT 0,
  boss_name text NOT NULL,
  boss_hp int NOT NULL DEFAULT 6,
  palette jsonb NOT NULL DEFAULT '{}'::jsonb,
  obstacle_set jsonb NOT NULL DEFAULT '[]'::jsonb,
  weather text NOT NULL DEFAULT 'clear',
  daytime text NOT NULL DEFAULT 'day',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.worlds TO anon, authenticated;
GRANT ALL ON public.worlds TO service_role;
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Worlds catalog public" ON public.worlds;
CREATE POLICY "Worlds catalog public" ON public.worlds FOR SELECT USING (true);

-- =================== WORLD PROGRESS ===================
CREATE TABLE IF NOT EXISTS public.world_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  world_key text NOT NULL REFERENCES public.worlds(key) ON DELETE CASCADE,
  unlocked boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  best_score int NOT NULL DEFAULT 0,
  best_distance int NOT NULL DEFAULT 0,
  hidden_found int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, world_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.world_progress TO authenticated;
GRANT ALL ON public.world_progress TO service_role;
ALTER TABLE public.world_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own world progress" ON public.world_progress;
CREATE POLICY "Users manage own world progress" ON public.world_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =================== SHOP ITEMS ===================
CREATE TABLE IF NOT EXISTS public.shop_items (
  key text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('character','pet','trail','upgrade')),
  name text NOT NULL,
  description text,
  rarity text NOT NULL DEFAULT 'common',
  price_coins int NOT NULL DEFAULT 0,
  price_gems int NOT NULL DEFAULT 0,
  icon text,
  effect jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_items TO anon, authenticated;
GRANT ALL ON public.shop_items TO service_role;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shop items public" ON public.shop_items;
CREATE POLICY "Shop items public" ON public.shop_items FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.owned_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key text NOT NULL REFERENCES public.shop_items(key) ON DELETE CASCADE,
  equipped boolean NOT NULL DEFAULT false,
  level int NOT NULL DEFAULT 1,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owned_items TO authenticated;
GRANT ALL ON public.owned_items TO service_role;
ALTER TABLE public.owned_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own items" ON public.owned_items;
CREATE POLICY "Users manage own items" ON public.owned_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =================== SKILLS ===================
CREATE TABLE IF NOT EXISTS public.skills (
  key text PRIMARY KEY,
  branch text NOT NULL CHECK (branch IN ('movement','treasure','combat')),
  tier int NOT NULL DEFAULT 1,
  name text NOT NULL,
  description text,
  cost_points int NOT NULL DEFAULT 1,
  prerequisite_key text REFERENCES public.skills(key),
  effect jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.skills TO anon, authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Skills catalog public" ON public.skills;
CREATE POLICY "Skills catalog public" ON public.skills FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.user_skills (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_key text NOT NULL REFERENCES public.skills(key) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skill_key)
);
GRANT SELECT, INSERT, DELETE ON public.user_skills TO authenticated;
GRANT ALL ON public.user_skills TO service_role;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own skills" ON public.user_skills;
DROP POLICY IF EXISTS "Users unlock own skills" ON public.user_skills;
DROP POLICY IF EXISTS "Users delete own skills" ON public.user_skills;
CREATE POLICY "Users view own skills" ON public.user_skills FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users unlock own skills" ON public.user_skills FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own skills" ON public.user_skills FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =================== DAILY REWARDS ===================
CREATE TABLE IF NOT EXISTS public.daily_reward_claims (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_date date NOT NULL,
  day_index int NOT NULL,
  reward jsonb NOT NULL DEFAULT '{}'::jsonb,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, claim_date)
);
GRANT SELECT, INSERT ON public.daily_reward_claims TO authenticated;
GRANT ALL ON public.daily_reward_claims TO service_role;
ALTER TABLE public.daily_reward_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own daily claims" ON public.daily_reward_claims;
DROP POLICY IF EXISTS "Users insert own daily claims" ON public.daily_reward_claims;
CREATE POLICY "Users view own daily claims" ON public.daily_reward_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own daily claims" ON public.daily_reward_claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =================== EXTENDED COLUMNS ===================
ALTER TABLE public.player_progress
  ADD COLUMN IF NOT EXISTS skill_points int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_streak int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_daily_claim date;

ALTER TABLE public.player_settings
  ADD COLUMN IF NOT EXISTS music_volume numeric NOT NULL DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS sfx_volume numeric NOT NULL DEFAULT 0.8,
  ADD COLUMN IF NOT EXISTS touch_sensitivity numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS color_blind_mode text NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS reduce_motion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS high_contrast boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS large_text boolean NOT NULL DEFAULT false;

-- =================== SEEDS ===================
INSERT INTO public.worlds (key, name, description, order_index, unlock_distance, boss_name, boss_hp, palette, obstacle_set, weather, daytime) VALUES
('sunny_beach', 'Sunny Beach', 'A peaceful tropical shore — but danger lurks beneath.', 1, 0, 'Giant Crab', 6, '{"sky":["#ffd9a8","#7ed1e6"],"water":["#3aa6c8","#0f3a5e"],"accent":"#ffd166"}'::jsonb, '["rock","palm","wave"]'::jsonb, 'clear', 'day'),
('pirate_bay', 'Pirate Bay', 'Cursed galleons drift through fog. The Ghost Captain awaits.', 2, 600, 'Ghost Pirate Captain', 8, '{"sky":["#3a2a52","#1a1638"],"water":["#1d3a5a","#0a1830"],"accent":"#c9a86b"}'::jsonb, '["barrel","cannon","wave","spike"]'::jsonb, 'fog', 'dusk'),
('frozen_ocean', 'Frozen Ocean', 'Icebergs split the sea. A Leviathan stirs below.', 3, 1500, 'Ice Leviathan', 10, '{"sky":["#cfe9ff","#7fb5d6"],"water":["#9fd7e8","#2c5e7a"],"accent":"#e8f3ff"}'::jsonb, '["iceberg","floe","wave","spike"]'::jsonb, 'snow', 'day'),
('volcano_sea', 'Volcano Sea', 'Lava bubbles through cracked stone. The Serpent rises.', 4, 3000, 'Lava Serpent', 12, '{"sky":["#3a1a0f","#7a2a14"],"water":["#a83a14","#3a0a02"],"accent":"#ffb347"}'::jsonb, '["lava","rock","spike","wave"]'::jsonb, 'ash', 'night'),
('coral_kingdom', 'Coral Kingdom', 'A neon reef teems with life. The Guardian protects it.', 5, 5000, 'Coral Guardian', 14, '{"sky":["#ffb6d5","#7df0ea"],"water":["#23c4c4","#0a4a6e"],"accent":"#ff7ab8"}'::jsonb, '["coral","fish","wave","spike"]'::jsonb, 'clear', 'day'),
('storm_ocean', 'Storm Ocean', 'Thunder splits the sky. The Kraken hunts in lightning.', 6, 8000, 'Kraken', 16, '{"sky":["#222a3a","#0a1018"],"water":["#1a3a5e","#020812"],"accent":"#a5d8ff"}'::jsonb, '["wave","spike","tentacle","barrel"]'::jsonb, 'storm', 'night'),
('lost_atlantis', 'Lost Atlantis', 'Glowing ruins in the deep. The Pirate King reigns here.', 7, 12000, 'Pirate King', 20, '{"sky":["#1a2e5a","#0a1838"],"water":["#2a5e9e","#0a1a3e"],"accent":"#ffd700"}'::jsonb, '["pillar","spike","coral","wave"]'::jsonb, 'clear', 'twilight')
ON CONFLICT (key) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description, order_index=EXCLUDED.order_index,
  unlock_distance=EXCLUDED.unlock_distance, boss_name=EXCLUDED.boss_name, boss_hp=EXCLUDED.boss_hp,
  palette=EXCLUDED.palette, obstacle_set=EXCLUDED.obstacle_set,
  weather=EXCLUDED.weather, daytime=EXCLUDED.daytime;

INSERT INTO public.shop_items (key, category, name, description, rarity, price_coins, price_gems, icon, effect) VALUES
('char_marina', 'character', 'Marina', 'Coral Kingdom diver. +5% coin pickup.', 'rare', 2500, 0, '🧜‍♀️', '{"coin_bonus":0.05}'::jsonb),
('char_blaze', 'character', 'Blaze', 'Volcano-forged surfer. +10% dash duration.', 'epic', 6000, 0, '🔥', '{"dash_bonus":0.1}'::jsonb),
('char_frost', 'character', 'Frost', 'Frozen Ocean champion. Take 1 extra hit.', 'epic', 0, 50, '❄️', '{"extra_hp":1}'::jsonb),
('char_admiral', 'character', 'Admiral', 'Former pirate hunter. +15% score multiplier.', 'legendary', 0, 150, '🎖️', '{"score_mult":0.15}'::jsonb),
('pet_dolphin', 'pet', 'Dolphin', 'Magnets coins within 1 lane.', 'rare', 3000, 0, '🐬', '{"magnet_range":1}'::jsonb),
('pet_turtle', 'pet', 'Sea Turtle', 'Revives once per run.', 'epic', 0, 60, '🐢', '{"revive":1}'::jsonb),
('pet_seahorse', 'pet', 'Seahorse', 'Auto-collects nearby gems.', 'epic', 8000, 0, '🐉', '{"gem_magnet":true}'::jsonb),
('pet_orca', 'pet', 'Baby Orca', 'Stuns mini-obstacles every 20s.', 'legendary', 0, 200, '🐋', '{"stun_cd":20}'::jsonb),
('trail_foam', 'trail', 'Foam Trail', 'Classic white wake.', 'common', 500, 0, '🌊', '{"color":"#ffffff"}'::jsonb),
('trail_rainbow', 'trail', 'Rainbow', 'Six-color shimmer.', 'rare', 4000, 0, '🌈', '{"color":"rainbow"}'::jsonb),
('trail_fire', 'trail', 'Fire', 'Volcanic embers.', 'epic', 0, 40, '🔥', '{"color":"#ff5522"}'::jsonb),
('trail_aurora', 'trail', 'Aurora', 'Polar lights follow you.', 'legendary', 0, 120, '✨', '{"color":"aurora"}'::jsonb),
('up_magnet', 'upgrade', 'Coin Magnet', '+1 lane coin magnet range.', 'rare', 5000, 0, '🧲', '{"magnet":1}'::jsonb),
('up_shield', 'upgrade', 'Reinforced Board', '+1 max health.', 'epic', 10000, 0, '🛡️', '{"max_hp":1}'::jsonb),
('up_combo', 'upgrade', 'Combo Master', 'Combo timer +1s.', 'rare', 4000, 0, '🎯', '{"combo_time":1}'::jsonb),
('up_xp', 'upgrade', 'XP Booster', '+20% XP from runs.', 'epic', 0, 80, '⭐', '{"xp_bonus":0.2}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description, rarity=EXCLUDED.rarity,
  price_coins=EXCLUDED.price_coins, price_gems=EXCLUDED.price_gems,
  icon=EXCLUDED.icon, effect=EXCLUDED.effect;

INSERT INTO public.skills (key, branch, tier, name, description, cost_points, prerequisite_key, effect) VALUES
('m_swift', 'movement', 1, 'Swift Stance', 'Lane changes 10% faster.', 1, NULL, '{"lane_speed":0.1}'::jsonb),
('m_double_jump', 'movement', 2, 'Double Jump', 'Jump again in mid-air.', 2, 'm_swift', '{"double_jump":true}'::jsonb),
('m_long_slide', 'movement', 2, 'Long Slide', 'Slide lasts 30% longer.', 2, 'm_swift', '{"slide_time":0.3}'::jsonb),
('m_air_dash', 'movement', 3, 'Air Dash', 'Dash works mid-air.', 3, 'm_double_jump', '{"air_dash":true}'::jsonb),
('t_lucky', 'treasure', 1, 'Lucky Coin', '+10% coin pickup value.', 1, NULL, '{"coin_value":0.1}'::jsonb),
('t_chest_hunter', 'treasure', 2, 'Chest Hunter', 'Chests give +50% coins.', 2, 't_lucky', '{"chest_bonus":0.5}'::jsonb),
('t_gem_finder', 'treasure', 2, 'Gem Finder', 'Rare gem drops in chests.', 2, 't_lucky', '{"gem_drops":true}'::jsonb),
('t_treasure_radar', 'treasure', 3, 'Treasure Radar', 'See hidden collectibles.', 3, 't_chest_hunter', '{"radar":true}'::jsonb),
('c_iron_will', 'combat', 1, 'Iron Will', 'Hit invulnerability +0.5s.', 1, NULL, '{"invuln":0.5}'::jsonb),
('c_power_dash', 'combat', 2, 'Power Dash', 'Dash deals +1 boss damage.', 2, 'c_iron_will', '{"dash_dmg":1}'::jsonb),
('c_second_wind', 'combat', 2, 'Second Wind', 'Survive lethal hit at 1 HP, once per run.', 2, 'c_iron_will', '{"second_wind":true}'::jsonb),
('c_boss_slayer', 'combat', 3, 'Boss Slayer', 'Bosses give +100% coins.', 3, 'c_power_dash', '{"boss_loot":1.0}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description, cost_points=EXCLUDED.cost_points,
  prerequisite_key=EXCLUDED.prerequisite_key, effect=EXCLUDED.effect;

INSERT INTO public.achievements (key, name, description, metric, threshold, reward_coins, reward_gems, icon) VALUES
('world_pirate', 'Bay Boss', 'Defeat the Ghost Pirate Captain', 'bosses', 2, 500, 5, '☠️'),
('world_frozen', 'Ice Breaker', 'Defeat the Ice Leviathan', 'bosses', 3, 800, 8, '❄️'),
('world_volcano', 'Lava Master', 'Defeat the Lava Serpent', 'bosses', 4, 1200, 12, '🔥'),
('world_coral', 'Reef Champion', 'Defeat the Coral Guardian', 'bosses', 5, 1500, 15, '🐚'),
('world_storm', 'Kraken Slayer', 'Defeat the Kraken', 'bosses', 6, 2000, 20, '🐙'),
('world_atlantis', 'Pirate King', 'Defeat the Pirate King', 'bosses', 7, 5000, 50, '👑'),
('marathoner', 'Marathoner', 'Travel 100,000 total meters', 'distance', 100000, 5000, 25, '🏃')
ON CONFLICT (key) DO NOTHING;

-- Unlock first world for existing players
INSERT INTO public.world_progress (user_id, world_key, unlocked)
  SELECT p.id, 'sunny_beach', true FROM public.profiles p
  ON CONFLICT (user_id, world_key) DO NOTHING;

-- Updated handle_new_user trigger to unlock first world
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base_name TEXT;
BEGIN
  base_name := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'surfer');
  INSERT INTO public.profiles (id, username) VALUES (NEW.id, base_name || '_' || substr(NEW.id::text, 1, 6));
  INSERT INTO public.player_settings (user_id) VALUES (NEW.id);
  INSERT INTO public.player_progress (user_id) VALUES (NEW.id);
  INSERT INTO public.owned_surfboards (user_id, surfboard_key, equipped) VALUES (NEW.id, 'classic_wood', true);
  INSERT INTO public.owned_characters (user_id, character_key, equipped) VALUES (NEW.id, 'kai', true);
  INSERT INTO public.world_progress (user_id, world_key, unlocked) VALUES (NEW.id, 'sunny_beach', true);
  RETURN NEW;
END;
$$;
