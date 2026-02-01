// lib/auth/permissions.ts

/**
 * Mapeo de rutas a permisos requeridos
 * Si una ruta no está acá, solo requiere estar autenticado
 */
const ROUTE_PERMISSIONS: Record<string, string> = {
  "/ventas": "sales:read",
  "/ventas/nueva": "sales:write",
  "/clientes": "customers:read",
  "/cobranzas": "sales:read",
  "/presupuestos": "sales:read",
  "/turnos": "sales:read",
  "/productos": "products:read",
  "/transferencias": "products:read",
  "/compras": "purchases:read",
  "/ordenes": "orders:read",
  "/proveedores": "suppliers:read",
  "/pagos": "purchases:read",
  "/configuracion": "settings:write",
  "/configuracion/colaboradores": "settings:write",
  "/configuracion/roles": "settings:write",
  "/configuracion/ubicaciones": "settings:write",
  "/configuracion/categorias": "settings:write",
};

export function getRequiredPermission(pathname: string): string | null {
  // Buscar match exacto primero, luego por prefijo
  if (ROUTE_PERMISSIONS[pathname]) return ROUTE_PERMISSIONS[pathname];

  // Buscar por prefijo (ej: /productos/123 → products:read)
  const match = Object.entries(ROUTE_PERMISSIONS)
    .sort(([a], [b]) => b.length - a.length) // más largo primero
    .find(([route]) => pathname.startsWith(route));

  return match ? match[1] : null;
}

export function hasPermission(
  userPermissions: string[],
  permission: string,
): boolean {
  return userPermissions.includes(permission);
}

export function hasAnyPermission(
  userPermissions: string[],
  permissions: string[],
): boolean {
  return permissions.some((p) => userPermissions.includes(p));
}
