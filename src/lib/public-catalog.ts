import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PublicBoatRow = {
  id: string;
  marina_id: string;
  name: string;
  boat_type: string;
  capacity: number;
  year: number | null;
  description: string | null;
  amenities: string[];
  photos: string[];
  hourly_rate: number | null;
  daily_rate: number | null;
  marinas: { id: string; name: string; lake: string | null; address: string | null } | null;
};

export type BrowseFilters = {
  lake?: string;
  boatType?: string;
  guests?: number;
  maxPrice?: number;
  marinaId?: string;
};

const BOAT_FLEET_PHOTOS = [
  "https://images.pexels.com/photos/163236/luxury-yacht-boat-speed-water-163236.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/296278/pexels-photo-296278.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/237272/pexels-photo-237272.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/1796725/pexels-photo-1796725.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/416676/pexels-photo-416676.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

function fleetPhotoFor(key: string, offset = 0) {
  const sum = Array.from(key).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return BOAT_FLEET_PHOTOS[(sum + offset) % BOAT_FLEET_PHOTOS.length];
}

function withBoatFleetPhoto(boat: PublicBoatRow, index = 0): PublicBoatRow {
  return { ...boat, photos: [fleetPhotoFor(`${boat.id}-${boat.boat_type}`, index)] };
}

export function browseBoatsQuery(filters: BrowseFilters) {
  return queryOptions({
    queryKey: ["public", "boats", filters],
    queryFn: async (): Promise<PublicBoatRow[]> => {
      let q = supabase
        .from("boats")
        .select(
          "id,marina_id,name,boat_type,capacity,year,description,amenities,photos,hourly_rate,daily_rate,marinas!inner(id,name,lake,address)",
        )
        .eq("active", true)
        .order("name");
      if (filters.boatType) q = q.ilike("boat_type", `%${filters.boatType}%`);
      if (filters.guests) q = q.gte("capacity", filters.guests);
      if (filters.maxPrice) q = q.lte("hourly_rate", filters.maxPrice);
      if (filters.lake && filters.lake !== "Any") q = q.eq("marinas.lake", filters.lake);
      if (filters.marinaId) q = q.eq("marina_id", filters.marinaId);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as unknown as PublicBoatRow[]).map(withBoatFleetPhoto);
    },
  });
}

export function boatDetailQuery(boatId: string) {
  return queryOptions({
    queryKey: ["public", "boat", boatId],
    queryFn: async (): Promise<PublicBoatRow | null> => {
      const { data, error } = await supabase
        .from("boats")
        .select(
          "id,marina_id,name,boat_type,capacity,year,description,amenities,photos,hourly_rate,daily_rate,marinas!inner(id,name,lake,address)",
        )
        .eq("id", boatId)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return data ? withBoatFleetPhoto(data as unknown as PublicBoatRow) : null;
    },
  });
}

export function publicLakesQuery() {
  return queryOptions({
    queryKey: ["public", "lakes"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("marinas")
        .select("lake")
        .eq("onboarding_completed", true);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of data ?? []) if (r.lake) set.add(r.lake);
      return Array.from(set).sort();
    },
  });
}
