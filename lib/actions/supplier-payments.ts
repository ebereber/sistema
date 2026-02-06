"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  CreatePaymentData,
  CreatePaymentAllocation,
  CreatePaymentMethod,
  SupplierPayment,
} from "@/lib/services/supplier-payments";
import { revalidateTag } from "next/cache";

// ---------------------------------------------------------------------------
// Create payment
// ---------------------------------------------------------------------------

export async function createSupplierPaymentAction(
  paymentData: CreatePaymentData,
  allocations: CreatePaymentAllocation[],
  paymentMethods: CreatePaymentMethod[],
): Promise<SupplierPayment> {
  const user = await getServerUser();
  if (!user) throw new Error("No autenticado");
  const organizationId = await getOrganizationId();

  // Generate payment number
  const { data: paymentNumber, error: rpcError } = await supabaseAdmin.rpc(
    "generate_payment_number",
    { pos_number: 1 },
  );
  if (rpcError) throw rpcError;

  // Calculate total
  const totalAllocations = allocations.reduce((sum, a) => sum + a.amount, 0);
  const onAccountAmount = paymentData.on_account_amount || 0;
  const grandTotal = totalAllocations + onAccountAmount;

  // Create payment
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("supplier_payments")
    .insert({
      payment_number: paymentNumber as string,
      supplier_id: paymentData.supplier_id,
      payment_date: paymentData.payment_date,
      total_amount: grandTotal,
      on_account_amount: onAccountAmount,
      notes: paymentData.notes,
      status: "completed",
      organization_id: organizationId,
    })
    .select()
    .single();

  if (paymentError) throw paymentError;

  // Create allocations
  if (allocations.length > 0) {
    const allocationsData = allocations.map((a) => ({
      payment_id: payment.id,
      purchase_id: a.purchase_id,
      amount: a.amount,
    }));

    const { error: allocationsError } = await supabaseAdmin
      .from("supplier_payment_allocations")
      .insert(allocationsData);

    if (allocationsError) throw allocationsError;

    // Update purchases
    for (const allocation of allocations) {
      const { data: purchase } = await supabaseAdmin
        .from("purchases")
        .select("total, amount_paid")
        .eq("id", allocation.purchase_id)
        .single();

      if (purchase) {
        const newAmountPaid =
          Number(purchase.amount_paid || 0) + allocation.amount;
        const total = Number(purchase.total);
        const newStatus =
          newAmountPaid >= total
            ? "paid"
            : newAmountPaid > 0
              ? "partial"
              : "pending";

        await supabaseAdmin
          .from("purchases")
          .update({
            amount_paid: newAmountPaid,
            payment_status: newStatus,
          })
          .eq("id", allocation.purchase_id);
      }
    }
  }

  // Create payment methods
  if (paymentMethods.length > 0) {
    const methodsData = paymentMethods.map((m) => ({
      payment_id: payment.id,
      method_name: m.method_name,
      reference: m.reference,
      cash_register_id: m.cash_register_id,
      amount: m.amount,
    }));

    const { error: methodsError } = await supabaseAdmin
      .from("supplier_payment_methods")
      .insert(methodsData);

    if (methodsError) throw methodsError;
  }

  // Update supplier credit balance if on_account_amount > 0
  if (onAccountAmount > 0) {
    const { data: supplier } = await supabaseAdmin
      .from("suppliers")
      .select("credit_balance")
      .eq("id", paymentData.supplier_id)
      .single();

    if (supplier) {
      await supabaseAdmin
        .from("suppliers")
        .update({
          credit_balance:
            Number(supplier.credit_balance || 0) + onAccountAmount,
        })
        .eq("id", paymentData.supplier_id);
    }
  }

  revalidateTag("supplier-payments", "minutes");
  revalidateTag("purchases", "minutes");

  return payment as unknown as SupplierPayment;
}

// ---------------------------------------------------------------------------
// Cancel payment
// ---------------------------------------------------------------------------

export async function cancelSupplierPaymentAction(
  id: string,
): Promise<void> {
  const user = await getServerUser();
  if (!user) throw new Error("No autenticado");

  // Get payment with allocations
  const { data: payment, error: fetchError } = await supabaseAdmin
    .from("supplier_payments")
    .select(
      `
      *,
      allocations:supplier_payment_allocations(id, purchase_id, amount),
      payment_methods:supplier_payment_methods(id)
    `,
    )
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;
  if (!payment) throw new Error("Pago no encontrado");
  if (payment.status === "cancelled")
    throw new Error("El pago ya está anulado");

  // Revert purchase amounts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allocations = (payment as any).allocations || [];
  for (const allocation of allocations) {
    const { data: purchase } = await supabaseAdmin
      .from("purchases")
      .select("total, amount_paid")
      .eq("id", allocation.purchase_id)
      .single();

    if (purchase) {
      const newAmountPaid = Math.max(
        0,
        Number(purchase.amount_paid || 0) - allocation.amount,
      );
      const total = Number(purchase.total);
      const newStatus =
        newAmountPaid >= total
          ? "paid"
          : newAmountPaid > 0
            ? "partial"
            : "pending";

      await supabaseAdmin
        .from("purchases")
        .update({
          amount_paid: newAmountPaid,
          payment_status: newStatus,
        })
        .eq("id", allocation.purchase_id);
    }
  }

  // Revert supplier credit balance if there was on_account_amount
  if (payment.on_account_amount && Number(payment.on_account_amount) > 0) {
    const { data: supplier } = await supabaseAdmin
      .from("suppliers")
      .select("credit_balance")
      .eq("id", payment.supplier_id)
      .single();

    if (supplier) {
      await supabaseAdmin
        .from("suppliers")
        .update({
          credit_balance: Math.max(
            0,
            Number(supplier.credit_balance || 0) -
              Number(payment.on_account_amount),
          ),
        })
        .eq("id", payment.supplier_id);
    }
  }

  // Mark payment as cancelled
  const { error } = await supabaseAdmin
    .from("supplier_payments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("supplier-payments", "minutes");
  revalidateTag("purchases", "minutes");
}

// ---------------------------------------------------------------------------
// Update notes
// ---------------------------------------------------------------------------

export async function updatePaymentNotesAction(
  id: string,
  notes: string | null,
): Promise<void> {
  const user = await getServerUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabaseAdmin
    .from("supplier_payments")
    .update({ notes })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("supplier-payments", "minutes");
}
