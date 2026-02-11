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
  type: string;
  reference: string | null;
  description: string | null;
  amount: number;
  isPositive: boolean;
}

export interface UnifiedTreasuryMovement {
  id: string;
  date: string;
  dateRaw: string; // ISO string for sorting/filtering
  account: string;
  accountType: "bank_account" | "safe_box" | "cash_register";
  accountId: string;
  type: string;
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

// ── Bank accounts ──────────────────────────────────────────────────

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

  const { data: movements, error: mvError } = await supabaseAdmin
    .from("bank_account_movements")
    .select("bank_account_id, type, amount")
    .in("bank_account_id", accountIds);

  if (mvError) throw mvError;

  // Fetch cobros (customer_payment_methods linked to bank accounts)
  const { data: cobros, error: cobrosError } = await supabaseAdmin
    .from("customer_payment_methods")
    .select("bank_account_id, amount, customer_payment:customer_payments(status)")
    .in("bank_account_id", accountIds)
    .not("bank_account_id", "is", null);

  if (cobrosError) throw cobrosError;

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
  // Add cobros to balances (only completed payments)
  for (const c of cobros || []) {
    if (!c.bank_account_id) continue;
    const payment = c.customer_payment as unknown as { status: string } | null;
    if (payment?.status !== "cancelled") {
      balances[c.bank_account_id] = (balances[c.bank_account_id] ?? 0) + c.amount;
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

async function fetchBankAccountDetail(
  accountId: string,
): Promise<TreasuryAccountDetail | null> {
  const { data: account, error: accError } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, bank_name, account_name, currency, initial_balance")
    .eq("id", accountId)
    .single();

  if (accError) return null;

  const { data: movements, error: mvError } = await supabaseAdmin
    .from("bank_account_movements")
    .select("id, type, amount, description, reference, movement_date, source_type")
    .eq("bank_account_id", accountId)
    .order("movement_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (mvError) throw mvError;

  let balance = account.initial_balance;
  for (const m of movements || []) {
    if (m.type === "deposit" || m.type === "transfer_in") {
      balance += m.amount;
    } else {
      balance -= m.amount;
    }
  }

  // Also fetch customer_payment_methods linked to this bank account
  const { data: cobros, error: cobrosError } = await supabaseAdmin
    .from("customer_payment_methods")
    .select("id, amount, method_name, reference, created_at, customer_payment:customer_payments(payment_number, payment_date, status)")
    .eq("bank_account_id", accountId);

  if (cobrosError) throw cobrosError;

  // Add cobros to balance (only completed payments)
  for (const c of cobros || []) {
    const payment = c.customer_payment as unknown as { payment_number: string; payment_date: string; status: string } | null;
    if (payment?.status !== "cancelled") {
      balance += c.amount;
    }
  }

  const typeLabels: Record<string, string> = {
    deposit: "Depósito",
    withdrawal: "Retiro",
    transfer_in: "Transferencia entrante",
    transfer_out: "Transferencia saliente",
  };

  const bankMovements: TreasuryMovement[] = (movements || []).map((m) => ({
    id: m.id,
    date: formatDate(m.movement_date),
    type: typeLabels[m.type] || m.type,
    reference: m.reference,
    description: m.description,
    amount: m.amount,
    isPositive: m.type === "deposit" || m.type === "transfer_in",
  }));

  // Add cobros as deposit movements
  const cobroMovements: TreasuryMovement[] = (cobros || [])
    .filter((c) => {
      const payment = c.customer_payment as unknown as { status: string } | null;
      return payment?.status !== "cancelled";
    })
    .map((c) => {
      const payment = c.customer_payment as unknown as { payment_number: string; payment_date: string } | null;
      return {
        id: c.id,
        date: formatDate(payment?.payment_date || c.created_at),
        type: "Cobro por transferencia",
        reference: payment?.payment_number || c.reference,
        description: c.method_name,
        amount: c.amount,
        isPositive: true,
      };
    });

  // Merge and sort by date descending
  const allMovements = [...bankMovements, ...cobroMovements];

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

// ── Cash registers ─────────────────────────────────────────────────

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

  // Get last closed shift per register for left_in_cash
  const { data: shifts, error: shError } = await supabaseAdmin
    .from("cash_register_shifts")
    .select("cash_register_id, left_in_cash, closed_at")
    .in("cash_register_id", registerIds)
    .eq("status", "closed")
    .order("closed_at", { ascending: false });

  if (shError) throw shError;

  // Take the most recent closed shift per register
  const latestShift: Record<string, number> = {};
  for (const s of shifts || []) {
    if (!(s.cash_register_id in latestShift)) {
      latestShift[s.cash_register_id] = s.left_in_cash ?? 0;
    }
  }

  return registers.map((r) => {
    const loc = r.location as unknown as { name: string } | null;
    return {
      id: r.id,
      name: r.name,
      description: loc?.name ?? "Sin ubicación",
      balance: latestShift[r.id] ?? 0,
      currency: "ARS",
      type: "cash" as const,
    };
  });
}

async function fetchCashRegisterDetail(
  registerId: string,
): Promise<TreasuryAccountDetail | null> {
  const { data: register, error: regError } = await supabaseAdmin
    .from("cash_registers")
    .select("id, name, location:locations(name)")
    .eq("id", registerId)
    .single();

  if (regError) return null;

  // Get last closed shift for balance
  const { data: lastShift } = await supabaseAdmin
    .from("cash_register_shifts")
    .select("left_in_cash")
    .eq("cash_register_id", registerId)
    .eq("status", "closed")
    .order("closed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get recent closed shifts as movements
  const { data: shifts, error: shError } = await supabaseAdmin
    .from("cash_register_shifts")
    .select(
      "id, opening_amount, left_in_cash, counted_amount, opened_at, closed_at, status",
    )
    .eq("cash_register_id", registerId)
    .eq("status", "closed")
    .order("closed_at", { ascending: false })
    .limit(50);

  if (shError) throw shError;

  const loc = register.location as unknown as { name: string } | null;

  const movements: TreasuryMovement[] = (shifts || []).map((s) => ({
    id: s.id,
    date: formatDate(s.closed_at || s.opened_at),
    type: "Cierre de turno",
    reference: null,
    description: `Contado: $${(s.counted_amount ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })} · Dejado: $${(s.left_in_cash ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
    amount: s.left_in_cash ?? 0,
    isPositive: true,
  }));

  return {
    id: register.id,
    name: register.name,
    description: loc?.name ?? "Sin ubicación",
    balance: lastShift?.left_in_cash ?? 0,
    currency: "ARS",
    accountType: "cash",
    movements,
  };
}

// ── Safe boxes ─────────────────────────────────────────────────────

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
  for (const b of boxes) {
    balances[b.id] = b.initial_balance;
  }
  for (const m of movements || []) {
    if (m.type === "deposit") {
      balances[m.safe_box_id] += m.amount;
    } else {
      balances[m.safe_box_id] -= m.amount;
    }
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
    .select("id, type, amount, notes, source_type, source_id, created_at")
    .eq("safe_box_id", safeBoxId)
    .order("created_at", { ascending: false });

  if (mvError) throw mvError;

  let balance = box.initial_balance;
  for (const m of movements || []) {
    if (m.type === "deposit") {
      balance += m.amount;
    } else {
      balance -= m.amount;
    }
  }

  const typeLabels: Record<string, string> = {
    deposit: "Depósito",
    withdrawal: "Retiro",
  };

  const sourceLabels: Record<string, string> = {
    shift_deposit: "Depósito desde turno",
    manual: "Movimiento manual",
  };

  const loc = box.location as unknown as { name: string } | null;

  return {
    id: box.id,
    name: box.name,
    description: loc?.name ?? "Sin ubicación",
    balance,
    currency: box.currency,
    accountType: "safe",
    movements: (movements || []).map((m) => ({
      id: m.id,
      date: formatDate(m.created_at),
      type: sourceLabels[m.source_type || ""] || typeLabels[m.type] || m.type,
      reference: null,
      description: m.notes,
      amount: m.amount,
      isPositive: m.type === "deposit",
    })),
  };
}

// ── All movements (unified) ────────────────────────────────────────

export async function getCachedAllTreasuryMovements(
  organizationId: string,
): Promise<UnifiedTreasuryMovement[]> {
  "use cache";
  cacheTag("treasury");
  cacheLife("minutes");

  const [bankMovements, safeMovements, cashMovements, cobroMovements] = await Promise.all([
    fetchAllBankMovements(organizationId),
    fetchAllSafeBoxMovements(organizationId),
    fetchAllCashRegisterMovements(organizationId),
    fetchAllPaymentMethodCobros(organizationId),
  ]);

  const all = [...bankMovements, ...safeMovements, ...cashMovements, ...cobroMovements];

  // Sort by date descending
  all.sort(
    (a, b) => new Date(b.dateRaw).getTime() - new Date(a.dateRaw).getTime(),
  );

  // Limit to 500
  return all.slice(0, 500);
}

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
  const accountIds = accounts.map((a) => a.id);

  const { data: movements, error: mvErr } = await supabaseAdmin
    .from("bank_account_movements")
    .select("id, bank_account_id, type, amount, description, reference, notes, movement_date, source_type")
    .in("bank_account_id", accountIds)
    .order("movement_date", { ascending: false })
    .limit(500);

  if (mvErr) throw mvErr;

  const bankTypeLabels: Record<string, string> = {
    deposit: "Depósito",
    withdrawal: "Retiro",
    transfer_in: "Transferencia entrada",
    transfer_out: "Transferencia salida",
  };

  return (movements || []).map((m) => ({
    id: m.id,
    date: formatDate(m.movement_date),
    dateRaw: m.movement_date,
    account: accountMap.get(m.bank_account_id) || "Cuenta desconocida",
    accountType: "bank_account" as const,
    accountId: m.bank_account_id,
    type: bankTypeLabels[m.type] || m.type,
    reference: m.reference,
    description: m.description || m.notes,
    amount: m.amount,
    isPositive: m.type === "deposit" || m.type === "transfer_in",
    editable: m.source_type === "manual",
  }));
}

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
  const boxIds = boxes.map((b) => b.id);

  const { data: movements, error: mvErr } = await supabaseAdmin
    .from("safe_box_movements")
    .select("id, safe_box_id, type, amount, notes, source_type, created_at")
    .in("safe_box_id", boxIds)
    .order("created_at", { ascending: false })
    .limit(500);

  if (mvErr) throw mvErr;

  return (movements || []).map((m) => {
    let typeLabel: string;
    if (m.source_type === "shift_deposit") {
      typeLabel = "Depósito desde turno";
    } else if (m.source_type === "shift_close") {
      typeLabel = "Cierre de turno";
    } else if (m.source_type === "transfer") {
      typeLabel = m.type === "deposit" ? "Transferencia entrada" : "Transferencia salida";
    } else if (m.source_type === "manual") {
      typeLabel = m.type === "deposit" ? "Depósito manual" : "Retiro manual";
    } else {
      typeLabel = m.type === "deposit" ? "Depósito" : "Retiro";
    }

    return {
      id: m.id,
      date: formatDate(m.created_at),
      dateRaw: m.created_at,
      account: boxMap.get(m.safe_box_id) || "Caja fuerte desconocida",
      accountType: "safe_box" as const,
      accountId: m.safe_box_id,
      type: typeLabel,
      reference: null,
      description: m.notes,
      amount: m.amount,
      isPositive: m.type === "deposit",
      editable: m.source_type === "manual",
    };
  });
}

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
  const registerIds = registers.map((r) => r.id);

  // Get all shifts for these registers to map shift_id → register_id
  const { data: shifts, error: shErr } = await supabaseAdmin
    .from("cash_register_shifts")
    .select("id, cash_register_id")
    .in("cash_register_id", registerIds);

  if (shErr) throw shErr;

  const shiftToRegister = new Map(
    (shifts || []).map((s) => [s.id, s.cash_register_id]),
  );
  const shiftIds = (shifts || []).map((s) => s.id);

  if (shiftIds.length === 0) return [];

  const { data: movements, error: mvErr } = await supabaseAdmin
    .from("cash_register_movements")
    .select("id, shift_id, type, amount, notes, created_at")
    .in("shift_id", shiftIds)
    .order("created_at", { ascending: false })
    .limit(500);

  if (mvErr) throw mvErr;

  return (movements || []).map((m) => {
    const registerId = shiftToRegister.get(m.shift_id) || "";
    const isSafeDeposit =
      m.type === "cash_out" &&
      m.notes?.toLowerCase().includes("caja fuerte");

    let typeLabel: string;
    if (m.type === "cash_in") {
      typeLabel = "Ingreso efectivo";
    } else if (isSafeDeposit) {
      typeLabel = "Depósito en caja fuerte";
    } else {
      typeLabel = "Retiro efectivo";
    }

    return {
      id: m.id,
      date: formatDate(m.created_at),
      dateRaw: m.created_at,
      account: registerMap.get(registerId) || "Caja desconocida",
      accountType: "cash_register" as const,
      accountId: registerId,
      type: typeLabel,
      reference: null,
      description: m.notes,
      amount: m.amount,
      isPositive: m.type === "cash_in",
      editable: false,
    };
  });
}

// ── Payment method cobros (customer_payment_methods with bank_account_id) ──

async function fetchAllPaymentMethodCobros(
  organizationId: string,
): Promise<UnifiedTreasuryMovement[]> {
  // Get bank accounts for this org to map names
  const { data: accounts, error: accErr } = await supabaseAdmin
    .from("bank_accounts")
    .select("id, account_name")
    .eq("organization_id", organizationId);

  if (accErr) throw accErr;
  if (!accounts || accounts.length === 0) return [];

  const accountMap = new Map(accounts.map((a) => [a.id, a.account_name]));
  const accountIds = accounts.map((a) => a.id);

  const { data: cobros, error: cobrosErr } = await supabaseAdmin
    .from("customer_payment_methods")
    .select("id, bank_account_id, amount, method_name, reference, created_at, customer_payment:customer_payments(payment_number, payment_date, status)")
    .in("bank_account_id", accountIds)
    .not("bank_account_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (cobrosErr) throw cobrosErr;

  return (cobros || [])
    .filter((c) => {
      const payment = c.customer_payment as unknown as { status: string } | null;
      return payment?.status !== "cancelled";
    })
    .map((c) => {
      const payment = c.customer_payment as unknown as { payment_number: string; payment_date: string } | null;
      const dateStr = payment?.payment_date || c.created_at;
      return {
        id: c.id,
        date: formatDate(dateStr),
        dateRaw: dateStr,
        account: accountMap.get(c.bank_account_id!) || "Cuenta desconocida",
        accountType: "bank_account" as const,
        accountId: c.bank_account_id!,
        type: "Cobro por transferencia",
        reference: payment?.payment_number || c.reference,
        description: c.method_name,
        amount: c.amount,
        isPositive: true,
        editable: false,
      };
    });
}

// ── Helpers ────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
