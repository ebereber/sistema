import { getServerUser } from "./get-server-user"

export async function getOrganizationId(): Promise<string> {
  const user = await getServerUser()
  if (!user?.organization_id) {
    throw new Error("Usuario sin organización asignada")
  }
  return user.organization_id
}
