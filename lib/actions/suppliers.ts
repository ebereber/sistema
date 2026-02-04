"use server"

import { revalidateTag } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function archiveSupplierAction(id: string) {
  const { error } = await supabaseAdmin
    .from("suppliers")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw error
  revalidateTag("suppliers", "minutes")
  revalidateTag(`supplier-${id}`, "minutes")
}

export async function unarchiveSupplierAction(id: string) {
  const { error } = await supabaseAdmin
    .from("suppliers")
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw error
  revalidateTag("suppliers", "minutes")
  revalidateTag(`supplier-${id}`, "minutes")
}

export async function deleteSupplierAction(id: string) {
  const { error } = await supabaseAdmin
    .from("suppliers")
    .delete()
    .eq("id", id)

  if (error) throw error
  revalidateTag("suppliers", "minutes")
}
