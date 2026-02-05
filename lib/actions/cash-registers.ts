"use server"

import { revalidateTag } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function createCashRegisterAction(data: {
  name: string
  location_id: string
  point_of_sale_id?: string | null
}) {
  const { data: created, error } = await supabaseAdmin
    .from("cash_registers")
    .insert({
      name: data.name,
      location_id: data.location_id,
      point_of_sale_id: data.point_of_sale_id || null,
    })
    .select(
      "*, location:locations(id, name), point_of_sale:point_of_sale(id, name, number)"
    )
    .single()

  if (error) throw error

  revalidateTag("locations", "minutes")
  revalidateTag("cash-registers", "minutes")

  return created
}

export async function updateCashRegisterAction(
  id: string,
  data: {
    name?: string
    location_id?: string
    point_of_sale_id?: string | null
  }
) {
  const { data: updated, error } = await supabaseAdmin
    .from("cash_registers")
    .update(data)
    .eq("id", id)
    .select(
      "*, location:locations(id, name), point_of_sale:point_of_sale(id, name, number)"
    )
    .single()

  if (error) throw error

  revalidateTag("locations", "minutes")
  revalidateTag("cash-registers", "minutes")

  return updated
}

export async function toggleCashRegisterStatusAction(id: string) {
  const { data: current, error: fetchError } = await supabaseAdmin
    .from("cash_registers")
    .select("status")
    .eq("id", id)
    .single()

  if (fetchError) throw fetchError

  const newStatus = current.status === "active" ? "archived" : "active"

  const { data: updated, error } = await supabaseAdmin
    .from("cash_registers")
    .update({ status: newStatus })
    .eq("id", id)
    .select(
      "*, location:locations(id, name), point_of_sale:point_of_sale(id, name, number)"
    )
    .single()

  if (error) throw error

  revalidateTag("locations", "minutes")
  revalidateTag("cash-registers", "minutes")

  return updated
}

export async function deleteCashRegisterAction(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("cash_registers")
    .delete()
    .eq("id", id)

  if (error) throw error

  revalidateTag("locations", "minutes")
  revalidateTag("cash-registers", "minutes")
}
