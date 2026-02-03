import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

export type Shift = Omit<Tables<"cash_register_shifts">, "status"> & {
  status: "open" | "closed";
  cash_register?: {
    id: string;
    name: string;
    location_id: string;
  };
  opened_by_user?: {
    id: string;
    email: string;
  };
  closed_by_user?: {
    id: string;
    email: string;
  };
};

export type ShiftMovement = Omit<Tables<"cash_register_movements">, "type"> & {
  type: "cash_in" | "cash_out";
  performed_by_user?: {
    id: string;
    email: string;
  };
};

export interface ShiftSummary {
  grossCollections: number;
  refunds: number;
  netCollections: number;
  cashIn: number;
  cashOut: number;
  currentCashAmount: number;
}

export interface OpenShiftData {
  cashRegisterId: string;
  openingAmount: number;
}

export interface CloseShiftData {
  countedAmount: number;
  leftInCash: number;
  discrepancyReason?: string;
  discrepancyNotes?: string;
}

// Get active shift for current user's location
export async function getActiveShift(): Promise<Shift | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
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
    .maybeSingle();

  if (error) throw error;

  return data as unknown as Shift | null;
}

// Get active shift for a specific cash register
export async function getActiveShiftByCashRegister(
  cashRegisterId: string,
): Promise<Shift | null> {
  const supabase = createClient();

  const { data, error } = await supabase
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
    .eq("cash_register_id", cashRegisterId)
    .eq("status", "open")
    .maybeSingle();

  if (error) throw error;

  return data as unknown as Shift | null;
}

// Get shift by ID with all relations
export async function getShiftById(id: string): Promise<Shift | null> {
  const supabase = createClient();

  const { data, error } = await supabase
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

// Get shift summary (collections, refunds, movements)
export async function getShiftSummary(shiftId: string): Promise<ShiftSummary> {
  const supabase = createClient();

  // Get shift opening amount
  const { data: shift, error: shiftError } = await supabase
    .from("cash_register_shifts")
    .select("opening_amount")
    .eq("id", shiftId)
    .single();

  if (shiftError) throw shiftError;

  // Get sales for this shift
  const { data: salesData, error: salesError } = await supabase
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
    const { data: allocations } = await supabase
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
  const { data: movements, error: movementsError } = await supabase
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

// Get shift movements
export async function getShiftMovements(
  shiftId: string,
): Promise<ShiftMovement[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cash_register_movements")
    .select("*")
    .eq("shift_id", shiftId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []) as unknown as ShiftMovement[];
}

// Open a new shift
export async function openShift(data: OpenShiftData): Promise<Shift> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Usuario no autenticado");

  // Check if there's already an open shift for this cash register
  const existing = await getActiveShiftByCashRegister(data.cashRegisterId);
  if (existing) {
    throw new Error("Ya hay un turno abierto en esta caja");
  }

  const { data: shift, error } = await supabase
    .from("cash_register_shifts")
    .insert({
      cash_register_id: data.cashRegisterId,
      opened_by: user.id,
      opening_amount: data.openingAmount,
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

  return shift as unknown as Shift;
}

// Close a shift
export async function closeShift(
  shiftId: string,
  data: CloseShiftData,
): Promise<Shift> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Usuario no autenticado");

  // Get shift summary to calculate expected amount
  const summary = await getShiftSummary(shiftId);

  // Get shift to get opening amount
  const { data: currentShift, error: shiftError } = await supabase
    .from("cash_register_shifts")
    .select("opening_amount")
    .eq("id", shiftId)
    .single();

  if (shiftError) throw shiftError;

  const expectedAmount = summary.currentCashAmount;
  const discrepancy = data.countedAmount - expectedAmount;

  const { data: shift, error } = await supabase
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

  return shift as unknown as Shift;
}

// Add cash to shift (ingreso)
export async function addCashToShift(
  shiftId: string,
  amount: number,
  notes?: string,
): Promise<ShiftMovement> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Usuario no autenticado");

  const { data, error } = await supabase
    .from("cash_register_movements")
    .insert({
      shift_id: shiftId,
      type: "cash_in",
      amount,
      notes: notes || null,
      performed_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  return data as unknown as ShiftMovement;
}

// Remove cash from shift (retiro)
export async function removeCashFromShift(
  shiftId: string,
  amount: number,
  notes?: string,
): Promise<ShiftMovement> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Usuario no autenticado");

  const { data, error } = await supabase
    .from("cash_register_movements")
    .insert({
      shift_id: shiftId,
      type: "cash_out",
      amount,
      notes: notes || null,
      performed_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  return data as unknown as ShiftMovement;
}

// Get shifts list (for /turnos page)
export interface GetShiftsParams {
  page?: number;
  pageSize?: number;
  status?: "open" | "closed";
  cashRegisterId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getShifts(params: GetShiftsParams = {}): Promise<{
  data: Shift[];
  count: number;
  totalPages: number;
}> {
  const supabase = createClient();
  const {
    page = 1,
    pageSize = 20,
    status,
    cashRegisterId,
    dateFrom,
    dateTo,
  } = params;

  let query = supabase.from("cash_register_shifts").select(
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

  // Pagination
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

// Get last closed shift for a cash register (to get left_in_cash)
export async function getLastClosedShift(
  cashRegisterId: string,
): Promise<Shift | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cash_register_shifts")
    .select(
      `
      *,
      cash_register:cash_registers(id, name)
    `,
    )
    .eq("cash_register_id", cashRegisterId)
    .eq("status", "closed")
    .order("closed_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as unknown as Shift | null;
}
