-- =================================================================
-- ENVISION'26 SUPABASE DATABASE SETUP SCHEMA
-- Drops all tables EXCEPT 'events' (preserves event catalog data)
-- Recreates clean participants, teams, and registrations tables.
-- =================================================================

-- 0. Ensure max_capacity column exists on events table
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 100;

-- 1. DROP existing triggers, functions, and non-events tables
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TABLE IF EXISTS public.registrations CASCADE;
DROP TABLE IF EXISTS public.event_registrations CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.participants CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP SEQUENCE IF EXISTS participants_env_id_seq CASCADE;

-- Create sequence for ENV ID generation
CREATE SEQUENCE participants_env_id_seq START WITH 1;

-- 2. Create participants table
CREATE TABLE public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE,
    env_id VARCHAR UNIQUE NOT NULL DEFAULT ('ENV-2026-' || LPAD(nextval('participants_env_id_seq')::text, 3, '0')),
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    mobile VARCHAR NULL,
    college VARCHAR NULL,
    food_pref VARCHAR NULL
);

-- 3. Create teams table
CREATE TABLE public.teams (
    team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name VARCHAR NOT NULL,
    event_name VARCHAR NOT NULL,
    leader_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE
);

-- 4. Create registrations table
CREATE TABLE public.registrations (
    reg_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    event_name VARCHAR NOT NULL,
    team_id UUID NULL REFERENCES public.teams(team_id) ON DELETE SET NULL,
    payment_order_id VARCHAR NOT NULL,
    payment_status VARCHAR NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Trigger function to automatically insert new Supabase users into public.participants
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.participants (auth_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (email) DO UPDATE
  SET auth_id = EXCLUDED.auth_id,
      name = COALESCE(public.participants.name, EXCLUDED.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
