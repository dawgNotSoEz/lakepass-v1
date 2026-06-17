import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const myProfileQuery = () =>
  queryOptions({
    queryKey: ["profile", "me"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const myMarinaQuery = () =>
  queryOptions({
    queryKey: ["marina", "me"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data: memberships, error: mErr } = await supabase
        .from("marina_members")
        .select("role, marina_id, marinas(*)")
        .eq("user_id", auth.user.id)
        .limit(1);
      if (mErr) throw mErr;
      const m = memberships?.[0];
      if (!m) return null;
      return { role: m.role, marina: m.marinas as any };
    },
  });

export const boatsQuery = (marinaId: string | undefined) =>
  queryOptions({
    queryKey: ["boats", marinaId],
    enabled: !!marinaId,
    queryFn: async () => {
      if (!marinaId) return [];
      const { data, error } = await supabase
        .from("boats")
        .select("*")
        .eq("marina_id", marinaId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
