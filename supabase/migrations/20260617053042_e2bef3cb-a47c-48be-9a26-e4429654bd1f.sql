
-- Seed extra marinas (use deterministic UUIDs so re-runs are idempotent)
INSERT INTO public.marinas (id, name, lake, address, timezone, onboarding_completed, created_by)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Blue Heron Marina', 'Lake Murray', '1 Blue Heron Dr, Lexington, SC', 'America/New_York', true,
    (SELECT created_by FROM public.marinas LIMIT 1)),
  ('a0000000-0000-0000-0000-000000000002', 'Ozarks Cove Marina', 'Lake of the Ozarks', '42 Cove Rd, Osage Beach, MO', 'America/Chicago', true,
    (SELECT created_by FROM public.marinas LIMIT 1)),
  ('a0000000-0000-0000-0000-000000000003', 'Emerald Bay Marina', 'Lake Tahoe', '88 Emerald Bay Rd, South Lake Tahoe, CA', 'America/Los_Angeles', true,
    (SELECT created_by FROM public.marinas LIMIT 1))
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.boats (marina_id, name, boat_type, capacity, year, description, amenities, photos, hourly_rate, daily_rate, active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Heron Sport 230', 'Ski', 8, 2023, 'Mid-size ski boat with tower & ballast.', ARRAY['Bluetooth audio','Tower','Ballast'], ARRAY['https://images.unsplash.com/photo-1564873151809-94d57e29e7c5?w=1200'], 145, 720, true),
  ('a0000000-0000-0000-0000-000000000001', 'Murray Pontoon 24', 'Pontoon', 12, 2022, 'Classic family pontoon, easy to drive.', ARRAY['Bimini top','Cooler','Speakers'], ARRAY['https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=1200'], 95, 480, true),
  ('a0000000-0000-0000-0000-000000000001', 'Bass Hunter 18', 'Fishing', 4, 2021, 'Center console fishing rig with electronics.', ARRAY['Trolling motor','Fish finder','Live well'], ARRAY['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200'], 85, 420, true),
  ('a0000000-0000-0000-0000-000000000002', 'Ozark Wake Pro', 'Wake', 10, 2024, 'Surf-ready wake boat with custom waves.', ARRAY['Surf system','Tower','Premium audio'], ARRAY['https://images.unsplash.com/photo-1502209524164-acea936639a2?w=1200'], 220, 1100, true),
  ('a0000000-0000-0000-0000-000000000002', 'Cove Cruiser 28', 'Deck', 14, 2023, 'Spacious deck boat for big groups.', ARRAY['Lounge seating','Bluetooth','Swim ladder'], ARRAY['https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=1200'], 175, 880, true),
  ('a0000000-0000-0000-0000-000000000002', 'Mini Pontoon 18', 'Pontoon', 6, 2020, 'Easy small pontoon, perfect for couples.', ARRAY['Bimini top','Cooler'], ARRAY['https://images.unsplash.com/photo-1527431016772-3296dbd3b2c8?w=1200'], 65, 320, true),
  ('a0000000-0000-0000-0000-000000000002', 'Lake Runner 21', 'Ski', 8, 2022, 'Quick acceleration, fun all day.', ARRAY['Tower','Speakers'], ARRAY['https://images.unsplash.com/photo-1610641818989-575305e75b35?w=1200'], 135, 680, true),
  ('a0000000-0000-0000-0000-000000000003', 'Tahoe Glide 26', 'Deck', 10, 2024, 'Premium deck boat with alpine views.', ARRAY['Premium audio','Bluetooth','Lounge'], ARRAY['https://images.unsplash.com/photo-1540202404-1b927e27fa8b?w=1200'], 245, 1200, true),
  ('a0000000-0000-0000-0000-000000000003', 'Emerald Wake 22', 'Wake', 9, 2023, 'Pristine wake boat for surf sessions.', ARRAY['Surf system','Ballast','Tower'], ARRAY['https://images.unsplash.com/photo-1599582909646-2c7f6f0cf7d8?w=1200'], 260, 1300, true),
  ('a0000000-0000-0000-0000-000000000003', 'Alpine Pontoon 22', 'Pontoon', 10, 2022, 'Comfort pontoon for crystal clear water.', ARRAY['Bimini top','Speakers','Swim ladder'], ARRAY['https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?w=1200'], 175, 860, true)
ON CONFLICT DO NOTHING;
