"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import type {
  CloseShiftData,
  Shift,
  ShiftSummary,
} from "@/lib/services/shifts";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

export async function getActiveShiftAction(): Promise<Shift | null> {
  const user = await getServerUser();
  if (!user) return null;

  const organizationId = await getOrganizationId();

  const { data, error } = await supabaseAdmin
    .from("cash_register_shifts")
    .select(
      `
      *,
      cash_register:cash_registers(
        id,
        name,
        location_id
      )
    `,
    )
    .eq("status", "open")
    .eq("opened_by", user.id)
    .eq("cash_register.organization_id", organizationId)
    .not("cash_register", "is", null)
    .maybeSingle();

  if (error) throw error;

  return data as unknown as Shift | null;
}

export async function getShiftSummaryAction(
  shiftId: string,
): Promise<ShiftSummary> {
  // Get shift opening amount
  const { data: shift, error: shiftError } = await supabaseAdmin
    .from("cash_register_shifts")
    .select("opening_amount")
    .eq("id", shiftId)
    .single();

  if (shiftError) throw shiftError;

  // Get sales for this shift
  const { data: salesData, error: salesError } = await supabaseAdmin
    .from("sales")
    .select("id, total, voucher_type")
    .eq("shift_id", shiftId)
    .eq("status", "COMPLETED");

  if (salesError) throw salesError;

  // Get payment methods for these sales via allocations
  const saleIds = (salesData || []).map((s) => s.id);
  const methodsBySale: Record<
    string,
    { method_name: string; amount: number }[]
  > = {};

  if (saleIds.length > 0) {
    const { data: allocations } = await supabaseAdmin
      .from("customer_payment_allocations")
      .select(
        `
        sale_id,
        customer_payment:customer_payments(
          customer_payment_methods(method_name, amount)
        )
      `,
      )
      .in("sale_id", saleIds);

    for (const alloc of allocations || []) {
      const methods =
        (alloc.customer_payment as any)?.customer_payment_methods || [];
      if (!methodsBySale[alloc.sale_id]) methodsBySale[alloc.sale_id] = [];
      methodsBySale[alloc.sale_id].push(...methods);
    }
  }

  // Get manual movements
  const { data: movements, error: movementsError } = await supabaseAdmin
    .from("cash_register_movements")
    .select("type, amount")
    .eq("shift_id", shiftId);

  if (movementsError) throw movementsError;

  // Calculate totals
  let grossCollections = 0;
  let refunds = 0;
  let cashFromSales = 0;

  for (const sale of salesData || []) {
    if (sale.voucher_type?.startsWith("NOTA_CREDITO")) {
      refunds += Number(sale.total);
    } else {
      grossCollections += Number(sale.total);
    }

    // Sum cash payments
    for (const method of methodsBySale[sale.id] || []) {
      if (method.method_name?.toLowerCase() === "efectivo") {
        if (sale.voucher_type?.startsWith("NOTA_CREDITO")) {
          cashFromSales -= Number(method.amount);
        } else {
          cashFromSales += Number(method.amount);
        }
      }
    }
  }

  // Calculate manual movements
  let cashIn = 0;
  let cashOut = 0;

  for (const movement of movements || []) {
    if (movement.type === "cash_in") {
      cashIn += Number(movement.amount);
    } else {
      cashOut += Number(movement.amount);
    }
  }

  const openingAmount = Number(shift.opening_amount) || 0;
  const currentCashAmount = openingAmount + cashFromSales + cashIn - cashOut;

  return {
    grossCollections,
    refunds,
    netCollections: grossCollections - refunds,
    cashIn,
    cashOut,
    currentCashAmount,
  };
}

export async function openShiftAction(
  cashRegisterId: string,
  openingAmount: number,
): Promise<Shift> {
  const user = await getServerUser();
  if (!user) throw new Error("Usuario no autenticado");

  // Check if there's already an open shift for this cash register
  const { data: existing } = await supabaseAdmin
    .from("cash_register_shifts")
    .select("id")
    .eq("cash_register_id", cashRegisterId)
    .eq("status", "open")
    .maybeSingle();

  if (existing) {
    throw new Error("Ya hay un turno abierto en esta caja");
  }

  const { data: shift, error } = await supabaseAdmin
    .from("cash_register_shifts")
    .insert({
      cash_register_id: cashRegisterId,
      opened_by: user.id,
      opening_amount: openingAmount,
      status: "open",
    })
    .select(
      `
      *,
      cash_register:cash_registers(
        id,
        name,
        location_id
      )
    `,
    )
    .single();

  if (error) throw error;

  revalidateTag("shifts", "minutes");

  return shift as unknown as Shift;
}

export async function closeShiftAction(
  shiftId: string,
  data: CloseShiftData,
): Promise<Shift> {
  const user = await getServerUser();
  if (!user) throw new Error("Usuario no autenticado");

  // Get shift summary to calculate expected amount
  const summary = await getShiftSummaryAction(shiftId);

  const expectedAmount = summary.currentCashAmount;
  const discrepancy = data.countedAmount - expectedAmount;

  const { data: shift, error } = await supabaseAdmin
    .from("cash_register_shifts")
    .update({
      closed_by: user.id,
      closed_at: new Date().toISOString(),
      expected_amount: expectedAmount,
      counted_amount: data.countedAmount,
      left_in_cash: data.leftInCash,
      discrepancy: discrepancy,
      discrepancy_reason: data.discrepancyReason || null,
      discrepancy_notes: data.discrepancyNotes || null,
      status: "closed",
    })
    .eq("id", shiftId)
    .select(
      `
      *,
      cash_register:cash_registers(
        id,
        name,
        location_id
      )
    `,
    )
    .single();

  if (error) throw error;

  revalidateTag("shifts", "minutes");

  return shift as unknown as Shift;
}

export async function addCashToShiftAction(
  shiftId: string,
  amount: number,
  notes?: string,
): Promise<void> {
  const user = await getServerUser();
  if (!user) throw new Error("Usuario no autenticado");

  const { error } = await supabaseAdmin.from("cash_register_movements").insert({
    shift_id: shiftId,
    type: "cash_in",
    amount,
    notes: notes || null,
    performed_by: user.id,
  });

  if (error) throw error;

  revalidateTag("shifts", "minutes");
}

export async function removeCashFromShiftAction(
  shiftId: string,
  amount: number,
  notes?: string,
): Promise<void> {
  const user = await getServerUser();
  if (!user) throw new Error("Usuario no autenticado");

  const { error } = await supabaseAdmin.from("cash_register_movements").insert({
    shift_id: shiftId,
    type: "cash_out",
    amount,
    notes: notes || null,
    performed_by: user.id,
  });

  if (error) throw error;

  revalidateTag("shifts", "minutes");
}

export async function getLastClosedShiftAction(
  cashRegisterId: string,
): Promise<{ left_in_cash: number } | null> {
  const organizationId = await getOrganizationId();
  console.log("1. organizationId:", organizationId);
  console.log("2. cashRegisterId:", cashRegisterId);

  // Verificar que la caja pertenece a la organización
  const { data: cashRegister, error: crError } = await supabaseAdmin
    .from("cash_registers")
    .select("id")
    .eq("id", cashRegisterId)
    .eq("organization_id", organizationId)
    .single();

  console.log("3. cashRegister:", cashRegister, "error:", crError);

  if (!cashRegister) return null;

  const { data, error } = await supabaseAdmin
    .from("cash_register_shifts")
    .select("left_in_cash")
    .eq("cash_register_id", cashRegisterId)
    .eq("status", "closed")
    .order("closed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log("4. shift data:", data, "error:", error);

  if (error || !data) return null;

  return { left_in_cash: Number(data.left_in_cash) };
}
