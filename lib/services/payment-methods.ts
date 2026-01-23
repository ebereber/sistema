import { createClient } from "@/lib/supabase/client"
import type {
  PaymentMethod,
  PaymentMethodInsert,
  PaymentMethodUpdate,
} from "@/types/payment-method"

/**
 * Get all payment methods
 */
export async function getPaymentMethods(filters?: {
  search?: string
  isActive?: boolean
}): Promise<PaymentMethod[]> {
  const supabase = createClient()

  let query = supabase
    .from("payment_methods")
    .select("*")
    .order("is_system", { ascending: false })
    .order("name", { ascending: true })

  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`)
  }

  if (filters?.isActive !== undefined) {
    query = query.eq("is_active", filters.isActive)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Get payment method by ID
 */
export async function getPaymentMethodById(id: string): Promise<PaymentMethod> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

/**
 * Create payment method
 */
export async function createPaymentMethod(
  paymentMethod: PaymentMethodInsert,
): Promise<PaymentMethod> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("payment_methods")
    .insert(paymentMethod)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update payment method
 */
export async function updatePaymentMethod(
  id: string,
  updates: PaymentMethodUpdate,
): Promise<PaymentMethod> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("payment_methods")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete payment method
 */
export async function deletePaymentMethod(id: string): Promise<void> {
  const supabase = createClient()

  const { data: method } = await supabase
    .from("payment_methods")
    .select("is_system")
    .eq("id", id)
    .single()

  if (method?.is_system) {
    throw new Error("No se puede eliminar un método de pago del sistema")
  }

  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", id)

  if (error) throw error
}

/**
 * Format fee for display
 */
export function formatFee(feePercentage: number, feeFixed: number): string {
  const hasPercentage = feePercentage > 0
  const hasFixed = feeFixed > 0

  if (!hasPercentage && !hasFixed) return "Sin costo"
  if (hasPercentage && !hasFixed) return `${feePercentage}%`
  if (!hasPercentage && hasFixed) return `$${feeFixed.toFixed(2)}`
  return `${feePercentage}% + $${feeFixed.toFixed(2)}`
}
