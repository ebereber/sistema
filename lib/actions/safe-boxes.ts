"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

export async function createSafeBoxAction(data: {
  name: string;
  location_id: string | null;
  currency: string;
  initial_balance: number;
  balance_date: string;
}) {
  const organizationId = await getOrganizationId();

  const { data: created, error } = await supabaseAdmin
    .from("safe_boxes")
    .insert({
      name: data.name,
      location_id: data.location_id,
      currency: data.currency,
      initial_balance: data.initial_balance,
      balance_date: data.balance_date,
      organization_id: organizationId,
    })
    .select("*, location:locations(id, name)")
    .single();

  if (error) throw error;

  revalidateTag("safe-boxes", "minutes");

  return created;
}

export async function updateSafeBoxAction(
  id: string,
  data: {
    name?: string;
    location_id?: string | null;
    currency?: string;
    initial_balance?: number;
    balance_date?: string;
  },
) {
  const { data: updated, error } = await supabaseAdmin
    .from("safe_boxes")
    .update(data)
    .eq("id", id)
    .select("*, location:locations(id, name)")
    .single();

  if (error) throw error;

  revalidateTag("safe-boxes", "minutes");

  return updated;
}

export async function archiveSafeBoxAction(id: string) {
  const { error } = await supabaseAdmin
    .from("safe_boxes")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("safe-boxes", "minutes");
}

export async function restoreSafeBoxAction(id: string) {
  const { error } = await supabaseAdmin
    .from("safe_boxes")
    .update({ status: "active" })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("safe-boxes", "minutes");
}

export async function deleteSafeBoxAction(id: string) {
  const { error } = await supabaseAdmin
    .from("safe_boxes")
    .delete()
    .eq("id", id);

  if (error) throw error;

  revalidateTag("safe-boxes", "minutes");
}

export async function getSafeBoxBalanceAction(safeBoxId: string) {
  const { data: safeBox, error: sbError } = await supabaseAdmin
    .from("safe_boxes")
    .select("initial_balance")
    .eq("id", safeBoxId)
    .single();

  if (sbError) throw sbError;

  const { data: movements, error: mvError } = await supabaseAdmin
    .from("safe_box_movements")
    .select("type, amount")
    .eq("safe_box_id", safeBoxId);

  if (mvError) throw mvError;

  let balance = safeBox.initial_balance;
  for (const m of movements || []) {
    if (m.type === "deposit") {
      balance += m.amount;
    } else {
      balance -= m.amount;
    }
  }

  return balance;
}

export async function depositToSafeBoxAction(data: {
  safe_box_id: string;
  amount: number;
  source_type?: string;
  source_id?: string;
  notes?: string;
}) {
  const user = await getServerUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabaseAdmin
    .from("safe_box_movements")
    .insert({
      safe_box_id: data.safe_box_id,
      type: "deposit",
      amount: data.amount,
      source_type: data.source_type || null,
      source_id: data.source_id || null,
      notes: data.notes || null,
      performed_by: user.id,
    });

  if (error) throw error;

  revalidateTag("safe-boxes", "minutes");
}

export async function depositFromShiftToSafeBoxAction(data: {
  shiftId: string;
  safeBoxId: string;
  amount: number;
  notes?: string;
}) {
  const user = await getServerUser();
  if (!user) throw new Error("No autenticado");

  // Get safe box name for the movement note
  const { data: safeBox, error: sbError } = await supabaseAdmin
    .from("safe_boxes")
    .select("name")
    .eq("id", data.safeBoxId)
    .single();

  if (sbError) throw sbError;

  const movementNotes = data.notes
    ? `Deposito en caja fuerte: ${safeBox.name} - ${data.notes}`
    : `Deposito en caja fuerte: ${safeBox.name}`;

  // 1. Create cash_out in cash_register_movements
  const { error: cashOutError } = await supabaseAdmin
    .from("cash_register_movements")
    .insert({
      shift_id: data.shiftId,
      type: "cash_out",
      amount: data.amount,
      notes: movementNotes,
      performed_by: user.id,
    });

  if (cashOutError) throw cashOutError;

  // 2. Create deposit in safe_box_movements
  const { error: depositError } = await supabaseAdmin
    .from("safe_box_movements")
    .insert({
      safe_box_id: data.safeBoxId,
      type: "deposit",
      amount: data.amount,
      source_type: "shift_deposit",
      source_id: data.shiftId,
      notes: data.notes || null,
      performed_by: user.id,
    });

  if (depositError) throw depositError;

  revalidateTag("safe-boxes", "minutes");
}

export async function withdrawFromSafeBoxAction(data: {
  safe_box_id: string;
  amount: number;
  source_type?: string;
  source_id?: string;
  notes?: string;
}) {
  const user = await getServerUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabaseAdmin
    .from("safe_box_movements")
    .insert({
      safe_box_id: data.safe_box_id,
      type: "withdrawal",
      amount: data.amount,
      source_type: data.source_type || null,
      source_id: data.source_id || null,
      notes: data.notes || null,
      performed_by: user.id,
    });

  if (error) throw error;

  revalidateTag("safe-boxes", "minutes");
}
