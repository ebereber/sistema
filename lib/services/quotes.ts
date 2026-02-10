import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type {
  CartItem,
  CartTotals,
  GlobalDiscount,
  SelectedCustomer,
} from "@/lib/validations/sale";

type Quote = Database["public"]["Tables"]["quotes"]["Row"];

// -------------------------------------------------------------------
// Types for JSONB items stored in the `items` column
// -------------------------------------------------------------------

export interface QuoteItemData {
  productId: string | null;
  name: string;
  sku: string;
  price: number;
  basePrice: number;
  quantity: number;
  taxRate: number;
  discount: { type: "percentage" | "fixed"; value: number } | null;
  imageUrl: string | null;
}

export interface QuoteItemsPayload {
  cartItems: QuoteItemData[];
  globalDiscount: { type: "percentage" | "fixed"; value: number } | null;
}

// -------------------------------------------------------------------
// Input types
// -------------------------------------------------------------------

export interface CreateQuoteInput {
  items: CartItem[];
  customer: SelectedCustomer;
  globalDiscount: GlobalDiscount | null;
  note: string;
  totals: CartTotals;
  locationId?: string | null;
}

export interface GetQuotesFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface GetQuotesResult {
  data: Quote[];
  count: number;
}

// -------------------------------------------------------------------
// Create
// -------------------------------------------------------------------

export async function createQuote(input: CreateQuoteInput): Promise<Quote> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Get organization_id
  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!userData?.organization_id) throw new Error("Usuario sin organización");
  const organizationId = userData.organization_id;

  // Generate sequential quote number via RPC (uses sequences table + pos_number)
  const { data: quoteNumber, error: rpcError } = await supabase.rpc(
    "generate_quote_number",
    { pos_number: 1 },
  );
  if (rpcError) throw rpcError;

  // Build JSONB payload with all cart state needed to reconstruct later
  const payload: QuoteItemsPayload = {
    cartItems: input.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      price: item.price,
      basePrice: item.basePrice,
      quantity: item.quantity,
      taxRate: item.taxRate,
      discount: item.discount
        ? { type: item.discount.type, value: item.discount.value }
        : null,
      imageUrl: item.imageUrl || null,
    })),
    globalDiscount: input.globalDiscount
      ? {
          type: input.globalDiscount.type,
          value: input.globalDiscount.value,
        }
      : null,
  };

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      quote_number: quoteNumber as string,
      customer_id: input.customer.id || null,
      customer_name: input.customer.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: payload as any,
      subtotal: input.totals.subtotal,
      discount: input.totals.itemDiscounts + input.totals.globalDiscount,
      total: input.totals.total,
      notes: input.note || null,
      status: "active",
      created_by: user.id,
      location_id: input.locationId || null,
      organization_id: organizationId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// -------------------------------------------------------------------
// Read (list)
// -------------------------------------------------------------------

// DEPRECATED: migrated to cached — use getCachedQuotes from quotes-cached.ts
export async function getQuotes(
  filters?: GetQuotesFilters,
): Promise<GetQuotesResult> {
  const supabase = createClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("quotes")
    .select("*", { count: "exact" })
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters?.search) {
    query = query.or(
      `customer_name.ilike.%${filters.search}%,quote_number.ilike.%${filters.search}%`,
    );
  }

  if (filters?.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

// -------------------------------------------------------------------
// Read (single)
// -------------------------------------------------------------------

// DEPRECATED: migrated to cached — use getCachedQuoteById from quotes-cached.ts
export async function getQuoteById(id: string): Promise<Quote> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// -------------------------------------------------------------------
// Delete (soft)
// -------------------------------------------------------------------

// DEPRECATED: migrated to actions — use deleteQuoteAction from lib/actions/quotes.ts
export async function deleteQuote(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("quotes")
    .update({ status: "deleted" })
    .eq("id", id);

  if (error) throw error;
}

// -------------------------------------------------------------------
// Helpers for parsing JSONB items
// -------------------------------------------------------------------

/**
 * Parse the JSONB `items` column into typed data.
 * Handles both the new object format and a potential raw array fallback.
 */
export function parseQuoteItems(items: unknown): QuoteItemsPayload {
  if (Array.isArray(items)) {
    return { cartItems: items, globalDiscount: null };
  }
  const parsed = items as QuoteItemsPayload;
  return {
    cartItems: parsed?.cartItems || [],
    globalDiscount: parsed?.globalDiscount || null,
  };
}

/**
 * Get item count from the JSONB column (useful for listing).
 */
export function getQuoteItemsCount(items: unknown): number {
  return parseQuoteItems(items).cartItems.length;
}

/**
 * Build cart-ready data from a stored quote.
 * Used when loading a quote back into the POS cart.
 */
export function getQuoteCartData(quote: Quote) {
  const { cartItems, globalDiscount } = parseQuoteItems(quote.items);

  return {
    items: cartItems.map((item) => ({
      id: crypto.randomUUID(),
      productId: item.productId,
      name: item.name,
      sku: item.sku || "",
      basePrice: item.basePrice || item.price,
      price: item.price,
      cost: null,
      quantity: item.quantity,
      taxRate: item.taxRate,
      discount: item.discount,
      imageUrl: item.imageUrl,
    })),
    globalDiscount,
    customer: {
      id: quote.customer_id,
      name: quote.customer_name || "Consumidor Final",
    },
    note: quote.notes || "",
  };
}
