import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { cacheLife, cacheTag } from "next/cache";
import type {
  GetPurchaseOrdersFilters,
  PurchaseOrderHistoryEntry,
  PurchaseOrderWithDetails,
} from "./purchase-orders";

export async function getCachedPurchaseOrders(
  params: GetPurchaseOrdersFilters = {},
): Promise<{
  data: (PurchaseOrderWithDetails & {
    supplier: { id: string; name: string } | null;
    location: { id: string; name: string } | null;
  })[];
  count: number;
  totalPages: number;
}> {
  "use cache";
  cacheTag("purchase-orders");
  cacheLife("minutes");

  const {
    page = 1,
    pageSize = 20,
    search,
    statuses,
    dateFrom,
    dateTo,
    supplierId,
  } = params;

  let query = supabaseAdmin
    .from("purchase_orders")
    .select("*, supplier:suppliers(id, name), location:locations(id, name)", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  // Default: exclude cancelled unless user explicitly filters by statuses
  if (statuses && statuses.length > 0) {
    query = query.in("status", statuses);
  } else {
    query = query.neq("status", "cancelled");
  }

  /* if (search) {
    query = query.or(
      `order_number.ilike.%${search}%,suppliers.name.ilike.%${search}%`,
    );
  } */
  if (search) {
    query = query.ilike("order_number", `%${search}%`);
  }

  if (dateFrom) {
    query = query.gte("order_date", dateFrom);
  }

  if (dateTo) {
    query = query.lte("order_date", dateTo);
  }

  if (supplierId) {
    query = query.eq("supplier_id", supplierId);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: (data || []) as any[],
    count: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getCachedPurchaseOrderById(
  id: string,
): Promise<PurchaseOrderWithDetails | null> {
  "use cache";
  cacheTag("purchase-orders", `purchase-order-${id}`);
  cacheLife("minutes");

  const { data: order, error } = await supabaseAdmin
    .from("purchase_orders")
    .select("*, supplier:suppliers(id, name), location:locations(id, name)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("purchase_order_items")
    .select("*")
    .eq("purchase_order_id", id)
    .order("created_at");

  if (itemsError) throw itemsError;

  const { data: history, error: historyError } = await supabaseAdmin
    .from("purchase_order_history")
    .select("*, user:users!purchase_order_history_user_fkey(name)")
    .eq("purchase_order_id", id)
    .order("created_at", { ascending: false });

  if (historyError) throw historyError;

  return {
    ...order,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supplier: (order as any).supplier || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    location: (order as any).location || null,
    items: items || [],
    history: (history || []) as PurchaseOrderHistoryEntry[],
  } as unknown as PurchaseOrderWithDetails;
}
