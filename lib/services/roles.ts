import { createClient } from "@/lib/supabase/client";

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  special_actions: string[];
  is_system: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleWithCount extends Role {
  member_count: number;
}

// Módulos disponibles para permisos
export const PERMISSION_MODULES = [
  { key: "sales", label: "Ventas" },
  { key: "products", label: "Productos" },
  { key: "inventory", label: "Inventario" },
  { key: "customers", label: "Clientes" },
  { key: "purchases", label: "Compras" },
  { key: "suppliers", label: "Proveedores" },
  { key: "orders", label: "Órdenes de compra" },
  { key: "treasury", label: "Tesorería" },
  { key: "reports", label: "Reportes" },
] as const;

export const STANDALONE_PERMISSIONS = [
  { key: "settings:write", label: "Configuración del sistema" },
  { key: "import:write", label: "Importar datos" },
  { key: "shifts:read", label: "Ver turnos" },
  { key: "shifts:write", label: "Gestionar turnos" },
] as const;

export const SPECIAL_ACTIONS_LIST = [
  {
    key: "view_expected_cash",
    label: "Ver efectivo esperado al cierre de caja",
  },
] as const;

export type ModuleKey = (typeof PERMISSION_MODULES)[number]["key"];

/**
 * Listar roles activos con conteo de miembros
 */
export async function getRoles(search?: string): Promise<RoleWithCount[]> {
  const supabase = createClient();

  let query = supabase
    .from("roles")
    .select("*")
    .eq("active", true)
    .order("is_system", { ascending: false })
    .order("name");

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data: roles, error } = await query;
  if (error) throw error;

  // Contar miembros por rol
  const { data: users } = await supabase
    .from("users")
    .select("role_id")
    .eq("active", true);

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

/**
 * Obtener un rol por ID
 */
export async function getRoleById(id: string): Promise<Role> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return {
    ...data,
    permissions: (data.permissions as string[]) || [],
    special_actions: (data.special_actions as string[]) || [],
  };
}

/**
 * Crear un nuevo rol
 */
export async function createRole(data: {
  name: string;
  permissions: string[];
  special_actions: string[];
}): Promise<Role> {
  const supabase = createClient();

  const { data: role, error } = await supabase
    .from("roles")
    .insert({
      name: data.name.trim(),
      permissions: data.permissions,
      special_actions: data.special_actions,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    ...role,
    permissions: (role.permissions as string[]) || [],
    special_actions: (role.special_actions as string[]) || [],
  };
}

/**
 * Actualizar un rol existente
 */
export async function updateRole(
  id: string,
  data: {
    name: string;
    permissions: string[];
    special_actions: string[];
  },
): Promise<Role> {
  const supabase = createClient();

  const { data: role, error } = await supabase
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
  return {
    ...role,
    permissions: (role.permissions as string[]) || [],
    special_actions: (role.special_actions as string[]) || [],
  };
}

/**
 * Eliminar un rol (soft delete). Solo si no tiene miembros.
 */
export async function deleteRole(id: string): Promise<void> {
  const supabase = createClient();

  // Verificar que no tenga miembros
  const { count } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role_id", id)
    .eq("active", true);

  if (count && count > 0) {
    throw new Error("No se puede eliminar un rol con miembros asignados");
  }

  // Verificar que no sea de sistema
  const { data: role } = await supabase
    .from("roles")
    .select("is_system")
    .eq("id", id)
    .single();

  if (role?.is_system) {
    throw new Error("No se puede eliminar un rol del sistema");
  }

  const { error } = await supabase
    .from("roles")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Duplicar un rol
 */
export async function duplicateRole(id: string): Promise<Role> {
  const supabase = createClient();

  const original = await getRoleById(id);

  const { data, error } = await supabase
    .from("roles")
    .insert({
      name: `${original.name} (copia)`,
      permissions: original.permissions,
      special_actions: original.special_actions,
      is_system: false,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    permissions: (data.permissions as string[]) || [],
    special_actions: (data.special_actions as string[]) || [],
  };
}
