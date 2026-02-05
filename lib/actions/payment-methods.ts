"use server"

import { revalidateTag } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function deletePaymentMethodAction(id: string): Promise<void> {
  // Check if system method
  const { data: pm } = await supabaseAdmin
    .from("payment_methods")
    .select("is_system")
    .eq("id", id)
    .single()

  if (pm?.is_system) {
    throw new Error("No se puede eliminar un medio de pago del sistema")
  }

  const { error } = await supabaseAdmin
    .from("payment_methods")
    .delete()
    .eq("id", id)

  if (error) throw error

  revalidateTag("payment-methods", "minutes")
}

export async function createPaymentMethodAction(data: {
  name: string
  type: string
  icon?: string
  availability?: string
  fee_percentage?: number
  fee_fixed?: number
  requires_reference?: boolean
  is_active?: boolean
  is_system?: boolean
}) {
  const { data: pm, error } = await supabaseAdmin
    .from("payment_methods")
    .insert({
      ...data,
      icon: data.icon || "banknote",
    })
    .select()
    .single()

  if (error) throw error

  revalidateTag("payment-methods", "minutes")

  return pm
}

export async function updatePaymentMethodAction(
  id: string,
  data: {
    name?: string
    availability?: string
    fee_percentage?: number
    fee_fixed?: number
    requires_reference?: boolean
    is_active?: boolean
  }
) {
  const { data: pm, error } = await supabaseAdmin
    .from("payment_methods")
    .update(data)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error

  revalidateTag("payment-methods", "minutes")

  return pm
}
