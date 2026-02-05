import "server-only"

import { cacheTag, cacheLife } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { PaymentMethod } from "@/types/payment-method"

export async function getCachedPaymentMethods(
  search?: string
): Promise<PaymentMethod[]> {
  "use cache"
  cacheTag("payment-methods")
  cacheLife("minutes")

  let query = supabaseAdmin
    .from("payment_methods")
    .select("*")
    .order("is_system", { ascending: false })
    .order("name", { ascending: true })

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as PaymentMethod[]
}
