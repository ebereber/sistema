import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { cacheLife, cacheTag } from "next/cache";
import type { GetShiftsParams, Shift, ShiftSummary } from "./shifts";

export interface ShiftActivity {
  id: string;
  type: "opening" | "closing" | "sale" | "refund" | "cash_in" | "cash_out";
  description: string;
  time: string;
  seller: string;
  notes: string | null;
  amount: number | null;
  saleNumber?: string;
  saleId?: string;
}

interface GetCachedShiftsParams extends GetShiftsParams {
  discrepancy?: "with" | "without";
}

export async function getCachedShifts(
  params: GetCachedShiftsParams = {},
): Promise<{
  data: Shift[];
  count: number;
  totalPages: number;
}> {
  "use cache";
  cacheTag("shifts");
  cacheLife("minutes");

  const {
    page = 1,
    pageSize = 20,
    status,
    cashRegisterId,
    dateFrom,
    dateTo,
    discrepancy,
  } = params;

  let query = supabaseAdmin.from("cash_register_shifts").select(
    `
      *,
      cash_register:cash_registers(
        id,
        name,
        location_id
      )
    `,
    { count: "exact" },
  );

  if (status) {
    query = query.eq("status", status);
  }

  if (cashRegisterId) {
    query = query.eq("cash_register_id", cashRegisterId);
  }

  if (dateFrom) {
    query = query.gte("opened_at", dateFrom);
  }

  if (dateTo) {
    query = query.lte("opened_at", dateTo);
  }

  if (discrepancy === "with") {
    query = query.not("discrepancy", "is", null).neq("discrepancy", 0);
  }

  if (discrepancy === "without") {
    query = query.or("discrepancy.is.null,discrepancy.eq.0");
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order("opened_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: (data || []) as unknown as Shift[],
    count: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getCachedShiftById(
  id: string,
): Promise<Shift | null> {
  "use cache";
  cacheTag("shifts", `shift-${id}`);
  cacheLife("minutes");

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
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data as unknown as Shift | null;
}

export async function getCachedShiftSummary(
  shiftId: string,
): Promise<ShiftSummary> {
  "use cache";
  cacheTag("shifts", `shift-${shiftId}`);
  cacheLife("minutes");

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

export async function getCachedShiftActivities(
  shiftId: string,
  shift: Shift,
): Promise<ShiftActivity[]> {
  "use cache";
  cacheTag("shifts", `shift-${shiftId}`);
  cacheLife("minutes");

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const activities: ShiftActivity[] = [];

  // Opening activity
  activities.push({
    id: `opening-${shift.id}`,
    type: "opening",
    description: `Apertura de turno - Monto en caja: ${formatCurrency(Number(shift.opening_amount))}`,
    time: shift.opened_at,
    seller: "",
    notes: null,
    amount: Number(shift.opening_amount),
  });

  // Get sales for this shift
  const { data: sales, error: salesError } = await supabaseAdmin
    .from("sales")
    .select(
      `
      id,
      sale_number,
      total,
      voucher_type,
      created_at,
      seller_id,
      customer_payment_allocations(
        customer_payment:customer_payments(
          customer_payment_methods(method_name, amount)
        )
      )
    `,
    )
    .eq("shift_id", shiftId)
    .order("created_at", { ascending: true });

  if (!salesError && sales) {
    for (const sale of sales) {
      const paymentMethods =
        (sale.customer_payment_allocations || [])
          .flatMap(
            (a: any) =>
              a.customer_payment?.customer_payment_methods || [],
          )
          .map((m: { method_name: string }) => m.method_name)
          .filter(Boolean)
          .join(", ") || "";
      const isRefund = sale.voucher_type?.startsWith("NOTA_CREDITO");

      activities.push({
        id: sale.id,
        type: isRefund ? "refund" : "sale",
        description: `Cobro ${paymentMethods}`,
        time: sale.created_at,
        seller: "",
        notes: null,
        amount: Number(sale.total),
        saleNumber: sale.sale_number,
        saleId: sale.id,
      });
    }
  }

  // Get manual movements
  const { data: movements, error: movementsError } = await supabaseAdmin
    .from("cash_register_movements")
    .select("*")
    .eq("shift_id", shiftId)
    .order("created_at", { ascending: true });

  if (!movementsError && movements) {
    for (const movement of movements) {
      activities.push({
        id: movement.id,
        type: movement.type as "cash_in" | "cash_out",
        description:
          movement.type === "cash_in"
            ? "Ingreso efectivo"
            : "Retiro efectivo",
        time: movement.created_at,
        seller: "",
        notes: movement.notes,
        amount: Number(movement.amount),
      });
    }
  }

  // Closing activity (if closed)
  if (shift.status === "closed" && shift.closed_at) {
    activities.push({
      id: `closing-${shift.id}`,
      type: "closing",
      description: "Cierre de turno",
      time: shift.closed_at,
      seller: "",
      notes: (shift as any).discrepancy_notes ?? null,
      amount: null,
    });
  }

  // Sort by time descending (most recent first)
  return activities.sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );
}

export async function getCachedActiveCashRegisters(): Promise<
  { id: string; name: string }[]
> {
  "use cache";
  cacheTag("cash-registers");
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("cash_registers")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  if (error) throw error;
  return (data || []) as { id: string; name: string }[];
}
