"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

export async function deleteRoleAction(id: string): Promise<void> {
  // Check no active users have this role
  const { count } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role_id", id)
    .eq("active", true);

  if (count && count > 0) {
    throw new Error("No se puede eliminar un rol con miembros asignados");
  }

  // Check not system role
  const { data: role } = await supabaseAdmin
    .from("roles")
    .select("is_system")
    .eq("id", id)
    .single();

  if (role?.is_system) {
    throw new Error("No se puede eliminar un rol del sistema");
  }

  const { error } = await supabaseAdmin
    .from("roles")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("roles", "minutes");
  revalidateTag("collaborators", "minutes");
}

export async function duplicateRoleAction(id: string) {
  // Get original role
  const { data: original, error: fetchError } = await supabaseAdmin
    .from("roles")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const organizationId = await getOrganizationId()

  const { data: role, error } = await supabaseAdmin
    .from("roles")
    .insert({
      name: `${original.name} (copia)`,
      permissions: original.permissions,
      special_actions: original.special_actions,
      is_system: false,
      organization_id: organizationId,
    })
    .select()
    .single();

  if (error) throw error;

  revalidateTag("roles", "minutes");

  return role;
}

export async function createRoleAction(data: {
  name: string;
  permissions: string[];
  special_actions: string[];
}) {
  const organizationId = await getOrganizationId()

  const { data: role, error } = await supabaseAdmin
    .from("roles")
    .insert({
      name: data.name.trim(),
      permissions: data.permissions,
      special_actions: data.special_actions,
      organization_id: organizationId,
    })
    .select()
    .single();

  if (error) throw error;

  revalidateTag("roles", "minutes");

  return role;
}

export async function updateRoleAction(
  id: string,
  data: {
    name: string;
    permissions: string[];
    special_actions: string[];
  },
) {
  const { data: role, error } = await supabaseAdmin
    .from("roles")
    .update({
      name: data.name.trim(),
      permissions: data.permissions,
      special_actions: data.special_actions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  revalidateTag("roles", "minutes");
  revalidateTag("collaborators", "minutes");

  return role;
}
