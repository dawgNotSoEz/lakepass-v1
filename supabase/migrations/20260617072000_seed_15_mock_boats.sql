-- 1. Insert a dummy seed user in auth.users if not exists
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'demo-owner@lakepass.com',
  '$2a$10$wE9946hH6eW0v2oJ1Z2o2O7e2O7e2O7e2O7e2O7e2O7e2O7e2O7e2',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Demo Owner"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert the seed marinas if not exists
INSERT INTO public.marinas (id, name, lake, address, timezone, onboarding_completed, created_by)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Blue Heron Marina', 'Lake Murray', '1 Blue Heron Dr, Lexington, SC', 'America/New_York', true, '00000000-0000-0000-0000-000000000000'),
  ('a0000000-0000-0000-0000-000000000002', 'Ozarks Cove Marina', 'Lake of the Ozarks', '42 Cove Rd, Osage Beach, MO', 'America/Chicago', true, '00000000-0000-0000-0000-000000000000'),
  ('a0000000-0000-0000-0000-000000000003', 'Emerald Bay Marina', 'Lake Tahoe', '88 Emerald Bay Rd, South Lake Tahoe, CA', 'America/Los_Angeles', true, '00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

-- 3. Seed 15 detailed mock boats with deterministic UUIDs
INSERT INTO public.boats (id, marina_id, name, boat_type, capacity, year, description, amenities, photos, hourly_rate, daily_rate, active)
VALUES
  -- Blue Heron Marina (Lake Murray) - ID: a0000000-0000-0000-0000-000000000001
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Sun Tracker Bass Buggy 18', 'Pontoon', 8, 2022, 'Perfect family fishing pontoon with aerated livewell and folding fishing chairs.', ARRAY['Bimini top', 'Live well', 'Bluetooth audio'], ARRAY['https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=1200'], 65, 420, true),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Yamaha AR250', 'Ski', 12, 2023, 'Spacious jet boat with twin engines, wakeboard tower, and premium sound system.', ARRAY['Twin engines', 'Wakeboard tower', 'Premium audio', 'Swim platform'], ARRAY['https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1200'], 135, 890, true),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Ranger Z520R', 'Fishing', 3, 2024, 'Professional-grade bass boat with dual consoles, trolling motor, and high-end sonar.', ARRAY['Trolling motor', 'GPS / Sonar', 'Rod lockers', 'Live well'], ARRAY['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200'], 95, 650, true),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'G3 Suncatcher Select 22', 'Pontoon', 11, 2021, 'Comfortable cruising pontoon with plush lounge seating and rear swim ladder.', ARRAY['Bimini top', 'Lounge seats', 'Swim ladder', 'Cooler'], ARRAY['https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=1200'], 85, 550, true),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Bennington 23 L-Line', 'Pontoon', 13, 2023, 'Luxury pontoon boat featuring a premium layout, high-back captains chair, and under-deck lighting.', ARRAY['Premium audio', 'Under-deck lights', 'Bimini top', 'Table'], ARRAY['https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=1200'], 110, 790, true),

  -- Ozarks Cove Marina (Lake of the Ozarks) - ID: a0000000-0000-0000-0000-000000000002
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'Malibu Wakesetter 23 MXZ', 'Wake', 15, 2023, 'Ultimate wakesurfing machine. Surfgate, power wedge, and customized rider presets.', ARRAY['Surf system', 'Power wedge', 'Ballast tanks', 'Premium audio'], ARRAY['https://images.unsplash.com/photo-1502209524164-acea936639a2?w=1200'], 220, 1400, true),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'Sea Ray SDX 250', 'Deck', 14, 2022, 'Spacious deck boat with carry-on cooler, wet bar, and large swim platform.', ARRAY['Wet bar', 'Swim platform', 'Cooler', 'Bluetooth audio'], ARRAY['https://images.unsplash.com/photo-1540202404-1b927e27fa8b?w=1200'], 125, 850, true),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 'Lund 1875 Impact XS', 'Fishing', 6, 2023, 'Versatile family fishing boat. Dual livewells, rod storage, and jump seats.', ARRAY['Dual livewells', 'Rod storage', 'Sonar', 'Bimini top'], ARRAY['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200'], 75, 480, true),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', 'Chaparral 21 SSi', 'Ski', 10, 2022, 'Sporty bowrider with canvas bimini, ski tow eye, and wrap-around windshield.', ARRAY['Bimini top', 'Ski tow eye', 'Windshield', 'Bluetooth audio'], ARRAY['https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1200'], 95, 600, true),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', 'Moomba Craz', 'Wake', 16, 2023, 'High-performance wake and surf boat with Autopilot ballast controls.', ARRAY['Surf system', 'Autopilot ballast', 'Tower speakers', 'Bimini top'], ARRAY['https://images.unsplash.com/photo-1502209524164-acea936639a2?w=1200'], 165, 1150, true),

  -- Emerald Bay Marina (Lake Tahoe) - ID: a0000000-0000-0000-0000-000000000003
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000003', 'Avalon Catalina Quad Lounger', 'Pontoon', 12, 2023, 'Premium pontoon with quad lounge layouts, heavy-duty build for big lakes.', ARRAY['Quad lounges', 'Heavy duty hull', 'Bimini top', 'GPS'], ARRAY['https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?w=1200'], 105, 720, true),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000003', 'Harris Crowne SL 250', 'Pontoon', 15, 2024, 'Ultra-luxury pontoon with power tower, digital helm, and heated seats.', ARRAY['Power tower', 'Digital helm', 'Heated seats', 'Premium audio'], ARRAY['https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?w=1200'], 145, 980, true),
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000003', 'Nautique G23', 'Wake', 16, 2024, 'The gold standard in wakeboarding and wakesurfing. Unmatched wave customizability.', ARRAY['Nautique surf select', 'Flight control tower', 'Subfloor ballast', 'Heated seats'], ARRAY['https://images.unsplash.com/photo-1502209524164-acea936639a2?w=1200'], 250, 1600, true),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000003', 'Regal LS4 Surf', 'Ski', 12, 2023, 'Luxury sport boat with forward drive propulsion and surf-optimized tab systems.', ARRAY['Forward drive', 'Surf tabs', 'Power tower', 'Bluetooth audio'], ARRAY['https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1200'], 155, 990, true),
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000003', 'Trident 24 Deck Boat', 'Deck', 12, 2022, 'Versatile and fast bowrider deck boat. Ideal for day cruising and water sports.', ARRAY['Swim ladder', 'Ski locker', 'Bimini top', 'Cooler'], ARRAY['https://images.unsplash.com/photo-1540202404-1b927e27fa8b?w=1200'], 115, 750, true)
ON CONFLICT (id) DO NOTHING;
