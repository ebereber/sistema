import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/types";

export type FiscalConfig = Tables<"fiscal_config">;
export type FiscalPointOfSale = Tables<"fiscal_points_of_sale">;

export async function getFiscalConfig(
  organizationId: string,
): Promise<FiscalConfig | null> {
  const { data, error } = await supabaseAdmin
    .from("fiscal_config")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getFiscalPointsOfSale(
  organizationId: string,
): Promise<FiscalPointOfSale[]> {
  const { data, error } = await supabaseAdmin
    .from("fiscal_points_of_sale")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("number", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
