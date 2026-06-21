-- Core SaaS features schema migration

-- Create reservation status type if not exists
DO $$ BEGIN
  CREATE TYPE public.reservation_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create maintenance status type if not exists
DO $$ BEGIN
  CREATE TYPE public.maintenance_status AS ENUM ('open', 'in_progress', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marina_id UUID NOT NULL REFERENCES public.marinas(id) ON DELETE CASCADE,
  boat_id UUID NOT NULL REFERENCES public.boats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status public.reservation_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  security_deposit NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  waiver_signed BOOLEAN NOT NULL DEFAULT false,
  waiver_signature_text TEXT,
  waiver_signed_at TIMESTAMPTZ,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  fuel_level_out TEXT,
  fuel_level_in TEXT,
  condition_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO anon;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Maintenance logs table
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id UUID NOT NULL REFERENCES public.boats(id) ON DELETE CASCADE,
  logged_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  issue_description TEXT NOT NULL,
  status public.maintenance_status NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  scheduled_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_logs TO authenticated;
GRANT ALL ON public.maintenance_logs TO service_role;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Touch triggers
CREATE TRIGGER trg_reservations_updated BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_maintenance_logs_updated BEFORE UPDATE ON public.maintenance_logs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Policies for reservations
DROP POLICY IF EXISTS "Members manage reservations" ON public.reservations;
CREATE POLICY "Members manage reservations" ON public.reservations FOR ALL TO authenticated
  USING (public.is_marina_member(marina_id, auth.uid()))
  WITH CHECK (public.is_marina_member(marina_id, auth.uid()));

DROP POLICY IF EXISTS "Customers view own reservations" ON public.reservations;
CREATE POLICY "Customers view own reservations" ON public.reservations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Customers insert own reservations" ON public.reservations;
CREATE POLICY "Customers insert own reservations" ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Anyone view reservations availability" ON public.reservations;
CREATE POLICY "Anyone view reservations availability" ON public.reservations FOR SELECT TO authenticated, anon
  USING (true);

-- Policies for maintenance logs
DROP POLICY IF EXISTS "Members manage maintenance logs" ON public.maintenance_logs;
CREATE POLICY "Members manage maintenance logs" ON public.maintenance_logs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.boats b
    WHERE b.id = maintenance_logs.boat_id AND public.is_marina_member(b.marina_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.boats b
    WHERE b.id = maintenance_logs.boat_id AND public.is_marina_member(b.marina_id, auth.uid())
  ));
