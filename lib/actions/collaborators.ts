"use server"

import { getOrganizationId } from "@/lib/auth/get-organization"
import { revalidateTag } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function deactivateCollaboratorAction(
  id: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw error

  revalidateTag("collaborators", "minutes")
}

export async function reactivateCollaboratorAction(
  id: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw error

  revalidateTag("collaborators", "minutes")
}

export async function revokeInvitationAction(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("user_invitations")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw error

  revalidateTag("collaborators", "minutes")
}

export async function inviteCollaboratorAction(data: {
  email: string
  role_id: string
  data_visibility_scope: string
  max_discount_percentage: number
  commission_percentage: number
  location_ids: string[]
  cash_register_ids: string[]
}): Promise<void> {
  // Check if user or invitation already exists
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", data.email.trim().toLowerCase())
    .limit(1)

  if (existingUser && existingUser.length > 0) {
    throw new Error("Ya existe un usuario con ese email")
  }

  const { data: existingInv } = await supabaseAdmin
    .from("user_invitations")
    .select("id")
    .eq("email", data.email.trim().toLowerCase())
    .eq("status", "pending")
    .limit(1)

  if (existingInv && existingInv.length > 0) {
    throw new Error("Ya existe una invitación pendiente para ese email")
  }

  const organizationId = await getOrganizationId()

  const { error } = await supabaseAdmin.from("user_invitations").insert({
    email: data.email.trim().toLowerCase(),
    role_id: data.role_id,
    data_visibility_scope: data.data_visibility_scope,
    max_discount_percentage: data.max_discount_percentage,
    commission_percentage: data.commission_percentage,
    location_ids: data.location_ids,
    cash_register_ids: data.cash_register_ids,
    organization_id: organizationId,
  })

  if (error) throw error

  revalidateTag("collaborators", "minutes")
}

export async function updateCollaboratorAction(
  id: string,
  data: {
    role_id: string | null
    data_visibility_scope: string
    max_discount_percentage: number
    commission_percentage: number
    location_ids: string[]
    cash_register_ids: string[]
  }
): Promise<void> {
  const { error: userError } = await supabaseAdmin
    .from("users")
    .update({
      role_id: data.role_id,
      data_visibility_scope: data.data_visibility_scope,
      max_discount_percentage: data.max_discount_percentage,
      commission_percentage: data.commission_percentage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (userError) throw userError

  // Delete and re-insert locations
  await supabaseAdmin.from("user_locations").delete().eq("user_id", id)
  if (data.location_ids.length > 0) {
    const { error } = await supabaseAdmin.from("user_locations").insert(
      data.location_ids.map((locationId) => ({
        user_id: id,
        location_id: locationId,
      }))
    )
    if (error) throw error
  }

  // Delete and re-insert cash registers
  await supabaseAdmin.from("user_cash_registers").delete().eq("user_id", id)
  if (data.cash_register_ids.length > 0) {
    const { error } = await supabaseAdmin.from("user_cash_registers").insert(
      data.cash_register_ids.map((registerId) => ({
        user_id: id,
        cash_register_id: registerId,
      }))
    )
    if (error) throw error
  }

  revalidateTag("collaborators", "minutes")
}
