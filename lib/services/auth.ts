// lib/services/auth.ts

import { createClient } from "@/lib/supabase/client";

export async function getCurrentUser() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("id, email, name, role")
    .eq("id", user.id)
    .single();

  return userData;
}
