
-- Restrictive INSERT deny policies (server functions using service role bypass RLS)
CREATE POLICY "Deny client insert on owned_characters" ON public.owned_characters
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "Deny client insert on owned_items" ON public.owned_items
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "Deny client insert on owned_surfboards" ON public.owned_surfboards
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "Deny client insert on user_skills" ON public.user_skills
  FOR INSERT TO authenticated WITH CHECK (false);

-- Validate leaderboards.world against allowlist
ALTER TABLE public.leaderboards
  ADD CONSTRAINT leaderboards_world_allowlist
  CHECK (world IN (
    'sunny_beach','pirate_bay','frozen_ocean','volcano_sea',
    'coral_kingdom','storm_ocean','lost_atlantis'
  ));
