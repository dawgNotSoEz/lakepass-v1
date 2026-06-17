
REVOKE EXECUTE ON FUNCTION public.is_marina_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_marina_role(uuid, uuid, public.app_role[]) FROM PUBLIC, anon, authenticated;
