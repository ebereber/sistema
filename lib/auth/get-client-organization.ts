import { createClient } from "@/lib/supabase/client"

export async function getClientOrganizationId(): Promise<string> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { data } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!data?.organization_id) throw new Error("Usuario sin organización")
  return data.organization_id
}
