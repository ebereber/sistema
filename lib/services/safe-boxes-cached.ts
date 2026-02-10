import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { cacheLife, cacheTag } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";

export type SafeBox = Database["public"]["Tables"]["safe_boxes"]["Row"] & {
  location: { id: string; name: string } | null;
};

export async function getCachedActiveSafeBoxes(
  organizationId: string,
): Promise<Array<{ id: string; name: string }>> {
  "use cache";
  cacheTag("safe-boxes");
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("safe_boxes")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function getCachedSafeBoxes(
  organizationId: string,
): Promise<SafeBox[]> {
  "use cache";
  cacheTag("safe-boxes");
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("safe_boxes")
    .select("*, location:locations(id, name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []) as unknown as SafeBox[];
}
