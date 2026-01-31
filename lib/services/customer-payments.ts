import { createClient } from "@/lib/supabase/client";
import { normalizeRelation } from "@/lib/supabase/types";

// =====================================================
// Types
// =====================================================

export interface CustomerPaymentListItem {
  id: string;
  payment_number: string;
  payment_date: string;
  total_amount: number;
  status: "completed" | "cancelled";
  customer: {
    id: string;
    name: string;
  } | null;
  allocations_count: number;
  methods_summary: string;
  sales_summary: string;
}

export interface CustomerPaymentWithDetails {
  id: string;
  payment_number: string;
  customer_id: string;
  payment_date: string;
  total_amount: number;
  notes: string | null;
  status: "completed" | "cancelled";
  cancelled_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    tax_id: string | null;
    street_address: string | null;
    city: string | null;
  } | null;
  allocations: {
    id: string;
    amount: number;
    sale_id: string;
    sale: {
      id: string;
      sale_number: string;
      sale_date: string;
      total: number;
      amount_paid: number;
    } | null;
  }[];
  related_receipts: {
    id: string;
    payment_number: string;
    payment_date: string;
    total_amount: number;
    status: string;
  }[];
  methods: {
    id: string;
    payment_method_id: string | null;
    method_name: string;
    amount: number;
    reference: string | null;
    cash_register_id: string | null;
  }[];
}

export interface PendingSale {
  id: string;
  sale_number: string;
  sale_date: string;
  total: number;
  amount_paid: number;
  balance: number;
}

export interface CreateCustomerPaymentData {
  customer_id: string;
  payment_date: string;
  notes?: string;
}

export interface PaymentAllocation {
  sale_id: string;
  amount: number;
}

export interface PaymentMethod {
  payment_method_id: string | null;
  method_name: string;
  amount: number;
  reference?: string;
  cash_register_id?: string;
}

export interface GetCustomerPaymentsParams {
  search?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: "completed" | "cancelled";
  page?: number;
  pageSize?: number;
}

export interface GetCustomerPaymentsResult {
  data: CustomerPaymentListItem[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =====================================================
// Functions
// =====================================================

/**
 * Get customer payments list with filters and pagination
 */
export async function getCustomerPayments(
  params: GetCustomerPaymentsParams = {},
): Promise<GetCustomerPaymentsResult> {
  const supabase = createClient();

  const {
    search,
    customerId,
    dateFrom,
    dateTo,
    status,
    page = 1,
    pageSize = 20,
  } = params;

  // Query payments
  let query = supabase
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
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  // Filters
  if (search) {
    query = query.ilike("payment_number", `%${search}%`);
  }

  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  if (dateFrom) {
    query = query.gte("payment_date", dateFrom);
  }

  if (dateTo) {
    query = query.lte("payment_date", dateTo);
  }

  if (status) {
    query = query.eq("status", status);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: payments, error, count } = await query;

  if (error) throw error;

  // Get payment IDs
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
  const { data: allocations } = await supabase
    .from("customer_payment_allocations")
    .select("customer_payment_id, sale:sales(sale_number)")
    .in("customer_payment_id", paymentIds);

  // Get methods
  const { data: methods } = await supabase
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

/**
 * Get customer payment by ID with all details
 */
export async function getCustomerPaymentById(
  id: string,
): Promise<CustomerPaymentWithDetails | null> {
  const supabase = createClient();

  // Get payment
  const { data: payment, error } = await supabase
    .from("customer_payments")
    .select(
      `
      *,
      customer:customers(id, name, email, phone, tax_id, street_address, city)
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  // Get allocations
  const { data: allocations } = await supabase
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
  const { data: methods } = await supabase
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
    const { data: relatedAllocations } = await supabase
      .from("customer_payment_allocations")
      .select("customer_payment_id, amount")
      .in("sale_id", saleIds)
      .neq("customer_payment_id", id);

    if (relatedAllocations && relatedAllocations.length > 0) {
      const relatedPaymentIds = [
        ...new Set(relatedAllocations.map((a) => a.customer_payment_id)),
      ];

      const { data: relatedPayments } = await supabase
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

/**
 * Get pending sales for a customer (sales with balance > 0)
 */
export async function getPendingSales(
  customerId: string,
): Promise<PendingSale[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sales")
    .select("id, sale_number, sale_date, total, amount_paid")
    .eq("customer_id", customerId)
    .eq("status", "PENDING")
    .order("sale_date", { ascending: true });

  if (error) throw error;

  return (data || [])
    .map((sale) => ({
      id: sale.id,
      sale_number: sale.sale_number,
      sale_date: sale.sale_date,
      total: sale.total,
      amount_paid: sale.amount_paid ?? 0,
      balance: sale.total - (sale.amount_paid ?? 0),
    }))
    .filter((sale) => sale.balance > 0);
}

/**
 * Get pending sale by ID
 */
export async function getPendingSaleById(
  saleId: string,
): Promise<PendingSale | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sales")
    .select("id, sale_number, sale_date, total, amount_paid, customer_id")
    .eq("id", saleId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return {
    id: data.id,
    sale_number: data.sale_number,
    sale_date: data.sale_date,
    total: data.total,
    amount_paid: data.amount_paid ?? 0,
    balance: data.total - (data.amount_paid ?? 0),
  };
}

/**
 * Create a new customer payment (RCB)
 */
export async function createCustomerPayment(
  data: CreateCustomerPaymentData,
  allocations: PaymentAllocation[],
  methods: PaymentMethod[],
): Promise<{ id: string; payment_number: string }> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  // Calculate total
  const totalAmount = allocations.reduce((sum, a) => sum + a.amount, 0);

  // Generate payment number
  const { data: paymentNumber, error: numberError } = await supabase.rpc(
    "generate_customer_payment_number",
    { pos_number: 1 },
  );
  if (numberError) throw numberError;

  // Create payment
  const { data: payment, error: paymentError } = await supabase
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

  const { error: allocationsError } = await supabase
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

  const { error: methodsError } = await supabase
    .from("customer_payment_methods")
    .insert(methodsToInsert);

  if (methodsError) throw methodsError;

  // Update sales: amount_paid and status
  for (const allocation of allocations) {
    // Get current sale data
    const { data: sale } = await supabase
      .from("sales")
      .select("total, amount_paid")
      .eq("id", allocation.sale_id)
      .single();

    if (sale) {
      const newAmountPaid = (sale.amount_paid ?? 0) + allocation.amount;
      const newStatus = newAmountPaid >= sale.total ? "COMPLETED" : "PENDING";

      await supabase
        .from("sales")
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
        })
        .eq("id", allocation.sale_id);
    }
  }

  return payment;
}

/**
 * Cancel a customer payment
 */
export async function cancelCustomerPayment(id: string): Promise<void> {
  const supabase = createClient();

  // Get payment with allocations
  const { data: allocations, error: allocationsError } = await supabase
    .from("customer_payment_allocations")
    .select("sale_id, amount")
    .eq("customer_payment_id", id);

  if (allocationsError) throw allocationsError;

  // Get payment status
  const { data: payment, error: paymentError } = await supabase
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
    const { data: sale } = await supabase
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

      await supabase
        .from("sales")
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
        })
        .eq("id", allocation.sale_id);
    }
  }

  // Mark payment as cancelled
  const { error: updateError } = await supabase
    .from("customer_payments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) throw updateError;
}

/**
 * Update payment notes
 */
export async function updateCustomerPaymentNotes(
  id: string,
  notes: string | null,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("customer_payments")
    .update({ notes })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Get payments for a specific sale
 */
/**
 * Get payments for a specific sale
 */
export async function getPaymentsBySaleId(saleId: string): Promise<
  {
    id: string;
    amount: number;
    payment_id: string;
    payment_number: string;
    payment_date: string;
    payment_status: string;
    methods: {
      method_name: string;
      amount: number;
      fee_percentage: number;
      fee_fixed: number;
    }[];
  }[]
> {
  const supabase = createClient();

  // Get allocations for this sale
  const { data: allocations, error: allocationsError } = await supabase
    .from("customer_payment_allocations")
    .select("id, amount, customer_payment_id")
    .eq("sale_id", saleId);

  if (allocationsError) throw allocationsError;
  if (!allocations || allocations.length === 0) return [];

  const paymentIds = allocations.map((a) => a.customer_payment_id);

  // Get payments
  const { data: payments, error: paymentsError } = await supabase
    .from("customer_payments")
    .select("id, payment_number, payment_date, status")
    .in("id", paymentIds);

  if (paymentsError) throw paymentsError;

  // Get methods with payment_method fees
  const { data: methods, error: methodsError } = await supabase
    .from("customer_payment_methods")
    .select(
      "customer_payment_id, method_name, amount, payment_method:payment_methods(fee_percentage, fee_fixed)",
    )
    .in("customer_payment_id", paymentIds);

  if (methodsError) throw methodsError;

  // Combine data
  return allocations.map((allocation) => {
    const payment = payments?.find(
      (p) => p.id === allocation.customer_payment_id,
    );
    const paymentMethods =
      methods?.filter(
        (m) => m.customer_payment_id === allocation.customer_payment_id,
      ) || [];

    return {
      id: allocation.id,
      amount: allocation.amount,
      payment_id: allocation.customer_payment_id,
      payment_number: payment?.payment_number || "",
      payment_date: payment?.payment_date || "",
      payment_status: payment?.status || "",
      methods: paymentMethods.map((m) => {
        const pm = m.payment_method;
        const feeData = Array.isArray(pm) ? pm[0] : pm;
        return {
          method_name: m.method_name,
          amount: m.amount,
          fee_percentage: feeData?.fee_percentage ?? 0,
          fee_fixed: feeData?.fee_fixed ?? 0,
        };
      }),
    };
  });
}
