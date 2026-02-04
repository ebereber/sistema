import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { cacheLife, cacheTag } from "next/cache";
import type {
  SupplierPayment,
  GetPaymentsParams,
} from "./supplier-payments";

export async function getCachedSupplierPayments(
  params: GetPaymentsParams = {},
): Promise<{
  data: SupplierPayment[];
  count: number;
  totalPages: number;
}> {
  "use cache";
  cacheTag("supplier-payments");
  cacheLife("minutes");

  const {
    search,
    supplierId,
    status,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
  } = params;

  let query = supabaseAdmin
    .from("supplier_payments")
    .select(
      `
      *,
      supplier:suppliers(id, name),
      allocations:supplier_payment_allocations(
        id,
        amount,
        purchase:purchases(id, voucher_number, purchase_number)
      ),
      payment_methods:supplier_payment_methods(id, method_name, amount)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("payment_number", `%${search}%`);
  }

  if (supplierId) {
    query = query.eq("supplier_id", supplierId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (dateFrom) {
    query = query.gte("payment_date", dateFrom);
  }

  if (dateTo) {
    query = query.lte("payment_date", dateTo);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: (data || []) as SupplierPayment[],
    count: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getCachedSupplierPaymentById(
  id: string,
): Promise<SupplierPayment | null> {
  "use cache";
  cacheTag("supplier-payments", `supplier-payment-${id}`);
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("supplier_payments")
    .select(
      `
      *,
      supplier:suppliers(id, name, tax_id),
      allocations:supplier_payment_allocations(
        id,
        purchase_id,
        amount,
        purchase:purchases(id, voucher_number, purchase_number, total, invoice_date)
      ),
      payment_methods:supplier_payment_methods(
        id,
        method_name,
        reference,
        amount,
        cash_register:cash_registers(id, name)
      )
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as unknown as SupplierPayment;
}
