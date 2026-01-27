import { createClient } from "@/lib/supabase/client";
import type {
  CartItem,
  GlobalDiscount,
  SelectedCustomer,
} from "@/lib/validations/sale";

export interface ProductForSale {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  taxRate: number;
  stockQuantity: number;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
}

export interface SearchProductsParams {
  search?: string;
  categoryId?: string;
  limit?: number;
}

/**
 * Search products optimized for POS (only active products visible in sales)
 */
export async function searchProductsForSale(
  params: SearchProductsParams = {},
): Promise<ProductForSale[]> {
  const supabase = createClient();

  const { search, categoryId, limit = 50 } = params;

  let query = supabase
    .from("products")
    .select(
      `
      id,
      name,
      sku,
      barcode,
      price,
      tax_rate,
      stock_quantity,
      image_url,
      category_id,
      category:categories(name)
    `,
    )
    .eq("active", true)
    .in("visibility", ["SALES_AND_PURCHASES", "SALES_ONLY"])
    .order("name", { ascending: true })
    .limit(limit);

  // Search by name, SKU, or barcode
  if (search && search.trim()) {
    const searchTerm = search.trim();
    query = query.or(
      `name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`,
    );
  }

  // Filter by category
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    price: product.price,
    taxRate: product.tax_rate,
    stockQuantity: product.stock_quantity,
    imageUrl: product.image_url,
    categoryId: product.category_id,
    categoryName: (product.category as { name: string } | null)?.name || null,
  }));
}

/**
 * Get adjusted price based on customer's price list
 */
export function getAdjustedPrice(
  basePrice: number,
  adjustmentType: "AUMENTO" | "DESCUENTO" | null | undefined,
  adjustmentPercentage: number | null | undefined,
): number {
  if (!adjustmentType || adjustmentPercentage == null) {
    return basePrice;
  }

  if (adjustmentType === "AUMENTO") {
    return basePrice * (1 + adjustmentPercentage / 100);
  } else {
    return basePrice * (1 - adjustmentPercentage / 100);
  }
}

/**
 * Get product by barcode (for barcode scanner)
 */
export async function getProductByBarcode(
  barcode: string,
): Promise<ProductForSale | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      sku,
      barcode,
      price,
      tax_rate,
      stock_quantity,
      image_url,
      category_id,
      category:categories(name)
    `,
    )
    .eq("barcode", barcode)
    .eq("active", true)
    .in("visibility", ["SALES_AND_PURCHASES", "SALES_ONLY"])
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    sku: data.sku,
    barcode: data.barcode,
    price: data.price,
    taxRate: data.tax_rate,
    stockQuantity: data.stock_quantity,
    imageUrl: data.image_url,
    categoryId: data.category_id,
    categoryName: (data.category as { name: string } | null)?.name || null,
  };
}

/**
 * Get price list adjustment for a customer
 */
export async function getCustomerPriceListAdjustment(
  customerId: string,
): Promise<{
  priceListId: string | null;
  priceListName: string | null;
  adjustmentType: "AUMENTO" | "DESCUENTO" | null;
  adjustmentPercentage: number | null;
} | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("customers")
    .select(
      `
      price_list_id,
      price_list:price_lists!price_list_id(
        id,
        name,
        adjustment_type,
        adjustment_percentage
      )
    `,
    )
    .eq("id", customerId)
    .single();

  if (error) throw error;

  if (!data || !data.price_list) {
    return null;
  }

  const priceList = data.price_list as {
    id: string;
    name: string;
    adjustment_type: string;
    adjustment_percentage: number;
  };

  return {
    priceListId: priceList.id,
    priceListName: priceList.name,
    adjustmentType: priceList.adjustment_type as "AUMENTO" | "DESCUENTO",
    adjustmentPercentage: priceList.adjustment_percentage,
  };
}

// Session storage key for cart data
export const CART_STORAGE_KEY = "pos_cart_data";

export interface CartStorageData {
  items: CartItem[];
  customer: SelectedCustomer;
  globalDiscount: GlobalDiscount | null;
  note?: string;
  saleDate?: string;
  savedAt: string;
}

/**
 * Save cart data to session storage
 */
export function saveCartToStorage(data: CartStorageData): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data));
  }
}

/**
 * Load cart data from session storage
 */
export function loadCartFromStorage(): CartStorageData | null {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Clear cart data from session storage
 */
export function clearCartStorage(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(CART_STORAGE_KEY);
  }
}

// =====================================================
// Sale creation types and functions
// =====================================================

export interface SaleInsert {
  customer_id: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  status: "COMPLETED" | "PENDING" | "CANCELLED";
  voucher_type: string;
  sale_date: string;
}

export interface SaleItemInsert {
  product_id: string | null;
  description: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  total: number;
}

export interface PaymentInsert {
  payment_method_id: string | null;
  method_name: string;
  amount: number;
  reference: string | null;
}

/**
 * Crear venta completa con items y pagos
 */
export async function createSale(
  saleData: SaleInsert,
  items: SaleItemInsert[],
  payments: PaymentInsert[],
  locationId: string,
) {
  const supabase = createClient();
  // 1. Obtener usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  // 2. Generar número de venta
  const { data: saleNumber, error: numberError } = await supabase.rpc(
    "generate_sale_number",
    { location_id_param: locationId },
  );
  if (numberError) throw numberError;

  // 3. Crear venta
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      ...saleData,
      sale_number: saleNumber,
      seller_id: user.id, // ← Usuario actual
      location_id: locationId, // ← Ubicación
      created_by: user.id, // ← Usuario actual
    })
    .select()
    .single();

  if (saleError) throw saleError;

  // 4. Crear items
  const itemsWithSaleId = items.map((item) => ({
    ...item,
    sale_id: sale.id,
  }));

  const { error: itemsError } = await supabase
    .from("sale_items")
    .insert(itemsWithSaleId);

  if (itemsError) throw itemsError;

  // 5. Crear pagos
  if (payments.length > 0) {
    const paymentsWithSaleId = payments.map((payment) => ({
      ...payment,
      sale_id: sale.id,
    }));

    const { error: paymentsError } = await supabase
      .from("payments")
      .insert(paymentsWithSaleId);

    if (paymentsError) throw paymentsError;
  }

  // 6. Descontar stock
  for (const item of items) {
    if (item.product_id) {
      // Solo si es producto real (no ítem personalizado)
      const { error: stockError } = await supabase.rpc("decrease_stock", {
        p_product_id: item.product_id,
        p_location_id: locationId,
        p_quantity: item.quantity,
      });

      if (stockError) {
        console.error("Error descontando stock:", stockError);
        // Podrías hacer rollback o marcar la venta para revisión
      }
    }
  }

  return sale;
}

// =====================================================
// Sale detail types and functions
// =====================================================

export interface SaleWithDetails {
  id: string;
  sale_number: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    tax_id: string | null;
    street_address: string | null;
    city: string | null;
  } | null;
  seller: {
    id: string;
    name: string | null;
  } | null;
  location: {
    id: string;
    name: string;
  } | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  status: "COMPLETED" | "PENDING" | "CANCELLED";
  voucher_type: string;
  sale_date: string;
  created_at: string;
  items: {
    id: string;
    product_id: string | null;
    description: string;
    sku: string | null;
    quantity: number;
    unit_price: number;
    discount: number;
    tax_rate: number;
    total: number;
    product: {
      id: string;
      name: string;
      image_url: string | null;
      cost: number | null;
    } | null;
  }[];
  payments: {
    id: string;
    payment_method_id: string | null;
    method_name: string;
    amount: number;
    reference: string | null;
    payment_date: string;
    payment_method: {
      id: string;
      name: string;
      type: string;
      fee_percentage: number;
      fee_fixed: number;
    } | null;
  }[];
  credit_notes: {
    id: string;
    sale_number: string;
    total: number;
    created_at: string;
  }[];
  related_sale_id: string | null;
}

/**
 * Get sale by ID with all relations
 */
export async function getSaleById(id: string): Promise<SaleWithDetails | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sales")
    .select(
      `
      *,
      customer:customers(id, name, email, phone, tax_id, street_address, city),
      seller:users!sales_seller_id_fkey(id, name),
      location:locations(id, name),
      items:sale_items(
        *,
        product:products(id, name, image_url, cost)
      ),
      payments(
        *,
        payment_method:payment_methods(id, name, type, fee_percentage, fee_fixed)
      ),
      credit_notes:sales!related_sale_id(id, sale_number, total, created_at)
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data as SaleWithDetails;
}

/**
 * Update sale notes
 */
export async function updateSaleNotes(
  id: string,
  notes: string | null,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("sales").update({ notes }).eq("id", id);

  if (error) throw error;
}

// =====================================================
// Sale list types and functions
// =====================================================

export interface SaleListItem {
  id: string;
  sale_number: string;
  sale_date: string;
  status: "COMPLETED" | "PENDING" | "CANCELLED";
  voucher_type: string;
  total: number;
  related_sale_id: string | null; // Si es NC, apunta a la venta original
  customer: {
    id: string;
    name: string;
  } | null;
  seller: {
    id: string;
    name: string | null;
  } | null;
  credit_notes: {
    id: string;
    sale_number: string;
    total: number;
  }[];
}

export interface GetSalesParams {
  search?: string;
  status?: "COMPLETED" | "PENDING" | "CANCELLED";
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  sellerId?: string;
  voucherType?: string;
  page?: number;
  pageSize?: number;
}

export interface GetSalesResult {
  data: SaleListItem[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get sales list with filters and pagination
 */
export async function getSales(
  params: GetSalesParams = {},
): Promise<GetSalesResult> {
  const supabase = createClient();

  const {
    search,
    status,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    sellerId,
    voucherType,
    page = 1,
    pageSize = 20,
  } = params;

  let query = supabase
    .from("sales")
    .select(
      `
      id,
      sale_number,
      sale_date,
      status,
      voucher_type,
      total,
      customer:customers(id, name),
      seller:users!sales_seller_id_fkey(id, name),
       credit_notes:sales(id, sale_number, total)
    `,
      { count: "exact" },
    )
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false });

  // Search filter (sale number)
  if (search) {
    query = query.ilike("sale_number", `%${search}%`);
  }

  // Status filter
  if (status) {
    query = query.eq("status", status);
  }

  // Date from filter
  if (dateFrom) {
    query = query.gte("sale_date", dateFrom);
  }

  // Date to filter
  if (dateTo) {
    query = query.lte("sale_date", dateTo);
  }

  // Min amount filter
  if (minAmount !== undefined) {
    query = query.gte("total", minAmount);
  }

  // Max amount filter
  if (maxAmount !== undefined) {
    query = query.lte("total", maxAmount);
  }

  // Seller filter
  if (sellerId) {
    query = query.eq("seller_id", sellerId);
  }

  // Voucher type filter
  if (voucherType) {
    query = query.eq("voucher_type", voucherType);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  // Map data to handle Supabase relation arrays
  const mappedData: SaleListItem[] = (data || []).map((item) => ({
    id: item.id,
    sale_number: item.sale_number,
    sale_date: item.sale_date,
    status: item.status,
    voucher_type: item.voucher_type,
    total: item.total,
    related_sale_id: item.related_sale_id,
    customer: item.customer as SaleListItem["customer"],
    seller: item.seller as SaleListItem["seller"],
    credit_notes: (item.credit_notes || []) as SaleListItem["credit_notes"],
  }));

  return {
    data: mappedData,
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// =====================================================
// Duplicate sale functions
// =====================================================

export interface DuplicateSaleItem {
  productId: string | null;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  taxRate: number;
  imageUrl: string | null;
}

/**
 * Get sale items for duplicating a sale
 */
export async function getSaleItemsForDuplicate(
  saleId: string,
): Promise<DuplicateSaleItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sale_items")
    .select(
      `
      product_id,
      description,
      sku,
      unit_price,
      quantity,
      tax_rate,
      product:products(image_url)
    `,
    )
    .eq("sale_id", saleId);

  if (error) throw error;

  return (data || []).map((item) => ({
    productId: item.product_id,
    name: item.description,
    sku: item.sku,
    price: item.unit_price,
    quantity: item.quantity,
    taxRate: item.tax_rate,
    imageUrl:
      (item.product as { image_url: string | null } | null)?.image_url || null,
  }));
}
