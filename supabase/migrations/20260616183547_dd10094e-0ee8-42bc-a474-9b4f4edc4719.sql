
-- Public can read published marinas
GRANT SELECT (id, name, address, lake, timezone, widget_logo_url, widget_primary_color) ON public.marinas TO anon;
CREATE POLICY "Public can view published marinas"
  ON public.marinas FOR SELECT
  TO anon
  USING (onboarding_completed = true);

-- Public can read active boats belonging to published marinas
GRANT SELECT ON public.boats TO anon;
CREATE POLICY "Public can view active boats of published marinas"
  ON public.boats FOR SELECT
  TO anon
  USING (
    active = true
    AND EXISTS (
      SELECT 1 FROM public.marinas m
      WHERE m.id = boats.marina_id AND m.onboarding_completed = true
    )
  );

-- Authenticated users also need to browse the public catalog (independent of membership)
CREATE POLICY "Authenticated can view published marinas"
  ON public.marinas FOR SELECT
  TO authenticated
  USING (onboarding_completed = true);

CREATE POLICY "Authenticated can view active boats of published marinas"
  ON public.boats FOR SELECT
  TO authenticated
  USING (
    active = true
    AND EXISTS (
      SELECT 1 FROM public.marinas m
      WHERE m.id = boats.marina_id AND m.onboarding_completed = true
    )
  );
