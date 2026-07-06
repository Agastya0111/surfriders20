
-- Lock down client-side writes; route all state mutations through server functions

-- owned_surfboards: replace ALL policy with SELECT + UPDATE + DELETE (no INSERT)
DROP POLICY IF EXISTS "Users manage own surfboards" ON public.owned_surfboards;
CREATE POLICY "Users view own surfboards" ON public.owned_surfboards FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own surfboards" ON public.owned_surfboards FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own surfboards" ON public.owned_surfboards FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- owned_characters
DROP POLICY IF EXISTS "Users manage own characters" ON public.owned_characters;
CREATE POLICY "Users view own characters" ON public.owned_characters FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own characters" ON public.owned_characters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own characters" ON public.owned_characters FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- owned_items
DROP POLICY IF EXISTS "Users manage own items" ON public.owned_items;
CREATE POLICY "Users view own items" ON public.owned_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own items" ON public.owned_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own items" ON public.owned_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- inventory: SELECT only
DROP POLICY IF EXISTS "Users manage own inventory" ON public.inventory;
CREATE POLICY "Users view own inventory" ON public.inventory FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- player_progress: SELECT only (drop INSERT/UPDATE)
DROP POLICY IF EXISTS "Users insert own progress" ON public.player_progress;
DROP POLICY IF EXISTS "Users update own progress" ON public.player_progress;

-- user_skills: SELECT + DELETE only (drop INSERT)
DROP POLICY IF EXISTS "Users unlock own skills" ON public.user_skills;

-- leaderboards: SELECT (public) + DELETE only (drop INSERT and UPDATE)
DROP POLICY IF EXISTS "Users insert own leaderboard entries" ON public.leaderboards;
DROP POLICY IF EXISTS "Users update own leaderboard entries" ON public.leaderboards;
