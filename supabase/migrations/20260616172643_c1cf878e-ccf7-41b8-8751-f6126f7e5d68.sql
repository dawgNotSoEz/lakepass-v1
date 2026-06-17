
-- Roles
CREATE TYPE public.app_role AS ENUM ('owner', 'manager', 'staff');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Marinas
CREATE TABLE public.marinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  address TEXT,
  lake TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  widget_logo_url TEXT,
  widget_primary_color TEXT NOT NULL DEFAULT '#0B4F6C',
  widget_font TEXT NOT NULL DEFAULT 'Outfit',
  stripe_account_id TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marinas TO authenticated;
GRANT ALL ON public.marinas TO service_role;
ALTER TABLE public.marinas ENABLE ROW LEVEL SECURITY;

-- Marina members (role assignment per marina)
CREATE TABLE public.marina_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marina_id UUID NOT NULL REFERENCES public.marinas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(marina_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marina_members TO authenticated;
GRANT ALL ON public.marina_members TO service_role;
ALTER TABLE public.marina_members ENABLE ROW LEVEL SECURITY;

-- Security-definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_marina_member(_marina_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.marina_members WHERE marina_id = _marina_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.has_marina_role(_marina_id UUID, _user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marina_members
    WHERE marina_id = _marina_id AND user_id = _user_id AND role = ANY(_roles)
  );
$$;

-- Marina policies
CREATE POLICY "Members can view marina" ON public.marinas FOR SELECT TO authenticated
  USING (public.is_marina_member(id, auth.uid()));
CREATE POLICY "Authenticated can create marina" ON public.marinas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners and managers can update marina" ON public.marinas FOR UPDATE TO authenticated
  USING (public.has_marina_role(id, auth.uid(), ARRAY['owner','manager']::public.app_role[]))
  WITH CHECK (public.has_marina_role(id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));
CREATE POLICY "Owners can delete marina" ON public.marinas FOR DELETE TO authenticated
  USING (public.has_marina_role(id, auth.uid(), ARRAY['owner']::public.app_role[]));

-- Marina members policies
CREATE POLICY "Members can view marina members" ON public.marina_members FOR SELECT TO authenticated
  USING (public.is_marina_member(marina_id, auth.uid()));
CREATE POLICY "Owners manage members" ON public.marina_members FOR ALL TO authenticated
  USING (public.has_marina_role(marina_id, auth.uid(), ARRAY['owner']::public.app_role[]))
  WITH CHECK (public.has_marina_role(marina_id, auth.uid(), ARRAY['owner']::public.app_role[]));
-- Allow the marina creator's self-insert (used by the trigger via SECURITY DEFINER)
CREATE POLICY "Self insert as owner on own marina" ON public.marina_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Boats
CREATE TABLE public.boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marina_id UUID NOT NULL REFERENCES public.marinas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  boat_type TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  year INTEGER,
  description TEXT,
  amenities TEXT[] NOT NULL DEFAULT '{}',
  photos TEXT[] NOT NULL DEFAULT '{}',
  buffer_minutes INTEGER NOT NULL DEFAULT 30,
  hourly_rate NUMERIC(10,2),
  daily_rate NUMERIC(10,2),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boats TO authenticated;
GRANT ALL ON public.boats TO service_role;
ALTER TABLE public.boats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view boats" ON public.boats FOR SELECT TO authenticated
  USING (public.is_marina_member(marina_id, auth.uid()));
CREATE POLICY "Owners/managers manage boats" ON public.boats FOR ALL TO authenticated
  USING (public.has_marina_role(marina_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]))
  WITH CHECK (public.has_marina_role(marina_id, auth.uid(), ARRAY['owner','manager']::public.app_role[]));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_marinas_updated BEFORE UPDATE ON public.marinas FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_boats_updated BEFORE UPDATE ON public.boats FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-add creator as owner of new marina
CREATE OR REPLACE FUNCTION public.handle_new_marina() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.marina_members (marina_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_marina_created AFTER INSERT ON public.marinas
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_marina();
