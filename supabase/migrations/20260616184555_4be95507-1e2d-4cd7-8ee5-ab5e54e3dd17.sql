GRANT EXECUTE ON FUNCTION public.is_marina_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_marina_role(uuid, uuid, app_role[]) TO anon, authenticated;