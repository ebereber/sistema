import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { cacheLife, cacheTag } from "next/cache";

// ── Types ──────────────────────────────────────────────────────────

export interface TreasuryAccount {
  id: string;
  name: string;
  description: string;
  balance: number;
  currency: string;
  type: "bank" | "cash" | "safe";
}

export interface TreasuryOverview {
  bankAccounts: TreasuryAccount[];
  cashRegisters: TreasuryAccount[];
  safeBoxes: TreasuryAccount[];
  totalBanks: number;
  totalCash: number;
  totalSafes: number;
  totalTreasury: number;
}

export interface TreasuryMovement {
  id: string;
  date: string;
  dateRaw: string;
  type: string;
  reference: string | null;
  description: string | null;
  amount: number;
  isPositive: boolean;
  sourceId?: string | null;
  sourceType?: "customer_payment" | "supplier_payment" | null;
}

export type TreasuryCategory =
  | "cobro_cliente"
  | "pago_proveedor"
  | "movimiento_manual"
  | "transferencia"
  | "deposito_caja_fuerte"
  | "movimiento_caja";

export interface UnifiedTreasuryMovement {
  id: string;
  date: string;
  dateRaw: string;
  account: string;
  accountType: "bank_account" | "safe_box" | "cash_register";
  accountId: string;
  type: string;
  category: TreasuryCategory;
  reference: string | null;
  description: string | null;
  amount: number;
  isPositive: boolean;
  editable: boolean;
}

export interface TreasuryAccountDetail {
  id: string;
  name: string;
  description: string;
  balance: number;
  currency: string;
  accountType: "bank" | "cash" | "safe";
  movements: TreasuryMovement[];
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Formats a date string for display in AR locale.
 * Handles: "2026-02-11", "2026-02-11 00:00:00+00", "2026-02-11T15:36:19.280978+00:00"
 */
function formatDate(dateStr: string): string {
  // Date-only or date with midnight (from Supabase `date` columns): parse parts directly
  // to avoid UTC midnight → previous day in UTC-3
  const dateOnlyMatch = dateStr.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[\sT]00:00:00.*)?$/,
  );
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[3]}/${dateOnlyMatch[2]}/${dateOnlyMatch[1]}`;
  }
  // Full timestamps: use Argentina timezone
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

/**
 * Strips legacy [TRANSFER:uuid] prefix from description/notes.
 * New transfers don't add this prefix, but old data may still have it.
 */
function cleanNotes(text: string | null): string | null {
  if (!text) return null;
  return text.replace(/^\[TRANSFER:[^\]]+\]\s*/, "").trim() || null;
}

/**
 * Determines type label for safe_box_movements based on source_type and direction.
 */
function safeBoxTypeLabel(
  sourceType: string | null,
  movementType: string,
): string {
  switch (sourceType) {
    case "shift_deposit":
    case "shift_close":
      return "Depósito desde turno";
    case "transfer":
      return movementType === "deposit"
        ? "Transferencia entrada"
        : "Transferencia salida";
    case "manual":
      return movementType === "deposit" ? "Ingreso" : "Egreso";
    default:
      return movementType === "deposit" ? "Depósito" : "Retiro";
  }
}

/**
 * Determines type label for cash_register_movements.
 * Uses source_type (via reference prefix) and notes content to classify.
 */
function cashRegisterTypeLabel(
  movementType: string,
  reference: string | null,
  notes: string | null,
): string {
  // Transfers: identified by TRF- reference (set by createTreasuryTransferAction)
  if (reference?.startsWith("TRF-")) {
    return movementType === "cash_in"
      ? "Transferencia entrada"
      : "Transferencia salida";
  }
  // Safe box deposits
  if (
    movementType === "cash_out" &&
    notes?.toLowerCase().includes("caja fuerte")
  ) {
    return "Depósito en caja fuerte";
  }
  // Sobrante / faltante
  if (movementType === "cash_in") {
    return notes?.toLowerCase().includes("sobrante")
      ? "Sobrante de caja"
      : "Ingreso manual";
  }
  return notes?.toLowerCase().includes("faltante")
    ? "Faltante de caja"
    : "Retiro manual";
}

/**
 * Category for cash_register_movements (used in unified view filters).
 */
function cashRegisterCategory(
  movementType: string,
  reference: string | null,
  notes: string | null,
): TreasuryCategory {
  if (reference?.startsWith("TRF-")) return "transferencia";
  if (
    movementType === "cash_out" &&
    notes?.toLowerCase().includes("caja fuerte")
  ) {
    return "deposito_caja_fuerte";
  }
  return "movimiento_caja";
}

// ── Overview ───────────────────────────────────────────────────────

export async function getCachedTreasuryOverview(
  organizationId: string,
): Promise<TreasuryOverview> {
  "use cache";
  cacheTag("treasury");
  cacheLife("minutes");

  const [bankAccounts, cashRegisters, safeBoxes] = await Promise.all([
    fetchBankAccountsWithBalances(organizationId),
    fetchCashRegistersWithBalances(organizationId),
    fetchSafeBoxesWithBalances(organizationId),
  ]);

  const totalBanks = bankAccounts.reduce((s, a) => s + a.balance, 0);
  const totalCash = cashRegisters.reduce((s, a) => s + a.balance, 0);
  const totalSafes = safeBoxes.reduce((s, a) => s + a.balance, 0);

  return {
    bankAccounts,
    cashRegisters,
    safeBoxes,
    totalBanks,
    totalCash,
    totalSafes,
    totalTreasury: totalBanks + totalCash + totalSafes,
  };
}

// ── Detail ─────────────────────────────────────────────────────────

export async function getCachedTreasuryAccountDetail(
  accountId: string,
  accountType: "bank" | "cash" | "safe",
): Promise<TreasuryAccountDetail | null> {
  "use cache";
  cacheTag("treasury");
  cacheLife("minutes");

  switch (accountType) {
    case "bank":
      return fetchBankAccountDetail(accountId);
    case "cash":
      return fetchCashRegisterDetail(accountId);
    case "safe":
      return fetchSafeBoxDetail(accountId);
    default:
      return null;
  }
}

// ── Bank accounts: balance ─────────────────────────────────────────

async function fetchBankAccountsWithBalances(
  organizationId: string,
): Promise<TreasuryAccount[]> {
  const { data: accounts, error: accError } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, bank_name, account_name, currency, initial_balance")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("bank_name");

  if (accError) throw accError;
  if (!accounts || accounts.length === 0) return [];

  const accountIds = accounts.map((a) => a.id);

  // Bank account movements (manual deposits/withdrawals, transfers)
  const { data: movements, error: mvError } = await supabaseAdmin
    .from("bank_account_movements")
    .select("bank_account_id, type, amount")
    .in("bank_account_id", accountIds);
  if (mvError) throw mvError;

  // Customer payment methods linked to bank accounts (cobros por transferencia)
  const { data: cobros, error: cobrosError } = await supabaseAdmin
    .from("customer_payment_methods")
    .select(
      "bank_account_id, amount, customer_payment:customer_payments(status)",
    )
    .in("bank_account_id", accountIds)
    .not("bank_account_id", "is", null);
  if (cobrosError) throw cobrosError;

  // Supplier payment methods linked to bank accounts (pagos a proveedor)
  const { data: supplierPayments, error: spError } = await supabaseAdmin
    .from("supplier_payment_methods")
    .select(
      "bank_account_id, amount, supplier_payment:supplier_payments(status)",
    )
    .in("bank_account_id", accountIds)
    .not("bank_account_id", "is", null);
  if (spError) throw spError;

  // Calculate balances
  const balances: Record<string, number> = {};
  for (const acc of accounts) {
    balances[acc.id] = acc.initial_balance;
  }
  for (const m of movements || []) {
    if (m.type === "deposit" || m.type === "transfer_in") {
      balances[m.bank_account_id] += m.amount;
    } else {
      balances[m.bank_account_id] -= m.amount;
    }
  }
  for (const c of cobros || []) {
    if (!c.bank_account_id) continue;
    const p = c.customer_payment as unknown as { status: string } | null;
    if (p?.status !== "cancelled") {
      balances[c.bank_account_id] =
        (balances[c.bank_account_id] ?? 0) + c.amount;
    }
  }
  for (const sp of supplierPayments || []) {
    if (!sp.bank_account_id) continue;
    const p = sp.supplier_payment as unknown as { status: string } | null;
    if (p?.status !== "cancelled") {
      balances[sp.bank_account_id] =
        (balances[sp.bank_account_id] ?? 0) - sp.amount;
    }
  }

  return accounts.map((acc) => ({
    id: acc.id,
    name: acc.account_name,
    description: acc.bank_name,
    balance: balances[acc.id] ?? 0,
    currency: acc.currency,
    type: "bank" as const,
  }));
}

// ── Bank accounts: detail ──────────────────────────────────────────

async function fetchBankAccountDetail(
  accountId: string,
): Promise<TreasuryAccountDetail | null> {
  const { data: account, error: accError } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, bank_name, account_name, currency, initial_balance")
    .eq("id", accountId)
    .single();
  if (accError) return null;

  // Own movements
  const { data: movements, error: mvError } = await supabaseAdmin
    .from("bank_account_movements")
    .select(
      "id, type, amount, description, reference, movement_date, created_at, source_type",
    )
    .eq("bank_account_id", accountId)
    .order("created_at", { ascending: false });
  if (mvError) throw mvError;

  // Customer cobros linked to this bank
  const { data: cobros, error: cobrosError } = await supabaseAdmin
    .from("customer_payment_methods")
    .select(
      "id, customer_payment_id, amount, method_name, reference, created_at, customer_payment:customer_payments(payment_number, payment_date, status)",
    )
    .eq("bank_account_id", accountId);
  if (cobrosError) throw cobrosError;

  // Supplier payments linked to this bank
  const { data: supplierPMs, error: spError } = await supabaseAdmin
    .from("supplier_payment_methods")
    .select(
      "id, payment_id, amount, method_name, reference, created_at, supplier_payment:supplier_payments(payment_number, payment_date, status, supplier:suppliers(name))",
    )
    .eq("bank_account_id", accountId);
  if (spError) throw spError;

  // Balance: initial + deposits - withdrawals + cobros - supplier payments
  let balance = account.initial_balance;
  for (const m of movements || []) {
    if (m.type === "deposit" || m.type === "transfer_in") balance += m.amount;
    else balance -= m.amount;
  }
  for (const c of cobros || []) {
    const p = c.customer_payment as unknown as { status: string } | null;
    if (p?.status !== "cancelled") balance += c.amount;
  }
  for (const sp of supplierPMs || []) {
    const p = sp.supplier_payment as unknown as { status: string } | null;
    if (p?.status !== "cancelled") balance -= sp.amount;
  }

  // Map own movements
  const typeLabels: Record<string, string> = {
    deposit: "Depósito",
    withdrawal: "Retiro",
    transfer_in: "Transferencia entrada",
    transfer_out: "Transferencia salida",
  };

  const bankMvs: TreasuryMovement[] = (movements || []).map((m) => ({
    id: m.id,
    date: formatDate(m.movement_date),
    dateRaw: m.created_at || m.movement_date,
    type: typeLabels[m.type] || m.type,
    reference: m.reference,
    description: cleanNotes(m.description),
    amount: m.amount,
    isPositive: m.type === "deposit" || m.type === "transfer_in",
    sourceId: null,
    sourceType: null,
  }));

  // Map cobros
  const cobroMvs: TreasuryMovement[] = (cobros || [])
    .filter((c) => {
      const p = c.customer_payment as unknown as { status: string } | null;
      return p?.status !== "cancelled";
    })
    .map((c) => {
      const p = c.customer_payment as unknown as {
        payment_number: string;
        payment_date: string;
      } | null;
      return {
        id: c.id,
        date: formatDate(p?.payment_date || c.created_at),
        dateRaw: c.created_at,
        type: "Cobro a cliente",
        reference: p?.payment_number || c.reference,
        description: c.method_name,
        amount: c.amount,
        isPositive: true,
        sourceId: c.customer_payment_id,
        sourceType: "customer_payment" as const,
      };
    });

  // Map supplier payments
  const supplierMvs: TreasuryMovement[] = (supplierPMs || [])
    .filter((sp) => {
      const p = sp.supplier_payment as unknown as { status: string } | null;
      return p?.status !== "cancelled";
    })
    .map((sp) => {
      const p = sp.supplier_payment as unknown as {
        payment_number: string;
        payment_date: string;
        supplier: { name: string } | null;
      } | null;
      return {
        id: sp.id,
        date: formatDate(
          p?.payment_date || sp.created_at || new Date().toISOString(),
        ),
        dateRaw: sp.created_at || new Date().toISOString(),
        type: "Pago a proveedor",
        reference: p?.payment_number || sp.reference,
        description: `Pago a ${p?.supplier?.name || "proveedor"}`,
        amount: sp.amount,
        isPositive: false,
        sourceId: sp.payment_id,
        sourceType: "supplier_payment" as const,
      };
    });

  const allMovements = [...bankMvs, ...cobroMvs, ...supplierMvs];
  allMovements.sort(
    (a, b) => new Date(b.dateRaw).getTime() - new Date(a.dateRaw).getTime(),
  );

  return {
    id: account.id,
    name: account.account_name,
    description: account.bank_name,
    balance,
    currency: account.currency,
    accountType: "bank",
    movements: allMovements,
  };
}

// ── Cash registers: balance ────────────────────────────────────────

async function fetchCashRegistersWithBalances(
  organizationId: string,
): Promise<TreasuryAccount[]> {
  const { data: registers, error: regError } = await supabaseAdmin
    .from("cash_registers")
    .select("id, name, location:locations(name)")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("name");
  if (regError) throw regError;
  if (!registers || registers.length === 0) return [];

  const registerIds = registers.map((r) => r.id);

  // Last closed shift per register (baseline balance)
  const { data: shifts, error: shError } = await supabaseAdmin
    .from("cash_register_shifts")
    .select("cash_register_id, left_in_cash, closed_at")
    .in("cash_register_id", registerIds)
    .eq("status", "closed")
    .order("closed_at", { ascending: false });
  if (shError) throw shError;

  const lastShiftInfo: Record<
    string,
    { leftInCash: number; closedAt: string | null }
  > = {};
  for (const s of shifts || []) {
    if (!(s.cash_register_id in lastShiftInfo)) {
      lastShiftInfo[s.cash_register_id] = {
        leftInCash: s.left_in_cash ?? 0,
        closedAt: s.closed_at,
      };
    }
  }

  // Cobros en efectivo
  const { data: cobros, error: cobrosErr } = await supabaseAdmin
    .from("customer_payment_methods")
    .select(
      "cash_register_id, amount, created_at, payment_method:payment_methods(type), customer_payment:customer_payments(status)",
    )
    .in("cash_register_id", registerIds)
    .not("cash_register_id", "is", null);
  if (cobrosErr) throw cobrosErr;

  // Supplier payments from registers
  const { data: supplierPMs, error: spErr } = await supabaseAdmin
    .from("supplier_payment_methods")
    .select(
      "cash_register_id, amount, created_at, supplier_payment:supplier_payments(status)",
    )
    .in("cash_register_id", registerIds)
    .not("cash_register_id", "is", null);
  if (spErr) throw spErr;

  // Cash register movements (manual, deposits to safe, transfers)
  const { data: allShifts, error: allShiftsErr } = await supabaseAdmin
    .from("cash_register_shifts")
    .select("id, cash_register_id")
    .in("cash_register_id", registerIds);
  if (allShiftsErr) throw allShiftsErr;

  const shiftToRegister = new Map(
    (allShifts || []).map((s) => [s.id, s.cash_register_id]),
  );
  const shiftIds = (allShifts || []).map((s) => s.id);

  let crMovements: {
    shift_id: string;
    type: string;
    amount: number;
    created_at: string;
  }[] = [];
  if (shiftIds.length > 0) {
    const { data: mvData, error: mvErr } = await supabaseAdmin
      .from("cash_register_movements")
      .select("shift_id, type, amount, created_at")
      .in("shift_id", shiftIds);
    if (mvErr) throw mvErr;
    crMovements = mvData || [];
  }

  // Calculate: left_in_cash + activity after last close
  const balances: Record<string, number> = {};
  for (const r of registers) {
    const info = lastShiftInfo[r.id];
    let balance = info?.leftInCash ?? 0;
    const closedAt = info?.closedAt;

    for (const c of cobros || []) {
      if (c.cash_register_id !== r.id) continue;
      const pm = c.payment_method as unknown as { type: string } | null;
      if (pm?.type !== "EFECTIVO") continue;
      const cp = c.customer_payment as unknown as { status: string } | null;
      if (cp?.status === "cancelled") continue;
      if (!closedAt || new Date(c.created_at!) > new Date(closedAt))
        balance += c.amount;
    }

    for (const sp of supplierPMs || []) {
      if (sp.cash_register_id !== r.id) continue;
      const p = sp.supplier_payment as unknown as { status: string } | null;
      if (p?.status === "cancelled") continue;
      if (!closedAt || new Date(sp.created_at!) > new Date(closedAt))
        balance -= sp.amount;
    }

    for (const m of crMovements) {
      if (shiftToRegister.get(m.shift_id) !== r.id) continue;
      if (!closedAt || new Date(m.created_at) > new Date(closedAt)) {
        balance += m.type === "cash_in" ? m.amount : -m.amount;
      }
    }

    balances[r.id] = balance;
  }

  return registers.map((r) => {
    const loc = r.location as unknown as { name: string } | null;
    return {
      id: r.id,
      name: r.name,
      description: loc?.name ?? "Sin ubicación",
      balance: balances[r.id] ?? 0,
      currency: "ARS",
      type: "cash" as const,
    };
  });
}

// ── Cash registers: detail ─────────────────────────────────────────

async function fetchCashRegisterDetail(
  registerId: string,
): Promise<TreasuryAccountDetail | null> {
  const { data: register, error: regError } = await supabaseAdmin
    .from("cash_registers")
    .select("id, name, location:locations(name)")
    .eq("id", registerId)
    .single();
  if (regError) return null;

  // Last closed shift (balance baseline)
  const { data: lastShift } = await supabaseAdmin
    .from("cash_register_shifts")
    .select("left_in_cash, closed_at")
    .eq("cash_register_id", registerId)
    .eq("status", "closed")
    .order("closed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Cobros en efectivo
  const { data: cobros, error: cobrosError } = await supabaseAdmin
    .from("customer_payment_methods")
    .select(
      "id, customer_payment_id, amount, method_name, reference, created_at, payment_method:payment_methods(type), customer_payment:customer_payments(payment_number, payment_date, status)",
    )
    .eq("cash_register_id", registerId);
  if (cobrosError) throw cobrosError;

  // Supplier payments
  const { data: supplierPMs, error: spError } = await supabaseAdmin
    .from("supplier_payment_methods")
    .select(
      "id, payment_id, amount, method_name, reference, created_at, supplier_payment:supplier_payments(payment_number, payment_date, status, supplier:suppliers(name))",
    )
    .eq("cash_register_id", registerId);
  if (spError) throw spError;

  // Cash register movements (via shifts)
  const { data: allShifts, error: shiftsErr } = await supabaseAdmin
    .from("cash_register_shifts")
    .select("id")
    .eq("cash_register_id", registerId);
  if (shiftsErr) throw shiftsErr;

  const shiftIds = (allShifts || []).map((s) => s.id);

  let cashMvs: TreasuryMovement[] = [];
  if (shiftIds.length > 0) {
    const { data: crMovements, error: crError } = await supabaseAdmin
      .from("cash_register_movements")
      .select("id, shift_id, type, amount, notes, reference, created_at")
      .in("shift_id", shiftIds)
      .order("created_at", { ascending: false });
    if (crError) throw crError;

    cashMvs = (crMovements || []).map((m) => {
      return {
        id: m.id,
        date: formatDate(m.created_at),
        dateRaw: m.created_at,
        type: cashRegisterTypeLabel(m.type, m.reference, m.notes),
        reference: m.reference || null,
        description: cleanNotes(m.notes),
        amount: m.amount,
        isPositive: m.type === "cash_in",
        sourceId: null,
        sourceType: null,
      };
    });
  }

  // Filter: only EFECTIVO cobros
  const cobroMvs: TreasuryMovement[] = (cobros || [])
    .filter((c) => {
      const pm = c.payment_method as unknown as { type: string } | null;
      if (pm?.type !== "EFECTIVO") return false;
      const p = c.customer_payment as unknown as { status: string } | null;
      return p?.status !== "cancelled";
    })
    .map((c) => {
      const p = c.customer_payment as unknown as {
        payment_number: string;
        payment_date: string;
      } | null;
      return {
        id: c.id,
        date: formatDate(
          p?.payment_date || c.created_at || new Date().toISOString(),
        ),
        dateRaw: c.created_at || new Date().toISOString(),
        type: "Cobro en efectivo",
        reference: p?.payment_number || c.reference,
        description: c.method_name,
        amount: c.amount,
        isPositive: true,
        sourceId: c.customer_payment_id,
        sourceType: "customer_payment" as const,
      };
    });

  const supplierMvs: TreasuryMovement[] = (supplierPMs || [])
    .filter((sp) => {
      const p = sp.supplier_payment as unknown as { status: string } | null;
      return p?.status !== "cancelled";
    })
    .map((sp) => {
      const p = sp.supplier_payment as unknown as {
        payment_number: string;
        payment_date: string;
        supplier: { name: string } | null;
      } | null;
      return {
        id: sp.id,
        date: formatDate(
          p?.payment_date || sp.created_at || new Date().toISOString(),
        ),
        dateRaw: sp.created_at || new Date().toISOString(),
        type: "Pago a proveedor",
        reference: p?.payment_number || sp.reference,
        description: `Pago a ${p?.supplier?.name || "proveedor"}`,
        amount: sp.amount,
        isPositive: false,
        sourceId: sp.payment_id,
        sourceType: "supplier_payment" as const,
      };
    });

  const movements = [...cobroMvs, ...supplierMvs, ...cashMvs];
  movements.sort(
    (a, b) => new Date(b.dateRaw).getTime() - new Date(a.dateRaw).getTime(),
  );

  // Balance: left_in_cash + activity after last close
  let balance = lastShift?.left_in_cash ?? 0;
  const lastClosedAt = lastShift?.closed_at;

  const isAfterClose = (dateRaw: string) =>
    !lastClosedAt ||
    new Date(dateRaw).getTime() > new Date(lastClosedAt).getTime();

  for (const c of cobroMvs) {
    if (isAfterClose(c.dateRaw)) balance += c.amount;
  }
  for (const sp of supplierMvs) {
    if (isAfterClose(sp.dateRaw)) balance -= sp.amount;
  }
  for (const cm of cashMvs) {
    if (isAfterClose(cm.dateRaw))
      balance += cm.isPositive ? cm.amount : -cm.amount;
  }

  const loc = register.location as unknown as { name: string } | null;

  return {
    id: register.id,
    name: register.name,
    description: loc?.name ?? "Sin ubicación",
    balance,
    currency: "ARS",
    accountType: "cash",
    movements,
  };
}

// ── Safe boxes: balance ────────────────────────────────────────────

async function fetchSafeBoxesWithBalances(
  organizationId: string,
): Promise<TreasuryAccount[]> {
  const { data: boxes, error: boxError } = await supabaseAdmin
    .from("safe_boxes")
    .select("id, name, currency, initial_balance, location:locations(name)")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("name");
  if (boxError) throw boxError;
  if (!boxes || boxes.length === 0) return [];

  const boxIds = boxes.map((b) => b.id);

  const { data: movements, error: mvError } = await supabaseAdmin
    .from("safe_box_movements")
    .select("safe_box_id, type, amount")
    .in("safe_box_id", boxIds);
  if (mvError) throw mvError;

  const balances: Record<string, number> = {};
  for (const b of boxes) balances[b.id] = b.initial_balance;
  for (const m of movements || []) {
    balances[m.safe_box_id] += m.type === "deposit" ? m.amount : -m.amount;
  }

  return boxes.map((b) => {
    const loc = b.location as unknown as { name: string } | null;
    return {
      id: b.id,
      name: b.name,
      description: loc?.name ?? "Sin ubicación",
      balance: balances[b.id] ?? 0,
      currency: b.currency,
      type: "safe" as const,
    };
  });
}

// ── Safe boxes: detail ─────────────────────────────────────────────

async function fetchSafeBoxDetail(
  safeBoxId: string,
): Promise<TreasuryAccountDetail | null> {
  const { data: box, error: boxError } = await supabaseAdmin
    .from("safe_boxes")
    .select("id, name, currency, initial_balance, location:locations(name)")
    .eq("id", safeBoxId)
    .single();
  if (boxError) return null;

  const { data: movements, error: mvError } = await supabaseAdmin
    .from("safe_box_movements")
    .select("id, type, amount, notes, reference, source_type, source_id, created_at")
    .eq("safe_box_id", safeBoxId)
    .order("created_at", { ascending: false });
  if (mvError) throw mvError;

  let balance = box.initial_balance;
  for (const m of movements || []) {
    balance += m.type === "deposit" ? m.amount : -m.amount;
  }

  const mappedMovements: TreasuryMovement[] = (movements || []).map((m) => ({
    id: m.id,
    date: formatDate(m.created_at),
    dateRaw: m.created_at,
    type: safeBoxTypeLabel(m.source_type, m.type),
    reference: m.reference || null,
    description: cleanNotes(m.notes),
    amount: m.amount,
    isPositive: m.type === "deposit",
    sourceId: null,
    sourceType: null,
  }));

  mappedMovements.sort(
    (a, b) => new Date(b.dateRaw).getTime() - new Date(a.dateRaw).getTime(),
  );

  const loc = box.location as unknown as { name: string } | null;

  return {
    id: box.id,
    name: box.name,
    description: loc?.name ?? "Sin ubicación",
    balance,
    currency: box.currency,
    accountType: "safe",
    movements: mappedMovements,
  };
}

// ── All movements (unified view for /movimientos) ──────────────────

export async function getCachedAllTreasuryMovements(
  organizationId: string,
): Promise<UnifiedTreasuryMovement[]> {
  "use cache";
  cacheTag("treasury");
  cacheLife("minutes");

  const [bankMvs, safeMvs, cashMvs, cobroBank, supplierEgresos, cobroCash] =
    await Promise.all([
      fetchAllBankMovements(organizationId),
      fetchAllSafeBoxMovements(organizationId),
      fetchAllCashRegisterMovements(organizationId),
      fetchAllBankCobros(organizationId),
      fetchAllSupplierEgresos(organizationId),
      fetchAllCashCobros(organizationId),
    ]);

  const all = [
    ...bankMvs,
    ...safeMvs,
    ...cashMvs,
    ...cobroBank,
    ...supplierEgresos,
    ...cobroCash,
  ];
  all.sort(
    (a, b) => new Date(b.dateRaw).getTime() - new Date(a.dateRaw).getTime(),
  );
  return all.slice(0, 500);
}

// ── Unified: bank account movements ────────────────────────────────

async function fetchAllBankMovements(
  organizationId: string,
): Promise<UnifiedTreasuryMovement[]> {
  const { data: accounts, error: accErr } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, account_name")
    .eq("organization_id", organizationId);
  if (accErr) throw accErr;
  if (!accounts || accounts.length === 0) return [];

  const accountMap = new Map(accounts.map((a) => [a.id, a.account_name]));

  const { data: movements, error: mvErr } = await supabaseAdmin
    .from("bank_account_movements")
    .select(
      "id, bank_account_id, type, amount, description, reference, notes, movement_date, source_type, created_at",
    )
    .in(
      "bank_account_id",
      accounts.map((a) => a.id),
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (mvErr) throw mvErr;

  const typeLabels: Record<string, string> = {
    deposit: "Depósito",
    withdrawal: "Retiro",
    transfer_in: "Transferencia entrada",
    transfer_out: "Transferencia salida",
  };

  return (movements || []).map((m) => {
    const isTransfer = m.type === "transfer_in" || m.type === "transfer_out";
    return {
      id: m.id,
      date: formatDate(m.movement_date),
      dateRaw: m.created_at,
      account: accountMap.get(m.bank_account_id) || "Cuenta desconocida",
      accountType: "bank_account" as const,
      accountId: m.bank_account_id,
      type: typeLabels[m.type] || m.type,
      category: (isTransfer
        ? "transferencia"
        : "movimiento_manual") as TreasuryCategory,
      reference: m.reference,
      description: cleanNotes(m.description || m.notes),
      amount: m.amount,
      isPositive: m.type === "deposit" || m.type === "transfer_in",
      editable: m.source_type === "manual",
    };
  });
}

// ── Unified: safe box movements ────────────────────────────────────

async function fetchAllSafeBoxMovements(
  organizationId: string,
): Promise<UnifiedTreasuryMovement[]> {
  const { data: boxes, error: boxErr } = await supabaseAdmin
    .from("safe_boxes")
    .select("id, name")
    .eq("organization_id", organizationId);
  if (boxErr) throw boxErr;
  if (!boxes || boxes.length === 0) return [];

  const boxMap = new Map(boxes.map((b) => [b.id, b.name]));

  const { data: movements, error: mvErr } = await supabaseAdmin
    .from("safe_box_movements")
    .select("id, safe_box_id, type, amount, notes, reference, source_type, created_at")
    .in(
      "safe_box_id",
      boxes.map((b) => b.id),
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (mvErr) throw mvErr;

  return (movements || []).map((m) => {
    const st = m.source_type;
    let category: TreasuryCategory;
    if (st === "shift_deposit" || st === "shift_close")
      category = "deposito_caja_fuerte";
    else if (st === "transfer") category = "transferencia";
    else category = "movimiento_manual";

    return {
      id: m.id,
      date: formatDate(m.created_at),
      dateRaw: m.created_at,
      account: boxMap.get(m.safe_box_id) || "Caja fuerte desconocida",
      accountType: "safe_box" as const,
      accountId: m.safe_box_id,
      type: safeBoxTypeLabel(m.source_type, m.type),
      category,
      reference: m.reference || null,
      description: cleanNotes(m.notes),
      amount: m.amount,
      isPositive: m.type === "deposit",
      editable: m.source_type === "manual",
    };
  });
}

// ── Unified: cash register movements ───────────────────────────────

async function fetchAllCashRegisterMovements(
  organizationId: string,
): Promise<UnifiedTreasuryMovement[]> {
  const { data: registers, error: regErr } = await supabaseAdmin
    .from("cash_registers")
    .select("id, name")
    .eq("organization_id", organizationId);
  if (regErr) throw regErr;
  if (!registers || registers.length === 0) return [];

  const registerMap = new Map(registers.map((r) => [r.id, r.name]));

  const { data: shifts, error: shErr } = await supabaseAdmin
    .from("cash_register_shifts")
    .select("id, cash_register_id")
    .in(
      "cash_register_id",
      registers.map((r) => r.id),
    );
  if (shErr) throw shErr;

  const shiftToRegister = new Map(
    (shifts || []).map((s) => [s.id, s.cash_register_id]),
  );
  const shiftIds = (shifts || []).map((s) => s.id);
  if (shiftIds.length === 0) return [];

  const { data: movements, error: mvErr } = await supabaseAdmin
    .from("cash_register_movements")
    .select("id, shift_id, type, amount, notes, reference, created_at")
    .in("shift_id", shiftIds)
    .order("created_at", { ascending: false })
    .limit(500);
  if (mvErr) throw mvErr;

  return (movements || []).map((m) => {
    const registerId = shiftToRegister.get(m.shift_id) || "";
    return {
      id: m.id,
      date: formatDate(m.created_at),
      dateRaw: m.created_at,
      account: registerMap.get(registerId) || "Caja desconocida",
      accountType: "cash_register" as const,
      accountId: registerId,
      type: cashRegisterTypeLabel(m.type, m.reference, m.notes),
      category: cashRegisterCategory(m.type, m.reference, m.notes),
      reference: m.reference || null,
      description: cleanNotes(m.notes),
      amount: m.amount,
      isPositive: m.type === "cash_in",
      editable: false,
    };
  });
}

// ── Unified: customer cobros → bank accounts ───────────────────────

async function fetchAllBankCobros(
  organizationId: string,
): Promise<UnifiedTreasuryMovement[]> {
  const { data: accounts, error: accErr } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, account_name")
    .eq("organization_id", organizationId);
  if (accErr) throw accErr;
  if (!accounts || accounts.length === 0) return [];

  const accountMap = new Map(accounts.map((a) => [a.id, a.account_name]));

  const { data: cobros, error: cobrosErr } = await supabaseAdmin
    .from("customer_payment_methods")
    .select(
      "id, bank_account_id, amount, method_name, reference, created_at, customer_payment:customer_payments(payment_number, payment_date, status)",
    )
    .in(
      "bank_account_id",
      accounts.map((a) => a.id),
    )
    .not("bank_account_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (cobrosErr) throw cobrosErr;

  return (cobros || [])
    .filter((c) => {
      const p = c.customer_payment as unknown as { status: string } | null;
      return p?.status !== "cancelled";
    })
    .map((c) => {
      const p = c.customer_payment as unknown as {
        payment_number: string;
        payment_date: string;
      } | null;
      return {
        id: c.id,
        date: formatDate(p?.payment_date || c.created_at),
        dateRaw: c.created_at,
        account: accountMap.get(c.bank_account_id!) || "Cuenta desconocida",
        accountType: "bank_account" as const,
        accountId: c.bank_account_id!,
        type: "Cobro a cliente",
        category: "cobro_cliente" as const,
        reference: p?.payment_number || c.reference,
        description: c.method_name,
        amount: c.amount,
        isPositive: true,
        editable: false,
      };
    });
}

// ── Unified: customer cobros → cash registers ──────────────────────

async function fetchAllCashCobros(
  organizationId: string,
): Promise<UnifiedTreasuryMovement[]> {
  const { data: registers, error: regErr } = await supabaseAdmin
    .from("cash_registers")
    .select("id, name")
    .eq("organization_id", organizationId);
  if (regErr) throw regErr;
  if (!registers || registers.length === 0) return [];

  const registerMap = new Map(registers.map((r) => [r.id, r.name]));

  const { data: cobros, error: cobrosErr } = await supabaseAdmin
    .from("customer_payment_methods")
    .select(
      "id, cash_register_id, amount, method_name, reference, created_at, payment_method:payment_methods(type), customer_payment:customer_payments(payment_number, payment_date, status)",
    )
    .in(
      "cash_register_id",
      registers.map((r) => r.id),
    )
    .not("cash_register_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (cobrosErr) throw cobrosErr;

  return (cobros || [])
    .filter((c) => {
      const pm = c.payment_method as unknown as { type: string } | null;
      if (pm?.type !== "EFECTIVO") return false;
      const p = c.customer_payment as unknown as { status: string } | null;
      return p?.status !== "cancelled";
    })
    .map((c) => {
      const p = c.customer_payment as unknown as {
        payment_number: string;
        payment_date: string;
      } | null;
      return {
        id: c.id,
        date: formatDate(
          p?.payment_date || c.created_at || new Date().toISOString(),
        ),
        dateRaw: c.created_at || new Date().toISOString(),
        account: registerMap.get(c.cash_register_id!) || "Caja desconocida",
        accountType: "cash_register" as const,
        accountId: c.cash_register_id!,
        type: "Cobro en efectivo",
        category: "cobro_cliente" as const,
        reference: p?.payment_number || c.reference,
        description: c.method_name,
        amount: c.amount,
        isPositive: true,
        editable: false,
      };
    });
}

// ── Unified: supplier payment egresos ──────────────────────────────

async function fetchAllSupplierEgresos(
  organizationId: string,
): Promise<UnifiedTreasuryMovement[]> {
  const [
    { data: accounts, error: accErr },
    { data: registers, error: regErr },
  ] = await Promise.all([
    supabaseAdmin
      .from("bank_accounts")
      .select("id, account_name")
      .eq("organization_id", organizationId),
    supabaseAdmin
      .from("cash_registers")
      .select("id, name")
      .eq("organization_id", organizationId),
  ]);
  if (accErr) throw accErr;
  if (regErr) throw regErr;

  const accountMap = new Map(
    (accounts || []).map((a) => [a.id, a.account_name]),
  );
  const registerMap = new Map((registers || []).map((r) => [r.id, r.name]));

  // Try optimized query first, fallback to simple query
  const { data: optimized, error: egErr } = await supabaseAdmin
    .from("supplier_payment_methods")
    .select(
      "id, bank_account_id, cash_register_id, amount, method_name, reference, created_at, supplier_payment:supplier_payments!inner(payment_number, payment_date, status, organization_id, supplier:suppliers(name))",
    )
    .eq("supplier_payment:supplier_payments.organization_id", organizationId)
    .eq("supplier_payment:supplier_payments.status", "completed")
    .order("created_at", { ascending: false })
    .limit(500);

  type EgresoRow = NonNullable<typeof optimized>[number];
  let egresos: EgresoRow[] = [];

  if (!egErr) {
    egresos = optimized || [];
  } else {
    // Fallback
    const { data: fallback, error: fallbackErr } = await supabaseAdmin
      .from("supplier_payment_methods")
      .select(
        "id, bank_account_id, cash_register_id, amount, method_name, reference, created_at, supplier_payment:supplier_payments(payment_number, payment_date, status, organization_id, supplier:suppliers(name))",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (fallbackErr) throw fallbackErr;

    egresos = ((fallback || []) as EgresoRow[]).filter((e) => {
      const sp = e.supplier_payment as unknown as {
        status: string;
        organization_id: string;
      } | null;
      return (
        sp?.organization_id === organizationId && sp?.status === "completed"
      );
    });
  }

  return egresos
    .filter((e) => e.bank_account_id || e.cash_register_id)
    .map((e) => {
      const sp = e.supplier_payment as {
        payment_number: string;
        payment_date: string;
        supplier: { name: string } | null;
      } | null;

      const isBankAccount = !!e.bank_account_id;
      const account = isBankAccount
        ? accountMap.get(e.bank_account_id!) || "Cuenta desconocida"
        : registerMap.get(e.cash_register_id!) || "Caja desconocida";
      const accountType = isBankAccount ? "bank_account" : "cash_register";
      const accountId = isBankAccount ? e.bank_account_id! : e.cash_register_id!;

      return {
        id: e.id,
        date: formatDate(
          sp?.payment_date || e.created_at || new Date().toISOString(),
        ),
        dateRaw: e.created_at || new Date().toISOString(),
        account,
        accountType: accountType as "bank_account" | "cash_register",
        accountId,
        type: "Pago a proveedor",
        category: "pago_proveedor" as const,
        reference: sp?.payment_number || e.reference,
        description: `Pago a ${sp?.supplier?.name || "proveedor"}`,
        amount: e.amount,
        isPositive: false,
        editable: false,
      };
    });
}
