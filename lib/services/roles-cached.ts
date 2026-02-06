import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { cacheLife, cacheTag } from "next/cache";
import type { RoleWithCount } from "./roles";

export async function getCachedRoles(
  organizationId: string,
  search?: string,
): Promise<RoleWithCount[]> {
  "use cache";
  cacheTag("roles");
  cacheLife("minutes");

  let query = supabaseAdmin
    .from("roles")
    .select("*")
    .eq("active", true)
    .eq("organization_id", organizationId) // Solo roles de esta org
    .eq("is_system", false) // Ocultar roles de sistema (Dueño)
    .order("name", { ascending: true });

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data: roles, error } = await query;
  if (error) throw error;

  // Count members per role (solo de esta org)
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("role_id")
    .eq("active", true)
    .eq("organization_id", organizationId);

  const countMap = new Map<string, number>();
  (users || []).forEach((u) => {
    if (u.role_id) {
      countMap.set(u.role_id, (countMap.get(u.role_id) || 0) + 1);
    }
  });

  return (roles || []).map((role) => ({
    ...role,
    permissions: (role.permissions as string[]) || [],
    special_actions: (role.special_actions as string[]) || [],
    member_count: countMap.get(role.id) || 0,
  }));
}
