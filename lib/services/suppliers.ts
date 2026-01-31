import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";

export type Supplier = Tables<"suppliers">;
export type SupplierInsert = TablesInsert<"suppliers">;
export type SupplierUpdate = TablesUpdate<"suppliers">;

export interface SupplierFilters {
  search?: string;
  active?: boolean;
}

/**
 * Get all suppliers with optional filters
 */
export async function getSuppliers(
  filters?: SupplierFilters,
): Promise<Supplier[]> {
  const supabase = createClient();

  let query = supabase
    .from("suppliers")
    .select("*")
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
 * Get a supplier by ID
 */
export async function getSupplierById(id: string): Promise<Supplier> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new supplier
 */
export async function createSupplier(
  supplier: SupplierInsert,
): Promise<Supplier> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .insert(supplier)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a supplier
 */
export async function updateSupplier(
  id: string,
  supplier: SupplierUpdate,
): Promise<Supplier> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .update({ ...supplier, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Archive a supplier (soft delete)
 */
export async function archiveSupplier(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("suppliers")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Unarchive a supplier (restore)
 */
export async function unarchiveSupplier(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("suppliers")
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Delete a supplier permanently
 */
export async function deleteSupplier(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("suppliers").delete().eq("id", id);

  if (error) throw error;
}

/**
 * Get supplier purchase statistics
 */
export async function getSupplierStats(supplierId: string): Promise<{
  totalPurchases: number;
  totalAmount: number;
}> {
  const supabase = createClient();

  // For now, return placeholder stats until purchases table is implemented
  const { count, error } = await supabase
    .from("purchases")
    .select("*", { count: "exact", head: true })
    .eq("supplier_id", supplierId);

  if (error) {
    // Table might not exist yet
    return { totalPurchases: 0, totalAmount: 0 };
  }

  // Get total amount
  const { data: purchases } = await supabase
    .from("purchases")
    .select("total")
    .eq("supplier_id", supplierId);

  const totalAmount =
    purchases?.reduce((sum, p) => sum + (p.total || 0), 0) || 0;

  return {
    totalPurchases: count || 0,
    totalAmount,
  };
}

/**
 * Get recent purchases for a supplier
 */
export async function getSupplierRecentPurchases(
  supplierId: string,
  limit: number = 5,
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("purchases")
    .select("id, purchase_number, created_at, total")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // Table might not exist yet
    return [];
  }

  return data || [];
}
