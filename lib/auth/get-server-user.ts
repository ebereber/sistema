import { createClient } from "@/lib/supabase/server"

export async function getServerUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("users")
    .select(
      `id, email, name, active, organization_id,
      role:roles!users_role_id_fkey(id, name, permissions)`
    )
    .eq("id", user.id)
    .single()

  if (!data || !data.active) return null
  return data
}
