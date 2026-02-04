"use server";

import { getServerUser } from "@/lib/auth/get-server-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

// ---------------------------------------------------------------------------
// Delete quote (soft)
// ---------------------------------------------------------------------------

export async function deleteQuoteAction(id: string): Promise<void> {
  const user = await getServerUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabaseAdmin
    .from("quotes")
    .update({ status: "deleted" })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("quotes", "minutes");
}
