import "server-only"

import { cacheTag, cacheLife } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { RoleWithCount } from "./roles"

export async function getCachedRoles(
  search?: string
): Promise<RoleWithCount[]> {
  "use cache"
  cacheTag("roles")
  cacheLife("minutes")

  let query = supabaseAdmin
    .from("roles")
    .select("*")
    .eq("active", true)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true })

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`)
  }

  const { data: roles, error } = await query
  if (error) throw error

  // Count members per role
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("role_id")
    .eq("active", true)

  const countMap = new Map<string, number>()
  ;(users || []).forEach((u) => {
    if (u.role_id) {
      countMap.set(u.role_id, (countMap.get(u.role_id) || 0) + 1)
    }
  })

  return (roles || []).map((role) => ({
    ...role,
    permissions: (role.permissions as string[]) || [],
    special_actions: (role.special_actions as string[]) || [],
    member_count: countMap.get(role.id) || 0,
  }))
}
