import { createClient } from "../supabase/client";
import { PriceRoundingType } from "../utils/currency";

// lib/services/settings.ts
export async function getPriceRoundingSetting(): Promise<PriceRoundingType> {
  const supabase = createClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "price_rounding")
    .single();

  const value = data?.value as Record<string, unknown> | null;
  return ((value?.type as string) || "none") as PriceRoundingType;
}
