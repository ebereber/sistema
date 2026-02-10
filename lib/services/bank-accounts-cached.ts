import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { cacheLife, cacheTag } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";

export type BankAccount =
  Database["public"]["Tables"]["bank_accounts"]["Row"];

export async function getCachedBankAccounts(
  organizationId: string,
): Promise<BankAccount[]> {
  "use cache";
  cacheTag("bank-accounts");
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("bank_accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getCachedActiveBankAccounts(
  organizationId: string,
): Promise<Array<{ id: string; bank_name: string; account_name: string }>> {
  "use cache";
  cacheTag("bank-accounts");
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, bank_name, account_name")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("bank_name", { ascending: true });

  if (error) throw error;

  return data || [];
}
