import { redirect } from "next/navigation"

import { getServerUser } from "@/lib/auth/get-server-user"
import { hasPermission } from "@/lib/auth/permissions"

export async function requirePermission(permission: string) {
  const user = await getServerUser()
  if (!user) redirect("/login")

  const role = Array.isArray(user.role) ? user.role[0] : user.role
  const permissions = (role?.permissions as string[]) ?? []

  if (!hasPermission(permissions, permission)) {
    redirect("/sin-acceso")
  }
}
