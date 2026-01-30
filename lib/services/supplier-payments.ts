import { createClient } from "@/lib/supabase/client";

// Types
export interface SupplierPayment {
  id: string;
  payment_number: string;
  supplier_id: string;
  payment_date: string;
  total_amount: number;
  on_account_amount: number;
  notes: string | null;
  status: "completed" | "cancelled";
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  supplier?: {
    id: string;
    name: string;
    tax_id: string | null;
  };
  allocations?: SupplierPaymentAllocation[];
  payment_methods?: SupplierPaymentMethod[];
}

export interface SupplierPaymentAllocation {
  id: string;
  payment_id: string;
  purchase_id: string;
  amount: number;
  created_at: string;
  // Relations
  purchase?: {
    id: string;
    voucher_number: string;
    purchase_number: string;
    total: number;
    invoice_date: string;
  };
}

export interface SupplierPaymentMethod {
  id: string;
  payment_id: string;
  method_name: string;
  reference: string | null;
  cash_register_id: string | null;
  amount: number;
  created_at: string;
  // Relations
  cash_register?: {
    id: string;
    name: string;
  };
}

export interface CreatePaymentData {
  supplier_id: string;
  payment_date: string;
  total_amount: number;
  on_account_amount?: number;
  notes?: string | null;
}

export interface CreatePaymentAllocation {
  purchase_id: string;
  amount: number;
}

export interface CreatePaymentMethod {
  method_name: string;
  reference?: string | null;
  cash_register_id?: string | null;
  amount: number;
}

export interface GetPaymentsParams {
  search?: string;
  supplierId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// Get payments with filters
export async function getSupplierPayments(params: GetPaymentsParams = {}) {
  const supabase = createClient();
  const {
    search,
    supplierId,
    status,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
  } = params;

  let query = supabase
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

  // Search by payment_number only
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

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return { data: data as SupplierPayment[], count: count || 0 };
}

// Get single payment by ID
export async function getSupplierPaymentById(
  id: string,
): Promise<SupplierPayment | null> {
  const supabase = createClient();

  const { data, error } = await supabase
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

  return data as SupplierPayment;
}

// Get pending purchases for a supplier
export async function getPendingPurchases(supplierId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("purchases")
    .select(
      "id, voucher_number, purchase_number, total, amount_paid, invoice_date, payment_status",
    )
    .eq("supplier_id", supplierId)
    .neq("payment_status", "paid")
    .eq("status", "completed")
    .order("invoice_date", { ascending: true });

  if (error) throw error;

  // Calculate balance for each purchase
  return (data || []).map((purchase) => ({
    ...purchase,
    balance: Number(purchase.total) - Number(purchase.amount_paid || 0),
  }));
}

// Generate payment number
async function generatePaymentNumber(): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("generate_payment_number", {
    pos_number: 1,
  });

  if (error) throw error;

  return data;
}

// Create payment
export async function createSupplierPayment(
  paymentData: CreatePaymentData,
  allocations: CreatePaymentAllocation[],
  paymentMethods: CreatePaymentMethod[],
): Promise<SupplierPayment> {
  const supabase = createClient();

  // Generate payment number
  const paymentNumber = await generatePaymentNumber();

  // Calculate total (compras + pago a cuenta)
  const totalAllocations = allocations.reduce((sum, a) => sum + a.amount, 0);
  const onAccountAmount = paymentData.on_account_amount || 0;
  const grandTotal = totalAllocations + onAccountAmount;

  // Create payment
  const { data: payment, error: paymentError } = await supabase
    .from("supplier_payments")
    .insert({
      payment_number: paymentNumber,
      supplier_id: paymentData.supplier_id,
      payment_date: paymentData.payment_date,
      total_amount: grandTotal,
      on_account_amount: onAccountAmount,
      notes: paymentData.notes,
      status: "completed",
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

    const { error: allocationsError } = await supabase
      .from("supplier_payment_allocations")
      .insert(allocationsData);

    if (allocationsError) throw allocationsError;

    // Update purchases
    for (const allocation of allocations) {
      // Get current purchase
      const { data: purchase } = await supabase
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

        await supabase
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

    const { error: methodsError } = await supabase
      .from("supplier_payment_methods")
      .insert(methodsData);

    if (methodsError) throw methodsError;
  }

  // Update supplier credit balance if on_account_amount > 0
  if (onAccountAmount > 0) {
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("credit_balance")
      .eq("id", paymentData.supplier_id)
      .single();

    if (supplier) {
      await supabase
        .from("suppliers")
        .update({
          credit_balance:
            Number(supplier.credit_balance || 0) + onAccountAmount,
        })
        .eq("id", paymentData.supplier_id);
    }
  }

  return payment as SupplierPayment;
}

// Cancel payment
export async function cancelSupplierPayment(id: string): Promise<void> {
  const supabase = createClient();

  // Get payment with allocations
  const payment = await getSupplierPaymentById(id);
  if (!payment) throw new Error("Pago no encontrado");
  if (payment.status === "cancelled")
    throw new Error("El pago ya está anulado");

  // Revert purchase amounts
  if (payment.allocations && payment.allocations.length > 0) {
    for (const allocation of payment.allocations) {
      const { data: purchase } = await supabase
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

        await supabase
          .from("purchases")
          .update({
            amount_paid: newAmountPaid,
            payment_status: newStatus,
          })
          .eq("id", allocation.purchase_id);
      }
    }
  }

  // Revert supplier credit balance if there was on_account_amount
  if (payment.on_account_amount && payment.on_account_amount > 0) {
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("credit_balance")
      .eq("id", payment.supplier_id)
      .single();

    if (supplier) {
      await supabase
        .from("suppliers")
        .update({
          credit_balance: Math.max(
            0,
            Number(supplier.credit_balance || 0) - payment.on_account_amount,
          ),
        })
        .eq("id", payment.supplier_id);
    }
  }

  // Mark payment as cancelled
  const { error } = await supabase
    .from("supplier_payments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

// Update payment notes
export async function updatePaymentNotes(
  id: string,
  notes: string | null,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("supplier_payments")
    .update({ notes })
    .eq("id", id);

  if (error) throw error;
}
