import "server-only"

import { cacheTag, cacheLife } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { Tables } from "@/lib/supabase/types"

export type Supplier = Tables<"suppliers">

export async function getCachedSuppliers(): Promise<Supplier[]> {
  "use cache"
  cacheTag("suppliers")
  cacheLife("minutes")

  const { data, error } = await supabaseAdmin
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true })

  if (error) throw error
  return data || []
}

export async function getCachedSupplierById(
  id: string
): Promise<Supplier | null> {
  "use cache"
  cacheTag("suppliers", `supplier-${id}`)
  cacheLife("minutes")

  const { data, error } = await supabaseAdmin
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .single()

  if (error) return null
  return data
}

export async function getCachedSupplierStats(
  id: string
): Promise<{ totalPurchases: number; totalAmount: number }> {
  "use cache"
  cacheTag(`supplier-stats-${id}`)
  cacheLife("minutes")

  const { count, error } = await supabaseAdmin
    .from("purchases")
    .select("*", { count: "exact", head: true })
    .eq("supplier_id", id)

  if (error) {
    return { totalPurchases: 0, totalAmount: 0 }
  }

  const { data: purchases } = await supabaseAdmin
    .from("purchases")
    .select("total")
    .eq("supplier_id", id)

  const totalAmount =
    purchases?.reduce((sum, p) => sum + (p.total || 0), 0) || 0

  return {
    totalPurchases: count || 0,
    totalAmount,
  }
}

export async function getCachedSupplierRecentPurchases(
  id: string,
  limit: number = 5
) {
  "use cache"
  cacheTag(`supplier-purchases-${id}`)
  cacheLife("minutes")

  const { data, error } = await supabaseAdmin
    .from("purchases")
    .select("id, purchase_number, created_at, total")
    .eq("supplier_id", id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    return []
  }

  return data || []
}
