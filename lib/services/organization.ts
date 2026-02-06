import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/types";

export type Organization = Tables<"organizations">;

export async function getOrganization(
  organizationId: string,
): Promise<Organization> {
  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .single();

  if (error) throw error;
  return data;
}
