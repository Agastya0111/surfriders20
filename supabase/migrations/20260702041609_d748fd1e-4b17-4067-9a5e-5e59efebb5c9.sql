
-- Explicitly deny direct client writes on inventory, leaderboards, and player_progress.
-- Service role bypasses RLS; all writes go through server functions using supabaseAdmin.

-- inventory: deny INSERT/UPDATE/DELETE for authenticated
CREATE POLICY "Deny client insert on inventory" ON public.inventory
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny client update on inventory" ON public.inventory
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny client delete on inventory" ON public.inventory
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

-- leaderboards: deny INSERT/UPDATE for authenticated (keep existing owner DELETE)
CREATE POLICY "Deny client insert on leaderboards" ON public.leaderboards
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny client update on leaderboards" ON public.leaderboards
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

-- player_progress: deny INSERT/UPDATE/DELETE for authenticated
CREATE POLICY "Deny client insert on player_progress" ON public.player_progress
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny client update on player_progress" ON public.player_progress
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny client delete on player_progress" ON public.player_progress
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);
