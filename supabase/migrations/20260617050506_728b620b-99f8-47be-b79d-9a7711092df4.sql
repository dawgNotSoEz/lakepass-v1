
-- 1. account_type column
DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM ('customer', 'marina');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type public.account_type;

-- Allow each user to read & update their own profile (needed for role-select)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Seed demo marina + boats (idempotent)
DO $$
DECLARE
  demo_marina_id uuid;
  demo_owner uuid;
BEGIN
  SELECT id INTO demo_marina_id FROM public.marinas WHERE name = 'Sunset Harbor Marina' LIMIT 1;
  IF demo_marina_id IS NULL THEN
    SELECT id INTO demo_owner FROM auth.users ORDER BY created_at ASC LIMIT 1;
    IF demo_owner IS NULL THEN RETURN; END IF;

    INSERT INTO public.marinas (name, address, lake, timezone, created_by, onboarding_completed)
    VALUES ('Sunset Harbor Marina', '380 State Park Marina Rd, Branson, MO', 'Table Rock Lake', 'America/Chicago', demo_owner, true)
    RETURNING id INTO demo_marina_id;

    INSERT INTO public.boats (marina_id, name, boat_type, capacity, year, description, hourly_rate, daily_rate, photos, active) VALUES
      (demo_marina_id, 'Tahoe Sport Pontoon', 'Pontoon', 10, 2023, 'Roomy 24ft pontoon with bimini shade, bluetooth stereo, and easy boarding ladder.', 85, 595, ARRAY['https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=1200&q=80','https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=1200&q=80'], true),
      (demo_marina_id, 'MasterCraft X24', 'Wake', 12, 2024, 'Premium wakesurf boat — surf gate, ballast system, 6.2L engine.', 150, 1100, ARRAY['https://images.unsplash.com/photo-1564873151809-94d57e29e7c5?w=1200&q=80'], true),
      (demo_marina_id, 'Bass Tracker 175', 'Fishing', 4, 2022, 'Tournament-ready bass boat with livewell and trolling motor.', 60, 420, ARRAY['https://images.unsplash.com/photo-1605910300883-8e2ae0c8d3df?w=1200&q=80'], true),
      (demo_marina_id, 'Sea-Doo GTI 130', 'Ski', 3, 2024, 'Easy-riding jet ski — perfect for first timers and confident riders alike.', 75, 480, ARRAY['https://images.unsplash.com/photo-1614275151121-cb23db2b0f4f?w=1200&q=80'], true),
      (demo_marina_id, 'Cobalt R7 Bowrider', 'Deck', 8, 2023, 'Luxury bowrider with plush seating and integrated cooler.', 110, 820, ARRAY['https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80'], true),
      (demo_marina_id, 'Sun Tracker Party Barge', 'Pontoon', 14, 2022, 'The ultimate group cruiser — slide, wet bar, and shade for everyone.', 95, 695, ARRAY['https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=1200&q=80'], true);
  END IF;
END $$;
