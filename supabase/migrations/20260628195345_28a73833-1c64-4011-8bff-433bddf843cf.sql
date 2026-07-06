
-- ============ player_progress ============
CREATE TABLE public.player_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  total_distance BIGINT NOT NULL DEFAULT 0,
  best_distance INTEGER NOT NULL DEFAULT 0,
  total_runs INTEGER NOT NULL DEFAULT 0,
  total_coins_earned BIGINT NOT NULL DEFAULT 0,
  bosses_defeated INTEGER NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_progress TO authenticated;
GRANT ALL ON public.player_progress TO service_role;
ALTER TABLE public.player_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own progress" ON public.player_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress" ON public.player_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.player_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_player_progress_updated BEFORE UPDATE ON public.player_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ inventory ============
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_key)
);
CREATE INDEX idx_inventory_user ON public.inventory(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT ALL ON public.inventory TO service_role;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own inventory" ON public.inventory FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ surfboards catalog ============
CREATE TABLE public.surfboards (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rarity TEXT NOT NULL DEFAULT 'common',
  price_coins INTEGER NOT NULL DEFAULT 0,
  price_gems INTEGER NOT NULL DEFAULT 0,
  speed INTEGER NOT NULL DEFAULT 5,
  control INTEGER NOT NULL DEFAULT 5,
  boost INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.surfboards TO anon, authenticated;
GRANT ALL ON public.surfboards TO service_role;
ALTER TABLE public.surfboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Surfboards are public" ON public.surfboards FOR SELECT USING (true);

-- ============ achievements catalog ============
CREATE TABLE public.achievements (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  reward_gems INTEGER NOT NULL DEFAULT 0,
  threshold INTEGER NOT NULL DEFAULT 0,
  metric TEXT NOT NULL DEFAULT 'score',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements are public" ON public.achievements FOR SELECT USING (true);

-- ============ user_achievements ============
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL REFERENCES public.achievements(key) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);
CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);
GRANT SELECT, INSERT, DELETE ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own achievements" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own achievements" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ leaderboards ============
CREATE TABLE public.leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  score INTEGER NOT NULL,
  distance INTEGER NOT NULL DEFAULT 0,
  world TEXT NOT NULL DEFAULT 'tropical_lagoon',
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leaderboards_score ON public.leaderboards(score DESC);
CREATE INDEX idx_leaderboards_world_score ON public.leaderboards(world, score DESC);
CREATE INDEX idx_leaderboards_user ON public.leaderboards(user_id);
GRANT SELECT ON public.leaderboards TO anon, authenticated;
GRANT INSERT ON public.leaderboards TO authenticated;
GRANT ALL ON public.leaderboards TO service_role;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leaderboards are public" ON public.leaderboards FOR SELECT USING (true);
CREATE POLICY "Users insert own leaderboard entries" ON public.leaderboards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ extend handle_new_user to provision player_progress ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE base_name TEXT;
BEGIN
  base_name := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'surfer');
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, base_name || '_' || substr(NEW.id::text, 1, 6));
  INSERT INTO public.player_settings (user_id) VALUES (NEW.id);
  INSERT INTO public.player_progress (user_id) VALUES (NEW.id);
  INSERT INTO public.owned_surfboards (user_id, surfboard_key, equipped) VALUES (NEW.id, 'classic_wood', true);
  INSERT INTO public.owned_characters (user_id, character_key, equipped) VALUES (NEW.id, 'kai', true);
  RETURN NEW;
END;
$$;

-- Ensure auth trigger exists (re-create idempotently)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill player_progress for any existing users
INSERT INTO public.player_progress (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============ seed catalogs ============
INSERT INTO public.surfboards (key, name, description, rarity, price_coins, price_gems, speed, control, boost) VALUES
  ('classic_wood', 'Classic Wood', 'A timeless wooden longboard. Reliable and steady.', 'common', 0, 0, 5, 7, 4),
  ('coral_cruiser', 'Coral Cruiser', 'Polished coral inlays. Cuts the wave like silk.', 'rare', 1500, 0, 7, 6, 6),
  ('storm_runner', 'Storm Runner', 'Forged for stormy seas. Built for speed.', 'epic', 5000, 0, 9, 5, 8),
  ('tide_crystal', 'Tide Crystal', 'Infused with crystal energy. Legendary boost.', 'legendary', 0, 50, 9, 9, 10)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.achievements (key, name, description, icon, reward_coins, reward_gems, threshold, metric) VALUES
  ('first_wave', 'First Wave', 'Complete your first run.', '🌊', 100, 1, 1, 'runs'),
  ('coin_collector', 'Coin Collector', 'Collect 1,000 coins in total.', '🪙', 200, 2, 1000, 'coins'),
  ('distance_500', 'Long Rider', 'Travel 500m in a single run.', '🏄', 150, 1, 500, 'distance'),
  ('distance_2000', 'Ocean Voyager', 'Travel 2,000m in a single run.', '🌅', 500, 5, 2000, 'distance'),
  ('crab_slayer', 'Crab Slayer', 'Defeat the Giant Crab.', '🦀', 1000, 10, 1, 'bosses'),
  ('score_10k', 'Score Master', 'Reach 10,000 points in a single run.', '⭐', 750, 5, 10000, 'score')
ON CONFLICT (key) DO NOTHING;
