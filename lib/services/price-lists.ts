import { createClient } from "@/lib/supabase/client"
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types"

export type PriceList = Tables<"price_lists">
export type PriceListInsert = TablesInsert<"price_lists">
export type PriceListUpdate = TablesUpdate<"price_lists">

/**
 * Get all active price lists
 */
export async function getPriceLists(): Promise<PriceList[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("price_lists")
    .select("*")
    .eq("active", true)
    .order("name")

  if (error) throw error
  return data || []
}

/**
 * Get price list by ID
 */
export async function getPriceListById(id: string): Promise<PriceList> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("price_lists")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a new price list
 */
export async function createPriceList(priceList: PriceListInsert): Promise<PriceList> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("price_lists")
    .insert(priceList)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a price list
 */
export async function updatePriceList(id: string, priceList: PriceListUpdate): Promise<PriceList> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("price_lists")
    .update({ ...priceList, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a price list (only if no customers are using it)
 */
export async function deletePriceList(id: string): Promise<void> {
  const supabase = createClient()

  // Check if any customers are using this price list
  const { data: customers, error: checkError } = await supabase
    .from("customers")
    .select("id")
    .eq("price_list_id", id)
    .limit(1)

  if (checkError) throw checkError

  if (customers && customers.length > 0) {
    throw new Error("No se puede eliminar una lista de precios con clientes asignados")
  }

  // If no customers are using it, delete the price list
  const { error } = await supabase
    .from("price_lists")
    .delete()
    .eq("id", id)

  if (error) throw error
}

/**
 * Calculate price with price list adjustment applied
 */
export function calculatePriceWithList(basePrice: number, priceList: PriceList): number {
  if (!priceList.is_automatic) return basePrice

  const percentage = (priceList.adjustment_percentage ?? 0) / 100

  if (priceList.adjustment_type === "DESCUENTO") {
    return basePrice * (1 - percentage)
  } else {
    return basePrice * (1 + percentage)
  }
}
