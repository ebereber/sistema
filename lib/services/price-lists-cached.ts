import "server-only"

import { cacheTag, cacheLife } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { PriceList } from "./price-lists"

export async function getCachedPriceLists(): Promise<PriceList[]> {
  "use cache"
  cacheTag("price-lists")
  cacheLife("minutes")

  const { data, error } = await supabaseAdmin
    .from("price_lists")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true })

  if (error) throw error
  return data || []
}
