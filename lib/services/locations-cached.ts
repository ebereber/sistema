import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { cacheLife, cacheTag } from "next/cache";
import type { CashRegister } from "./cash-registers";
import type { LocationWithRegisters } from "./collaborators";
import type { Location } from "./locations";

export async function getCachedLocations(): Promise<Location[]> {
  "use cache";
  cacheTag("locations");
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("locations")
    .select(
      `
      *,
      points_of_sale:point_of_sale(id, number, name, is_digital, enabled_for_arca),
      cash_registers(id, name, status)
    `,
    )
    .order("is_main", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as Location[];
}

export async function getCachedLocationsWithRegisters() {
  "use cache";
  cacheTag("locations");
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("locations")
    .select("id, name, is_main, cash_registers(id, name)")
    .eq("active", true)
    .order("is_main", { ascending: false })
    .order("name");

  if (error) throw error;

  return (data || []).map((loc) => ({
    ...loc,
    is_main: loc.is_main ?? false,
  })) as LocationWithRegisters[];
}

export async function getCachedCashRegisters() {
  "use cache";
  cacheTag("locations", "cash-registers");
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("cash_registers")
    .select(
      "*, location:locations(id, name), point_of_sale:point_of_sale(id, name, number)",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []) as unknown as CashRegister[];
}
