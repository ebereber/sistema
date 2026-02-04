"use server";

import { getServerUser } from "@/lib/auth/get-server-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";
import type {
  CreateCustomerPaymentData,
  PaymentAllocation,
  PaymentMethod,
} from "@/lib/services/customer-payments";

export async function createCustomerPaymentAction(
  data: CreateCustomerPaymentData,
  allocations: PaymentAllocation[],
  methods: PaymentMethod[],
): Promise<{ id: string; payment_number: string }> {
  const user = await getServerUser();
  if (!user) throw new Error("Usuario no autenticado");

  // Calculate total
  const totalAmount = allocations.reduce((sum, a) => sum + a.amount, 0);

  // Generate payment number
  const { data: paymentNumber, error: numberError } = await supabaseAdmin.rpc(
    "generate_customer_payment_number",
    { pos_number: 1 },
  );
  if (numberError) throw numberError;

  // Create payment
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("customer_payments")
    .insert({
      payment_number: paymentNumber,
      customer_id: data.customer_id,
      payment_date: data.payment_date,
      total_amount: totalAmount,
      notes: data.notes || null,
      status: "completed",
      created_by: user.id,
    })
    .select("id, payment_number")
    .single();

  if (paymentError) throw paymentError;

  // Create allocations
  const allocationsToInsert = allocations.map((a) => ({
    customer_payment_id: payment.id,
    sale_id: a.sale_id,
    amount: a.amount,
  }));

  const { error: allocationsError } = await supabaseAdmin
    .from("customer_payment_allocations")
    .insert(allocationsToInsert);

  if (allocationsError) throw allocationsError;

  // Create methods
  const methodsToInsert = methods.map((m) => ({
    customer_payment_id: payment.id,
    payment_method_id: m.payment_method_id,
    method_name: m.method_name,
    amount: m.amount,
    reference: m.reference || null,
    cash_register_id: m.cash_register_id || null,
  }));

  const { error: methodsError } = await supabaseAdmin
    .from("customer_payment_methods")
    .insert(methodsToInsert);

  if (methodsError) throw methodsError;

  // Update sales: amount_paid and status
  for (const allocation of allocations) {
    const { data: sale } = await supabaseAdmin
      .from("sales")
      .select("total, amount_paid")
      .eq("id", allocation.sale_id)
      .single();

    if (sale) {
      const newAmountPaid = (sale.amount_paid ?? 0) + allocation.amount;
      const newStatus = newAmountPaid >= sale.total ? "COMPLETED" : "PENDING";

      await supabaseAdmin
        .from("sales")
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
        })
        .eq("id", allocation.sale_id);
    }
  }

  revalidateTag("customer-payments", "minutes");

  return payment;
}

export async function cancelCustomerPaymentAction(id: string): Promise<void> {
  // Get payment with allocations
  const { data: allocations, error: allocationsError } = await supabaseAdmin
    .from("customer_payment_allocations")
    .select("sale_id, amount")
    .eq("customer_payment_id", id);

  if (allocationsError) throw allocationsError;

  // Get payment status
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("customer_payments")
    .select("status")
    .eq("id", id)
    .single();

  if (paymentError) throw paymentError;
  if (!payment) throw new Error("Cobro no encontrado");
  if (payment.status === "cancelled")
    throw new Error("El cobro ya está anulado");

  // Revert amount_paid on each sale
  for (const allocation of allocations || []) {
    const { data: sale } = await supabaseAdmin
      .from("sales")
      .select("total, amount_paid")
      .eq("id", allocation.sale_id)
      .single();

    if (sale) {
      const newAmountPaid = Math.max(
        0,
        (sale.amount_paid ?? 0) - allocation.amount,
      );
      const newStatus = newAmountPaid >= sale.total ? "COMPLETED" : "PENDING";

      await supabaseAdmin
        .from("sales")
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
        })
        .eq("id", allocation.sale_id);
    }
  }

  // Mark payment as cancelled
  const { error: updateError } = await supabaseAdmin
    .from("customer_payments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) throw updateError;

  revalidateTag("customer-payments", "minutes");
}

export async function updateCustomerPaymentNotesAction(
  id: string,
  notes: string | null,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("customer_payments")
    .update({ notes })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("customer-payments", "minutes");
}
