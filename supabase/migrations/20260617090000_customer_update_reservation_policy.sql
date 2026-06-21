-- Allow customers to update their own reservations (e.g. for signing waivers)
DROP POLICY IF EXISTS "Customers update own reservations" ON public.reservations;
CREATE POLICY "Customers update own reservations" ON public.reservations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR customer_email = auth.jwt()->>'email')
  WITH CHECK (auth.uid() = user_id OR customer_email = auth.jwt()->>'email');
