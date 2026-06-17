
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marinas TO authenticated;
GRANT ALL ON public.marinas TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marina_members TO authenticated;
GRANT ALL ON public.marina_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boats TO authenticated;
GRANT ALL ON public.boats TO service_role;
-- public consumer browsing of boats/marinas comes in a later milestone with narrow anon SELECT policies
