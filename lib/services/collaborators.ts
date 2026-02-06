import { getClientOrganizationId } from "@/lib/auth/get-client-organization";
import { createClient } from "@/lib/supabase/client";

export interface Collaborator {
  id: string;
  email: string;
  name: string | null;
  role_id: string | null;
  role: { id: string; name: string; is_system: boolean } | null;
  data_visibility_scope: string;
  max_discount_percentage: number;
  commission_percentage: number;
  active: boolean;
  created_at: string;
  location_ids: string[];
  cash_register_ids: string[];
}

export interface PendingInvitation {
  id: string;
  email: string;
  role_id: string;
  role: { id: string; name: string } | null;
  data_visibility_scope: string;
  max_discount_percentage: number;
  commission_percentage: number;
  location_ids: string[];
  cash_register_ids: string[];
  status: string;
  created_at: string;
}

export interface LocationWithRegisters {
  id: string;
  name: string;
  is_main: boolean;
  cash_registers: { id: string; name: string }[];
}

export interface CollaboratorFormData {
  email?: string;
  role_id: string;
  data_visibility_scope: string;
  max_discount_percentage: number;
  commission_percentage: number;
  location_ids: string[];
  cash_register_ids: string[];
}

/**
 * Listar colaboradores (usuarios activos) con su rol
 */
export async function getCollaborators(
  search?: string,
): Promise<Collaborator[]> {
  const supabase = createClient();

  let query = supabase
    .from("users")
    .select("*, role:roles!users_role_id_fkey(id, name, is_system)")
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    const s = `%${search.trim()}%`;
    query = query.or(`email.ilike.${s},name.ilike.${s}`);
  }

  const { data: users, error } = await query;
  if (error) throw error;

  // Cargar accesos de cada usuario
  const userIds = (users || []).map((u) => u.id);

  const { data: locations } = await supabase
    .from("user_locations")
    .select("user_id, location_id")
    .in("user_id", userIds);

  const { data: registers } = await supabase
    .from("user_cash_registers")
    .select("user_id, cash_register_id")
    .in("user_id", userIds);

  const locMap = new Map<string, string[]>();
  (locations || []).forEach((l) => {
    const arr = locMap.get(l.user_id) || [];
    arr.push(l.location_id);
    locMap.set(l.user_id, arr);
  });

  const regMap = new Map<string, string[]>();
  (registers || []).forEach((r) => {
    const arr = regMap.get(r.user_id) || [];
    arr.push(r.cash_register_id);
    regMap.set(r.user_id, arr);
  });

  return (users || []).map((u) => ({
    ...u,
    active: u.active ?? true,
    role: u.role as Collaborator["role"],
    location_ids: locMap.get(u.id) || [],
    cash_register_ids: regMap.get(u.id) || [],
  }));
}

/**
 * Obtener un colaborador por ID con todos sus datos
 */
export async function getCollaboratorById(id: string): Promise<Collaborator> {
  const supabase = createClient();

  const { data: user, error } = await supabase
    .from("users")
    .select("*, role:roles!users_role_id_fkey(id, name, is_system)")
    .eq("id", id)
    .single();

  if (error) throw error;

  const { data: locations } = await supabase
    .from("user_locations")
    .select("location_id")
    .eq("user_id", id);

  const { data: registers } = await supabase
    .from("user_cash_registers")
    .select("cash_register_id")
    .eq("user_id", id);

  return {
    ...user,
    active: user.active ?? true,
    role: user.role as Collaborator["role"],
    location_ids: (locations || []).map((l) => l.location_id),
    cash_register_ids: (registers || []).map((r) => r.cash_register_id),
  };
}

/**
 * Crear invitación para un nuevo colaborador
 */
export async function inviteCollaborator(
  data: CollaboratorFormData,
): Promise<PendingInvitation> {
  const supabase = createClient();

  // Verificar que no exista ya un usuario con ese email
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", data.email!)
    .maybeSingle();

  if (existing) {
    throw new Error("Ya existe un usuario con ese email");
  }

  // Verificar invitación pendiente
  const { data: existingInvite } = await supabase
    .from("user_invitations")
    .select("id")
    .eq("email", data.email!)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    throw new Error("Ya hay una invitación pendiente para ese email");
  }

  // Obtener usuario actual
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const organizationId = await getClientOrganizationId();

  const { data: invitation, error } = await supabase
    .from("user_invitations")
    .insert({
      email: data.email!.trim().toLowerCase(),
      role_id: data.role_id,
      data_visibility_scope: data.data_visibility_scope,
      max_discount_percentage: data.max_discount_percentage,
      commission_percentage: data.commission_percentage,
      location_ids: data.location_ids,
      cash_register_ids: data.cash_register_ids,
      invited_by: currentUser?.id,
      organization_id: organizationId,
    })
    .select("*, role:roles(id, name)")
    .single();

  if (error) throw error;

  return {
    ...invitation,
    role: invitation.role as PendingInvitation["role"],
    location_ids: invitation.location_ids as string[],
    cash_register_ids: invitation.cash_register_ids as string[],
  };
}

/**
 * Obtener invitaciones pendientes
 */
export async function getPendingInvitations(): Promise<PendingInvitation[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("user_invitations")
    .select("*, role:roles(id, name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((inv) => ({
    ...inv,
    role: inv.role as PendingInvitation["role"],
    location_ids: (inv.location_ids as string[]) || [],
    cash_register_ids: (inv.cash_register_ids as string[]) || [],
  }));
}

/**
 * Actualizar un colaborador existente
 */
export async function updateCollaborator(
  id: string,
  data: Omit<CollaboratorFormData, "email">,
): Promise<void> {
  const supabase = createClient();

  // Actualizar usuario
  const { error: userError } = await supabase
    .from("users")
    .update({
      role_id: data.role_id,
      data_visibility_scope: data.data_visibility_scope,
      max_discount_percentage: data.max_discount_percentage,
      commission_percentage: data.commission_percentage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (userError) throw userError;

  // Reemplazar ubicaciones
  await supabase.from("user_locations").delete().eq("user_id", id);
  if (data.location_ids.length > 0) {
    const { error: locError } = await supabase
      .from("user_locations")
      .insert(
        data.location_ids.map((lid) => ({ user_id: id, location_id: lid })),
      );

    if (locError) throw locError;
  }

  // Reemplazar cajas
  await supabase.from("user_cash_registers").delete().eq("user_id", id);
  if (data.cash_register_ids.length > 0) {
    const { error: regError } = await supabase
      .from("user_cash_registers")
      .insert(
        data.cash_register_ids.map((rid) => ({
          user_id: id,
          cash_register_id: rid,
        })),
      );

    if (regError) throw regError;
  }
}

/**
 * Desactivar un colaborador
 */
export async function deactivateCollaborator(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("users")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Reactivar un colaborador
 */
export async function reactivateCollaborator(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("users")
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Revocar invitación pendiente
 */
export async function revokeInvitation(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("user_invitations")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Obtener ubicaciones con sus cajas registradoras (para el form)
 */
export async function getLocationsWithRegisters(): Promise<
  LocationWithRegisters[]
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("locations")
    .select("id, name, is_main, cash_registers(id, name)")
    .eq("active", true)
    .order("name");

  if (error) throw error;

  return (data || []).map((loc) => ({
    ...loc,
    is_main: loc.is_main ?? false,
    cash_registers:
      (loc.cash_registers as { id: string; name: string }[]) || [],
  }));
}
