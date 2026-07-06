
-- Extend profiles with level/currency/avatar/weapon
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS silver_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gold_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS selected_avatar text NOT NULL DEFAULT 'kai',
  ADD COLUMN IF NOT EXISTS equipped_weapon text;

-- Migrate legacy 'coins' balance into gold_coins once
UPDATE public.profiles SET gold_coins = GREATEST(gold_coins, coins) WHERE gold_coins = 0 AND coins > 0;

-- Owned weapons
CREATE TABLE IF NOT EXISTS public.owned_weapons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weapon_key text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, weapon_key)
);

GRANT SELECT ON public.owned_weapons TO authenticated;
GRANT ALL ON public.owned_weapons TO service_role;

ALTER TABLE public.owned_weapons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own weapons" ON public.owned_weapons
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Deny client insert on owned_weapons" ON public.owned_weapons
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny client update on owned_weapons" ON public.owned_weapons
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny client delete on owned_weapons" ON public.owned_weapons
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

-- Give every existing player the starter Wooden Sword
INSERT INTO public.owned_weapons (user_id, weapon_key)
SELECT id, 'wooden_sword' FROM public.profiles
ON CONFLICT DO NOTHING;

-- Equip wooden sword by default for anyone missing an equipped weapon
UPDATE public.profiles SET equipped_weapon = 'wooden_sword' WHERE equipped_weapon IS NULL;

-- Update handle_new_user to grant starter weapon and defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE base_name TEXT;
BEGIN
  base_name := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'surfer');
  INSERT INTO public.profiles (id, username, equipped_weapon) VALUES (NEW.id, base_name || '_' || substr(NEW.id::text, 1, 6), 'wooden_sword');
  INSERT INTO public.player_settings (user_id) VALUES (NEW.id);
  INSERT INTO public.player_progress (user_id) VALUES (NEW.id);
  INSERT INTO public.owned_surfboards (user_id, surfboard_key, equipped) VALUES (NEW.id, 'classic_wood', true);
  INSERT INTO public.owned_characters (user_id, character_key, equipped) VALUES (NEW.id, 'kai', true);
  INSERT INTO public.owned_weapons (user_id, weapon_key) VALUES (NEW.id, 'wooden_sword');
  INSERT INTO public.world_progress (user_id, world_key, unlocked) VALUES (NEW.id, 'sunny_beach', true);
  RETURN NEW;
END;
$function$;
