import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { cacheLife, cacheTag } from "next/cache";
import type { Location } from "./locations";
import type { Product } from "./products";
import type {
  GetPurchasesParams,
  Purchase,
  PurchasePaymentAllocation,
} from "./purchases";

export async function getCachedPurchases(
  organizationId: string,
  params: GetPurchasesParams = {},
): Promise<{
  data: Purchase[];
  count: number;
  totalPages: number;
}> {
  "use cache";
  cacheTag("purchases");
  cacheLife("minutes");

  const {
    page = 1,
    pageSize = 20,
    status,
    supplierId,
    dateFrom,
    dateTo,
    search,
  } = params;

  let query = supabaseAdmin
    .from("purchases")
    .select(
      `*, supplier:suppliers(id, name, tax_id), location:locations(id, name)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId);

  if (status) {
    query = query.eq("status", status);
  }

  if (supplierId) {
    query = query.eq("supplier_id", supplierId);
  }

  if (dateFrom) {
    query = query.gte("invoice_date", dateFrom);
  }

  if (dateTo) {
    query = query.lte("invoice_date", dateTo);
  }

  if (search) {
    query = query.or(
      `voucher_number.ilike.%${search}%,purchase_number.ilike.%${search}%`,
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: (data || []) as unknown as Purchase[],
    count: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getCachedPurchaseById(
  organizationId: string,
  id: string,
): Promise<Purchase | null> {
  "use cache";
  cacheTag("purchases", `purchase-${id}`);
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("purchases")
    .select(
      `
      *,
      supplier:suppliers(id, name, tax_id),
      location:locations(id, name),
      items:purchase_items(*)
    `,
    )
    .eq("organization_id", organizationId)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as unknown as Purchase;
}

export async function getCachedPaymentsByPurchaseId(
  purchaseId: string,
): Promise<PurchasePaymentAllocation[]> {
  "use cache";
  cacheTag(`purchase-payments-${purchaseId}`);
  cacheLife("minutes");

  const { data: allocations, error: allocError } = await supabaseAdmin
    .from("supplier_payment_allocations")
    .select("id, amount, created_at, payment_id")
    .eq("purchase_id", purchaseId)
    .order("created_at", { ascending: false });

  if (allocError) throw allocError;
  if (!allocations || allocations.length === 0) return [];

  const paymentIds = allocations.map((a) => a.payment_id);

  const { data: payments, error: payError } = await supabaseAdmin
    .from("supplier_payments")
    .select("id, payment_number, payment_date, status")
    .in("id", paymentIds);

  if (payError) throw payError;

  const { data: methods, error: methodsError } = await supabaseAdmin
    .from("supplier_payment_methods")
    .select("payment_id, method_name")
    .in("payment_id", paymentIds);

  if (methodsError) throw methodsError;

  return allocations.map((allocation) => {
    const payment = payments?.find((p) => p.id === allocation.payment_id);
    const paymentMethods =
      methods
        ?.filter((m) => m.payment_id === allocation.payment_id)
        .map((m) => m.method_name) || [];

    return {
      id: allocation.id,
      amount: Number(allocation.amount),
      created_at: allocation.created_at || "",
      payment_id: allocation.payment_id,
      payment_number: payment?.payment_number || "",
      payment_date: payment?.payment_date || "",
      payment_status: payment?.status || "",
      methods: paymentMethods,
    };
  });
}

export async function getCachedLocations(organizationId: string): Promise<Location[]> {
  "use cache";
  cacheTag("locations");
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("locations")
    .select(
      `
      *,
      points_of_sale:point_of_sale(id, number, name, enabled_for_arca),
      cash_registers(id, name, status, point_of_sale:point_of_sale(id, number, name))
    `,
    )
    .eq("organization_id", organizationId)
    .order("is_main", { ascending: false })
    .order("name");

  if (error) throw error;
  return (data || []) as Location[];
}

export async function getCachedProducts(organizationId: string): Promise<Product[]> {
  "use cache";
  cacheTag("products");
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      `
      *,
      category:categories(id, name)
    `,
    )
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as Product[];
}
