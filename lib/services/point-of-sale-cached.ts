import "server-only"

import { cacheTag, cacheLife } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { PointOfSale } from "./point-of-sale"

export async function getCachedPointsOfSale(): Promise<PointOfSale[]> {
  "use cache"
  cacheTag("points-of-sale")
  cacheLife("minutes")

  const { data, error } = await supabaseAdmin
    .from("point_of_sale")
    .select("*, location:locations(id, name)")
    .eq("active", true)
    .order("number", { ascending: true })

  if (error) throw error
  return (data || []) as unknown as PointOfSale[]
}
