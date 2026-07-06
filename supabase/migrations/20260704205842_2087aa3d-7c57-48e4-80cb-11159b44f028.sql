-- Add shield inventory to profiles for the Shield power-up system.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS shields integer NOT NULL DEFAULT 0;
