import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { UserScope } from "./data-scope";

export async function getServerUserScope(userId: string): Promise<UserScope> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("data_visibility_scope, user_locations(location_id)")
    .eq("id", userId)
    .single();

  return {
    visibility:
      (data?.data_visibility_scope as UserScope["visibility"]) ?? "own",
    userId,
    locationIds:
      (data?.user_locations as { location_id: string }[])?.map(
        (ul) => ul.location_id,
      ) || [],
  };
}
