
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  coins INTEGER NOT NULL DEFAULT 100,
  gems INTEGER NOT NULL DEFAULT 10,
  highest_score INTEGER NOT NULL DEFAULT 0,
  current_world TEXT NOT NULL DEFAULT 'tropical_lagoon',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- OWNED SURFBOARDS
CREATE TABLE public.owned_surfboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surfboard_key TEXT NOT NULL,
  equipped BOOLEAN NOT NULL DEFAULT false,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, surfboard_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owned_surfboards TO authenticated;
GRANT ALL ON public.owned_surfboards TO service_role;
ALTER TABLE public.owned_surfboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own surfboards" ON public.owned_surfboards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- OWNED CHARACTERS
CREATE TABLE public.owned_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_key TEXT NOT NULL,
  equipped BOOLEAN NOT NULL DEFAULT false,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, character_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owned_characters TO authenticated;
GRANT ALL ON public.owned_characters TO service_role;
ALTER TABLE public.owned_characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own characters" ON public.owned_characters FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SETTINGS
CREATE TABLE public.player_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  music_enabled BOOLEAN NOT NULL DEFAULT true,
  vibration_enabled BOOLEAN NOT NULL DEFAULT true,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  graphics_quality TEXT NOT NULL DEFAULT 'high',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_settings TO authenticated;
GRANT ALL ON public.player_settings TO service_role;
ALTER TABLE public.player_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON public.player_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER player_settings_updated_at BEFORE UPDATE ON public.player_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AUTO-PROVISION PROFILE + SETTINGS + STARTER ITEMS ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE base_name TEXT;
BEGIN
  base_name := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'surfer');
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, base_name || '_' || substr(NEW.id::text, 1, 6));
  INSERT INTO public.player_settings (user_id) VALUES (NEW.id);
  INSERT INTO public.owned_surfboards (user_id, surfboard_key, equipped) VALUES (NEW.id, 'classic_wood', true);
  INSERT INTO public.owned_characters (user_id, character_key, equipped) VALUES (NEW.id, 'kai', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
