import "server-only"

import { cacheTag, cacheLife } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { Collaborator, PendingInvitation } from "./collaborators"

export async function getCachedCollaborators(
  search?: string
): Promise<Collaborator[]> {
  "use cache"
  cacheTag("collaborators")
  cacheLife("minutes")

  let query = supabaseAdmin
    .from("users")
    .select("*, role:roles(id, name, is_system)")
    .order("created_at", { ascending: true })

  if (search?.trim()) {
    query = query.or(
      `name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`
    )
  }

  const { data, error } = await query
  if (error) throw error

  // Load location and cash register assignments for each user
  const userIds = (data || []).map((u) => u.id)

  const { data: userLocations } = await supabaseAdmin
    .from("user_locations")
    .select("user_id, location_id")
    .in("user_id", userIds)

  const { data: userRegisters } = await supabaseAdmin
    .from("user_cash_registers")
    .select("user_id, cash_register_id")
    .in("user_id", userIds)

  return (data || []).map((user) => ({
    ...user,
    role: Array.isArray(user.role) ? user.role[0] || null : user.role,
    location_ids: (userLocations || [])
      .filter((ul) => ul.user_id === user.id)
      .map((ul) => ul.location_id),
    cash_register_ids: (userRegisters || [])
      .filter((ur) => ur.user_id === user.id)
      .map((ur) => ur.cash_register_id),
  })) as Collaborator[]
}

export async function getCachedPendingInvitations(): Promise<
  PendingInvitation[]
> {
  "use cache"
  cacheTag("collaborators")
  cacheLife("minutes")

  const { data, error } = await supabaseAdmin
    .from("user_invitations")
    .select("*, role:roles(id, name, is_system)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data || []).map((inv) => ({
    ...inv,
    role: Array.isArray(inv.role) ? inv.role[0] || null : inv.role,
  })) as PendingInvitation[]
}
