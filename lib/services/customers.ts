import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";

export type Customer = Tables<"customers"> & {
  assigned_seller?: {
    id: string;
    name: string | null;
  } | null;
  price_list?: {
    id: string;
    name: string;
    is_automatic: boolean | null;
    adjustment_type: string | null;
    adjustment_percentage: number | null;
  } | null;
};

export type CustomerInsert = TablesInsert<"customers">;
export type CustomerUpdate = TablesUpdate<"customers">;

export interface CustomerFilters {
  search?: string;
  active?: boolean;
}

export type Seller = Pick<Tables<"users">, "id" | "name" | "email">;

/**
 * Get all customers with optional filters
 */
export async function getCustomers(
  filters?: CustomerFilters,
): Promise<Customer[]> {
  const supabase = createClient();

  let query = supabase
    .from("customers")
    .select(
      `
      *,
      assigned_seller:users!assigned_seller_id(id, name)
    `,
    )
    .order("name", { ascending: true });

  if (filters?.search && filters.search.trim()) {
    const searchTerm = filters.search.trim();
    query = query.or(`name.ilike.%${searchTerm}%,tax_id.ilike.%${searchTerm}%`);
  }

  if (filters?.active !== undefined) {
    query = query.eq("active", filters.active);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get a customer by ID
 */
export async function getCustomerById(id: string): Promise<Customer> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("customers")
    .select(
      `
      *,
      assigned_seller:users!assigned_seller_id(id, name),
      price_list:price_lists(id, name, is_automatic, adjustment_type, adjustment_percentage)
    `,
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}
/* price_list:price_lists!price_list_id(id, name, is_automatic, adjustment_type, adjustment_percentage) */

/**
 * Create a new customer
 */
export async function createCustomer(
  customer: CustomerInsert,
): Promise<Customer> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("customers")
    .insert(customer)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a customer
 */
/* export async function updateCustomer(
  id: string,
  customer: CustomerUpdate,
): Promise<Customer> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("customers")
    .update({ ...customer, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
} */

// DEPRECATED: migrated to cached/actions
/**
 * Archive a customer (soft delete)
 */
export async function archiveCustomer(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("customers")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

// DEPRECATED: migrated to cached/actions
/**
 * Unarchive a customer (restore)
 */
export async function unarchiveCustomer(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("customers")
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

// DEPRECATED: migrated to cached/actions
/**
 * Delete a customer permanently
 */
export async function deleteCustomer(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) throw error;
}

/**
 * Get sellers for dropdown (users with role SELLER)
 */
export async function getSellers(): Promise<Seller[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("role", "SELLER")
    .eq("active", true)
    .order("name");

  if (error) {
    // Table might not exist or no sellers
    return [];
  }
  return data || [];
}

// DEPRECATED: migrated to cached/actions
/**
 * Get customer sales statistics
 */
export async function getCustomerStats(customerId: string): Promise<{
  totalOrders: number;
  totalSales: number;
  pendingBalance: number;
}> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("sales")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customerId);

  if (error) {
    // Table might not exist yet
    return { totalOrders: 0, totalSales: 0, pendingBalance: 0 };
  }

  // Get total amount
  const { data: sales } = await supabase
    .from("sales")
    .select("total")
    .eq("customer_id", customerId);

  const totalAmount = sales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;

  return {
    totalOrders: count || 0,
    totalSales: totalAmount,
    pendingBalance: 0, // Hardcoded for now, will implement with payments
  };
}

// DEPRECATED: migrated to cached/actions
/**
 * Get recent sales for a customer
 */
export async function getCustomerRecentSales(
  customerId: string,
  limit: number = 5,
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sales")
    .select("id, sale_number, created_at, total")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // Table might not exist yet
    return [];
  }

  return data || [];
}
