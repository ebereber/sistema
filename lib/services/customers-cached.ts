import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Customer } from "./customers";

export interface GetCustomersParams {
  search?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getCachedCustomers(
  organizationId: string,
  params: GetCustomersParams = {},
): Promise<{
  data: Customer[];
  count: number;
  totalPages: number;
}> {
  "use cache";
  cacheTag("customers");
  cacheLife("minutes");

  const { search, active, page = 1, pageSize = 50 } = params;

  let query = supabaseAdmin
    .from("customers")
    .select(
      `
      *,
      assigned_seller:users!assigned_seller_id(id, name)
    `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (search && search.trim()) {
    const searchTerm = search.trim();
    query = query.or(
      `name.ilike.%${searchTerm}%,tax_id.ilike.%${searchTerm}%`,
    );
  }

  if (active !== undefined) {
    query = query.eq("active", active);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: (data || []) as Customer[],
    count: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getCachedCustomerById(
  organizationId: string,
  id: string,
): Promise<Customer | null> {
  "use cache";
  cacheTag("customers", `customer-${id}`);
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("customers")
    .select(
      `
      *,
      assigned_seller:users!assigned_seller_id(id, name),
      price_list:price_lists(id, name, is_automatic, adjustment_type, adjustment_percentage)
    `,
    )
    .eq("organization_id", organizationId)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as unknown as Customer;
}

export async function getCachedCustomerStats(
  organizationId: string,
  customerId: string,
): Promise<{
  totalOrders: number;
  totalSales: number;
  pendingBalance: number;
}> {
  "use cache";
  cacheTag(`customer-${customerId}`, "customers");
  cacheLife("minutes");

  const { count, error } = await supabaseAdmin
    .from("sales")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId);

  if (error) {
    return { totalOrders: 0, totalSales: 0, pendingBalance: 0 };
  }

  const { data: sales } = await supabaseAdmin
    .from("sales")
    .select("total")
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId);

  const totalAmount = sales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;

  return {
    totalOrders: count || 0,
    totalSales: totalAmount,
    pendingBalance: 0,
  };
}

export async function getCachedCustomerRecentSales(
  organizationId: string,
  customerId: string,
  limit: number = 5,
) {
  "use cache";
  cacheTag(`customer-${customerId}`, "customers");
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("sales")
    .select("id, sale_number, created_at, total")
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return data || [];
}
