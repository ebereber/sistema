"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

export async function createBankAccountAction(data: {
  bank_name: string;
  account_name: string;
  currency: string;
  initial_balance: number;
  balance_date: string;
  uses_checkbook: boolean;
}) {
  const organizationId = await getOrganizationId();
  const user = await getServerUser();
  if (!user) throw new Error("No autenticado");

  const { data: created, error } = await supabaseAdmin
    .from("bank_accounts")
    .insert({
      bank_name: data.bank_name,
      account_name: data.account_name,
      currency: data.currency,
      initial_balance: data.initial_balance,
      balance_date: data.balance_date,
      uses_checkbook: data.uses_checkbook,
      organization_id: organizationId,
    })
    .select()
    .single();

  if (error) throw error;

  // If initial balance > 0, create initial movement
  if (data.initial_balance > 0) {
    await supabaseAdmin.from("bank_account_movements").insert({
      bank_account_id: created.id,
      type: "deposit",
      amount: data.initial_balance,
      description: "Saldo inicial",
      source_type: "manual",
      performed_by: user.id,
      movement_date: data.balance_date,
    });
  }

  revalidateTag("bank-accounts", "minutes");

  return created;
}

export async function updateBankAccountAction(
  id: string,
  data: {
    bank_name?: string;
    account_name?: string;
    currency?: string;
    uses_checkbook?: boolean;
  },
) {
  const { data: updated, error } = await supabaseAdmin
    .from("bank_accounts")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  revalidateTag("bank-accounts", "minutes");

  return updated;
}

export async function archiveBankAccountAction(id: string) {
  const { error } = await supabaseAdmin
    .from("bank_accounts")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("bank-accounts", "minutes");
}

export async function restoreBankAccountAction(id: string) {
  const { error } = await supabaseAdmin
    .from("bank_accounts")
    .update({ status: "active" })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("bank-accounts", "minutes");
}

export async function deleteBankAccountAction(id: string) {
  // Check if account has movements other than initial balance
  const { count, error: countError } = await supabaseAdmin
    .from("bank_account_movements")
    .select("*", { count: "exact", head: true })
    .eq("bank_account_id", id)
    .neq("description", "Saldo inicial");

  if (countError) throw countError;

  if (count && count > 0) {
    throw new Error(
      "No se puede eliminar una cuenta con movimientos. Archivala en su lugar.",
    );
  }

  const { error } = await supabaseAdmin
    .from("bank_accounts")
    .delete()
    .eq("id", id);

  if (error) throw error;

  revalidateTag("bank-accounts", "minutes");
}

export async function getBankAccountBalanceAction(
  bankAccountId: string,
): Promise<number> {
  const { data: account, error: accError } = await supabaseAdmin
    .from("bank_accounts")
    .select("initial_balance")
    .eq("id", bankAccountId)
    .single();

  if (accError) throw accError;

  const { data: movements, error: mvError } = await supabaseAdmin
    .from("bank_account_movements")
    .select("type, amount")
    .eq("bank_account_id", bankAccountId);

  if (mvError) throw mvError;

  let balance = account.initial_balance;
  for (const m of movements || []) {
    if (m.type === "deposit" || m.type === "transfer_in") {
      balance += m.amount;
    } else {
      balance -= m.amount;
    }
  }

  return balance;
}

export async function getBankAccountBalancesAction(
  accountIds: string[],
): Promise<Record<string, number>> {
  if (accountIds.length === 0) return {};

  // Get all accounts' initial balances
  const { data: accounts, error: accError } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, initial_balance")
    .in("id", accountIds);

  if (accError) throw accError;

  // Get all movements for these accounts
  const { data: movements, error: mvError } = await supabaseAdmin
    .from("bank_account_movements")
    .select("bank_account_id, type, amount")
    .in("bank_account_id", accountIds);

  if (mvError) throw mvError;

  const balances: Record<string, number> = {};

  for (const acc of accounts || []) {
    balances[acc.id] = acc.initial_balance;
  }

  for (const m of movements || []) {
    if (!balances[m.bank_account_id]) {
      balances[m.bank_account_id] = 0;
    }
    if (m.type === "deposit" || m.type === "transfer_in") {
      balances[m.bank_account_id] += m.amount;
    } else {
      balances[m.bank_account_id] -= m.amount;
    }
  }

  return balances;
}
