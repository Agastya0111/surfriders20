
-- profiles: restrict SELECT to owner only (hide coins/gems from public)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- leaderboards: add UPDATE/DELETE policies scoped to owner
CREATE POLICY "Users update own leaderboard entries"
  ON public.leaderboards FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own leaderboard entries"
  ON public.leaderboards FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- user_achievements: add DELETE policy scoped to owner
CREATE POLICY "Users delete own achievements"
  ON public.user_achievements FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
