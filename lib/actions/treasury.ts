"use server";

import { getServerUser } from "@/lib/auth/get-server-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

// ── Transfer between accounts ──────────────────────────────────────

export async function createTreasuryTransferAction(data: {
  source_type: "bank_account" | "safe_box" | "cash_register";
  source_id: string;
  destination_type: "bank_account" | "safe_box" | "cash_register";
  destination_id: string;
  amount: number;
  reference?: string;
  description?: string;
  date: string;
}) {
  const user = await getServerUser();
  if (!user) throw new Error("No autenticado");

  if (data.source_type === data.destination_type && data.source_id === data.destination_id) {
    throw new Error("La cuenta de origen y destino no pueden ser la misma");
  }

  if (data.amount <= 0) {
    throw new Error("El monto debe ser mayor a 0");
  }

  // Generate a shared reference ID to link both movements
  const transferRef = `TRF-${Date.now()}`;
  const refDescription = data.description || "Transferencia de fondos";

  // 1. Create withdrawal in source account
  await createMovementInAccount({
    accountType: data.source_type,
    accountId: data.source_id,
    direction: "out",
    amount: data.amount,
    reference: data.reference || transferRef,
    description: refDescription,
    sourceType: "transfer",
    date: data.date,
    userId: user.id,
  });

  // 2. Create deposit in destination account
  await createMovementInAccount({
    accountType: data.destination_type,
    accountId: data.destination_id,
    direction: "in",
    amount: data.amount,
    reference: data.reference || transferRef,
    description: refDescription,
    sourceType: "transfer",
    date: data.date,
    userId: user.id,
  });

  revalidateTag("treasury", "minutes");
  revalidateTag("bank-accounts", "minutes");
  revalidateTag("safe-boxes", "minutes");
}

// ── Manual movement (bank_account or safe_box only) ────────────────

export async function createManualMovementAction(data: {
  account_type: "bank_account" | "safe_box";
  account_id: string;
  type: "deposit" | "withdrawal";
  amount: number;
  reference?: string;
  description?: string;
  date: string;
}) {
  const user = await getServerUser();
  if (!user) throw new Error("No autenticado");

  if (data.amount <= 0) {
    throw new Error("El monto debe ser mayor a 0");
  }

  if (data.account_type === "bank_account") {
    const { error } = await supabaseAdmin
      .from("bank_account_movements")
      .insert({
        bank_account_id: data.account_id,
        type: data.type,
        amount: data.amount,
        reference: data.reference || null,
        description: data.description || null,
        source_type: "manual",
        performed_by: user.id,
        movement_date: data.date,
      });

    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin
      .from("safe_box_movements")
      .insert({
        safe_box_id: data.account_id,
        type: data.type,
        amount: data.amount,
        notes: data.description || null,
        source_type: "manual",
        performed_by: user.id,
      });

    if (error) throw error;
  }

  revalidateTag("treasury", "minutes");
  revalidateTag("bank-accounts", "minutes");
  revalidateTag("safe-boxes", "minutes");
}

// ── Update manual movement ─────────────────────────────────────────

export async function updateManualMovementAction(
  id: string,
  accountType: "bank_account" | "safe_box",
  data: {
    type: "deposit" | "withdrawal";
    amount: number;
    reference?: string;
    description?: string;
    date: string;
  },
) {
  if (data.amount <= 0) {
    throw new Error("El monto debe ser mayor a 0");
  }

  if (accountType === "bank_account") {
    // Verify it's manual
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("bank_account_movements")
      .select("source_type")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;
    if (existing.source_type !== "manual") {
      throw new Error("Solo se pueden editar movimientos manuales");
    }

    const { error } = await supabaseAdmin
      .from("bank_account_movements")
      .update({
        type: data.type,
        amount: data.amount,
        reference: data.reference || null,
        description: data.description || null,
        movement_date: data.date,
      })
      .eq("id", id);

    if (error) throw error;
  } else {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("safe_box_movements")
      .select("source_type")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;
    if (existing.source_type !== "manual") {
      throw new Error("Solo se pueden editar movimientos manuales");
    }

    const { error } = await supabaseAdmin
      .from("safe_box_movements")
      .update({
        type: data.type,
        amount: data.amount,
        notes: data.description || null,
      })
      .eq("id", id);

    if (error) throw error;
  }

  revalidateTag("treasury", "minutes");
  revalidateTag("bank-accounts", "minutes");
  revalidateTag("safe-boxes", "minutes");
}

// ── Delete manual movement ─────────────────────────────────────────

export async function deleteManualMovementAction(
  id: string,
  accountType: "bank_account" | "safe_box",
) {
  if (accountType === "bank_account") {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("bank_account_movements")
      .select("source_type")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;
    if (existing.source_type !== "manual") {
      throw new Error("Solo se pueden eliminar movimientos manuales");
    }

    const { error } = await supabaseAdmin
      .from("bank_account_movements")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } else {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("safe_box_movements")
      .select("source_type")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;
    if (existing.source_type !== "manual") {
      throw new Error("Solo se pueden eliminar movimientos manuales");
    }

    const { error } = await supabaseAdmin
      .from("safe_box_movements")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  revalidateTag("treasury", "minutes");
  revalidateTag("bank-accounts", "minutes");
  revalidateTag("safe-boxes", "minutes");
}

// ── Helpers ────────────────────────────────────────────────────────

async function createMovementInAccount(params: {
  accountType: "bank_account" | "safe_box" | "cash_register";
  accountId: string;
  direction: "in" | "out";
  amount: number;
  reference: string;
  description: string;
  sourceType: string;
  date: string;
  userId: string;
}) {
  const {
    accountType,
    accountId,
    direction,
    amount,
    reference,
    description,
    sourceType,
    date,
    userId,
  } = params;

  if (accountType === "bank_account") {
    const type = direction === "in" ? "transfer_in" : "transfer_out";
    const { error } = await supabaseAdmin
      .from("bank_account_movements")
      .insert({
        bank_account_id: accountId,
        type,
        amount,
        reference,
        description,
        source_type: sourceType,
        performed_by: userId,
        movement_date: date,
      });

    if (error) throw error;
  } else if (accountType === "safe_box") {
    const type = direction === "in" ? "deposit" : "withdrawal";
    const { error } = await supabaseAdmin
      .from("safe_box_movements")
      .insert({
        safe_box_id: accountId,
        type,
        amount,
        notes: `${description} (Ref: ${reference})`,
        source_type: sourceType,
        performed_by: userId,
      });

    if (error) throw error;
  } else if (accountType === "cash_register") {
    // Cash register needs an open shift
    const { data: openShift, error: shiftErr } = await supabaseAdmin
      .from("cash_register_shifts")
      .select("id")
      .eq("cash_register_id", accountId)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();

    if (shiftErr) throw shiftErr;

    if (!openShift) {
      // Get register name for error message
      const { data: register } = await supabaseAdmin
        .from("cash_registers")
        .select("name")
        .eq("id", accountId)
        .single();

      throw new Error(
        `La caja "${register?.name || accountId}" no tiene un turno abierto`,
      );
    }

    const type = direction === "in" ? "cash_in" : "cash_out";
    const { error } = await supabaseAdmin
      .from("cash_register_movements")
      .insert({
        shift_id: openShift.id,
        type,
        amount,
        notes: `${description} (Ref: ${reference})`,
        performed_by: userId,
      });

    if (error) throw error;
  }
}
