import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeRelation } from "@/lib/supabase/types";
import type {
  CustomerPaymentListItem,
  CustomerPaymentWithDetails,
  GetCustomerPaymentsResult,
} from "./customer-payments";

export interface GetCachedCustomerPaymentsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  visibility: "own" | "assigned_locations" | "all";
  userId: string;
  locationIds: string[];
}

export async function getCachedCustomerPayments(
  organizationId: string,
  params: GetCachedCustomerPaymentsParams,
): Promise<GetCustomerPaymentsResult> {
  "use cache";
  cacheTag("customer-payments");
  cacheLife("minutes");

  const {
    page = 1,
    pageSize = 20,
    search,
    dateFrom,
    dateTo,
    visibility,
    userId,
  } = params;

  let query = supabaseAdmin
    .from("customer_payments")
    .select(
      `
      id,
      payment_number,
      payment_date,
      total_amount,
      status,
      customer:customers(id, name)
    `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  // Apply data scope inline
  if (visibility === "own") {
    query = query.eq("created_by", userId);
  }
  // "assigned_locations" doesn't apply here (customer_payments has no location_id)
  // "all" = no filter

  if (search) {
    query = query.ilike("payment_number", `%${search}%`);
  }

  if (dateFrom) {
    query = query.gte("payment_date", dateFrom);
  }

  if (dateTo) {
    query = query.lte("payment_date", dateTo);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: payments, error, count } = await query;

  if (error) throw error;

  const paymentIds = (payments || []).map((p) => p.id);

  if (paymentIds.length === 0) {
    return {
      data: [],
      count: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  // Get allocations with sale info
  const { data: allocations } = await supabaseAdmin
    .from("customer_payment_allocations")
    .select("customer_payment_id, sale:sales(sale_number)")
    .in("customer_payment_id", paymentIds);

  // Get methods
  const { data: methods } = await supabaseAdmin
    .from("customer_payment_methods")
    .select("customer_payment_id, method_name")
    .in("customer_payment_id", paymentIds);

  // Map data
  const mappedData: CustomerPaymentListItem[] = (payments || []).map((p) => {
    const paymentAllocations = (allocations || []).filter(
      (a) => a.customer_payment_id === p.id,
    );
    const paymentMethods = (methods || []).filter(
      (m) => m.customer_payment_id === p.id,
    );

    // Build methods summary
    let methodsSummary = "";
    if (paymentMethods.length === 1) {
      methodsSummary = paymentMethods[0].method_name;
    } else if (paymentMethods.length > 1) {
      methodsSummary = `${paymentMethods[0].method_name} + ${paymentMethods.length - 1} más`;
    }

    // Build sales summary
    const salesNumbers = paymentAllocations
      .map((a) => {
        const sale = normalizeRelation(a.sale);
        return sale?.sale_number ?? null;
      })
      .filter((s): s is string => s !== null);

    let salesSummary = "";
    if (salesNumbers.length === 1) {
      salesSummary = salesNumbers[0];
    } else if (salesNumbers.length > 1) {
      salesSummary = `${salesNumbers[0]} +${salesNumbers.length - 1}`;
    }

    const customerData = normalizeRelation(p.customer);

    return {
      id: p.id,
      payment_number: p.payment_number,
      payment_date: p.payment_date,
      total_amount: p.total_amount,
      status: p.status as "completed" | "cancelled",
      customer: customerData,
      allocations_count: paymentAllocations.length,
      methods_summary: methodsSummary,
      sales_summary: salesSummary,
    };
  });

  return {
    data: mappedData,
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getCachedCustomerPaymentById(
  organizationId: string,
  id: string,
): Promise<CustomerPaymentWithDetails | null> {
  "use cache";
  cacheTag("customer-payments", `customer-payment-${id}`);
  cacheLife("minutes");

  // Get payment
  const { data: payment, error } = await supabaseAdmin
    .from("customer_payments")
    .select(
      `
      *,
      customer:customers(id, name, email, phone, tax_id, street_address, city)
    `,
    )
    .eq("organization_id", organizationId)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  // Get allocations
  const { data: allocations } = await supabaseAdmin
    .from("customer_payment_allocations")
    .select(
      `
      id,
      amount,
      sale_id,
      sale:sales(id, sale_number, sale_date, total, amount_paid)
    `,
    )
    .eq("customer_payment_id", id);

  // Get methods
  const { data: methods } = await supabaseAdmin
    .from("customer_payment_methods")
    .select("*")
    .eq("customer_payment_id", id);

  const customerData = normalizeRelation(
    payment.customer,
  ) as CustomerPaymentWithDetails["customer"];

  // Map allocations
  const mappedAllocations = (allocations || []).map((a) => ({
    id: a.id,
    amount: a.amount,
    sale_id: a.sale_id,
    sale: normalizeRelation(a.sale),
  }));

  // Get related receipts (other RCBs for the same sales)
  const saleIds = (allocations || []).map((a) => a.sale_id);
  let relatedReceipts: CustomerPaymentWithDetails["related_receipts"] = [];

  if (saleIds.length > 0) {
    const { data: relatedAllocations } = await supabaseAdmin
      .from("customer_payment_allocations")
      .select("customer_payment_id, amount")
      .in("sale_id", saleIds)
      .neq("customer_payment_id", id);

    if (relatedAllocations && relatedAllocations.length > 0) {
      const relatedPaymentIds = [
        ...new Set(relatedAllocations.map((a) => a.customer_payment_id)),
      ];

      const { data: relatedPayments } = await supabaseAdmin
        .from("customer_payments")
        .select("id, payment_number, payment_date, total_amount, status")
        .in("id", relatedPaymentIds);

      relatedReceipts = (relatedPayments || []).map((rp) => ({
        id: rp.id,
        payment_number: rp.payment_number,
        payment_date: rp.payment_date,
        total_amount: rp.total_amount,
        status: rp.status,
      }));
    }
  }

  return {
    id: payment.id,
    payment_number: payment.payment_number,
    customer_id: payment.customer_id,
    payment_date: payment.payment_date,
    total_amount: payment.total_amount,
    notes: payment.notes,
    status: payment.status as "completed" | "cancelled",
    cancelled_at: payment.cancelled_at,
    created_by: payment.created_by,
    created_at: payment.created_at,
    updated_at: payment.updated_at,
    customer: customerData,
    allocations: mappedAllocations,
    methods: methods || [],
    related_receipts: relatedReceipts,
  };
}
