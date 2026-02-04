import { applyDataScope, type UserScope } from "@/lib/auth/data-scope";
import { createClient } from "@/lib/supabase/client";
import { normalizeRelation } from "@/lib/supabase/types";
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
 * @deprecated Migrated to getCachedAllProductsForPOS in products-cached.ts + client-side filtering
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
    stockQuantity: product.stock_quantity ?? 0,
    imageUrl: product.image_url,
    categoryId: product.category_id,
    categoryName: normalizeRelation(product.category)?.name || null,
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
    stockQuantity: data.stock_quantity ?? 0,
    imageUrl: data.image_url,
    categoryId: data.category_id,
    categoryName: normalizeRelation(data.category)?.name || null,
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

  const priceList = normalizeRelation(data?.price_list);

  if (!data || !priceList) {
    return null;
  }

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
  shift_id: string | null; // Required (not optional) to ensure it's never undefined
  due_date?: string | null;
  amount_paid?: number;
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

  // 5. Crear recibo de cobro (RCB) si hay pagos y cliente
  if (payments.length > 0 && saleData.customer_id) {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid > 0) {
      // Generar número de RCB
      const { data: paymentNumber, error: rcbNumberError } = await supabase.rpc(
        "generate_customer_payment_number",
        { pos_number: 1 },
      );
      if (rcbNumberError) throw rcbNumberError;

      // Crear customer_payment
      const { data: customerPayment, error: rcbError } = await supabase
        .from("customer_payments")
        .insert({
          payment_number: paymentNumber,
          customer_id: saleData.customer_id,
          payment_date: saleData.sale_date,
          total_amount: totalPaid,
          notes: null,
          status: "completed",
          created_by: user.id,
        })
        .select("id")
        .single();
      if (rcbError) throw rcbError;

      // Vincular RCB a la venta
      const { error: allocationError } = await supabase
        .from("customer_payment_allocations")
        .insert({
          customer_payment_id: customerPayment.id,
          sale_id: sale.id,
          amount: totalPaid,
        });
      if (allocationError) throw allocationError;

      // Crear métodos de pago del RCB
      const rcbMethods = payments.map((p) => ({
        customer_payment_id: customerPayment.id,
        payment_method_id: p.payment_method_id,
        method_name: p.method_name,
        amount: p.amount,
        reference: p.reference,
        cash_register_id: null,
      }));

      const { error: rcbMethodsError } = await supabase
        .from("customer_payment_methods")
        .insert(rcbMethods);
      if (rcbMethodsError) throw rcbMethodsError;
    }
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

  // Para NC: ventas donde se aplicó esta NC
  applied_to_sales: {
    id: string;
    amount: number;
    created_at: string;
    applied_to_sale: {
      id: string;
      sale_number: string;
    };
  }[];

  // Para ventas: NC que se usaron como pago
  applied_credit_notes: {
    id: string;
    amount: number;
    created_at: string;
    credit_note: {
      id: string;
      sale_number: string;
    };
  }[];
  // Agregar estos campos al interface SaleWithDetails
  amount_paid: number;
  due_date: string | null;
  customer_payment_receipts: {
    id: string;
    amount: number;
    payment_id: string;
    payment_number: string;
    payment_date: string;
    payment_status: string;
    methods: {
      method_name: string;
      amount: number;
      fee_percentage: number;
      fee_fixed: number;
    }[];
  }[];
}

/**
 * Get sale by ID with all relations
 * @deprecated Migrated to getCachedSaleById in sales-cached.ts
 */
export async function getSaleById(id: string): Promise<SaleWithDetails | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sales")
    .select(
      `
      *,
      amount_paid,
      due_date,
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
      credit_notes:sales!related_sale_id(id, sale_number, total, created_at),
      applied_to_sales:credit_note_applications!credit_note_applications_credit_note_id_fkey(
        id,
        amount,
        created_at,
        applied_to_sale:sales!credit_note_applications_applied_to_sale_id_fkey(id, sale_number)
      ),
      applied_credit_notes:credit_note_applications!credit_note_applications_applied_to_sale_id_fkey(
        id,
        amount,
        created_at,
        credit_note:sales!credit_note_applications_credit_note_id_fkey(id, sale_number)
      )
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

  // Complex join requires manual cast — typed client can't fully infer nested relations
  const sale = data as unknown as SaleWithDetails;
  const { getPaymentsBySaleId } = await import("./customer-payments");
  const receipts = await getPaymentsBySaleId(id);
  sale.customer_payment_receipts = receipts;

  return sale;
}

/**
 * Update sale notes
 * @deprecated Migrated to updateSaleNotesAction in actions/sales.ts
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
  related_sale_id: string | null;
  availableBalance: number | null;
  amount_paid: number; // NUEVO
  due_date: string | null; // NUEVO
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
 * @deprecated Migrated to getCachedSales in sales-cached.ts
 */
export async function getSales(
  params: GetSalesParams = {},
  scope?: UserScope,
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
      amount_paid,
      due_date,
      related_sale_id,
      customer:customers(id, name),
      seller:users!sales_seller_id_fkey(id, name),
      credit_notes:sales(id, sale_number, total)
    `,
      { count: "exact" },
    )
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false });

  // Aplicar visibilidad de datos
  if (scope) {
    query = applyDataScope(query, scope, { userColumn: "seller_id" });
  }

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
  const mappedData = (await Promise.all(
    (data || []).map(async (item) => {
      let availableBalance: number | null = null;

      // Si es NC, calcular saldo disponible
      if (item.voucher_type?.startsWith("NOTA_CREDITO")) {
        const { data: apps } = await supabase
          .from("credit_note_applications")
          .select("amount")
          .eq("credit_note_id", item.id);

        const used = apps?.reduce((sum, a) => sum + Number(a.amount), 0) || 0;
        availableBalance = item.total - used;
      }

      const customer = normalizeRelation(item.customer);
      const seller = normalizeRelation(item.seller);

      return {
        id: item.id,
        sale_number: item.sale_number,
        sale_date: item.sale_date,
        status: item.status as SaleListItem["status"],
        voucher_type: item.voucher_type,
        total: item.total,
        amount_paid: item.amount_paid,
        due_date: item.due_date,
        related_sale_id: item.related_sale_id,
        availableBalance,
        customer: customer as SaleListItem["customer"],
        seller: seller as SaleListItem["seller"],
        credit_notes: (item.credit_notes || []) as SaleListItem["credit_notes"],
      };
    }),
  )) as SaleListItem[];

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
  }));
}

// =====================================================
// Exchange (Cambio) functions
// =====================================================

import type {
  ExchangeData,
  ExchangeItem,
  ExchangeResult,
} from "@/lib/validations/sale";

export interface ExchangeSaleData {
  originalSaleId: string;
  originalSaleNumber: string;
  customerId: string | null;
  customerName: string;
  items: ExchangeItem[];
}

/**
 * Get sale data for creating an exchange
 */
export async function getSaleForExchange(
  saleId: string,
): Promise<ExchangeSaleData | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sales")
    .select(
      `
      id,
      sale_number,
      customer_id,
      customer:customers(id, name),
      items:sale_items(
        id,
        product_id,
        description,
        sku,
        unit_price,
        quantity,
        tax_rate,
        product:products(image_url)
      )
    `,
    )
    .eq("id", saleId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  const customer = normalizeRelation(data.customer);

  return {
    originalSaleId: data.id,
    originalSaleNumber: data.sale_number,
    customerId: data.customer_id,
    customerName: customer?.name || "Consumidor Final",
    items: (data.items || []).map((item) => {
      const product = normalizeRelation(item.product);
      return {
        id: item.id,
        productId: item.product_id,
        name: item.description,
        sku: item.sku,
        price: item.unit_price,
        quantity: item.quantity,
        maxQuantity: item.quantity,
        taxRate: item.tax_rate,
        imageUrl: product?.image_url || null,
      };
    }),
  };
}

export interface CreateExchangeParams {
  exchangeData: ExchangeData;
  itemsToReturn: ExchangeItem[];
  newCartItems: CartItem[];
  payments: PaymentInsert[];
  appliedCreditNotes: Array<{ creditNoteId: string; amount: number }>;
  locationId: string;
  saleDate: Date;
  note?: string;
  globalDiscount?: GlobalDiscount | null;
  shiftId: string | null;
}

/**
 * Create an exchange (cambio) - generates NC for returns and new sale for new products
 */
export async function createExchange(
  params: CreateExchangeParams,
): Promise<ExchangeResult> {
  const {
    exchangeData,
    itemsToReturn,
    newCartItems,
    payments,
    appliedCreditNotes,
    locationId,
    saleDate,
    note,
    globalDiscount,
    shiftId,
  } = params;

  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  let creditNote: ExchangeResult["creditNote"] = null;
  let sale: ExchangeResult["sale"] = null;

  // Calculate totals
  const returnTotal = itemsToReturn.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const newProductsSubtotal = newCartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Calculate global discount if any
  let globalDiscountAmount = 0;
  if (globalDiscount) {
    if (globalDiscount.type === "percentage") {
      globalDiscountAmount = newProductsSubtotal * (globalDiscount.value / 100);
    } else {
      globalDiscountAmount = Math.min(
        globalDiscount.value,
        newProductsSubtotal,
      );
    }
  }

  const newProductsTotal = newProductsSubtotal - globalDiscountAmount;
  const balance = newProductsTotal - returnTotal;

  // 1. Create Credit Note if there are items to return
  if (itemsToReturn.length > 0 && returnTotal > 0) {
    // Generate NC number
    const { data: ncNumber, error: ncNumberError } = await supabase.rpc(
      "generate_sale_number",
      { location_id_param: locationId, prefix_param: "NCX" },
    );
    if (ncNumberError) throw ncNumberError;

    // Create NC
    const { data: ncData, error: ncError } = await supabase
      .from("sales")
      .insert({
        sale_number: ncNumber,
        customer_id: exchangeData.customerId,
        subtotal: returnTotal,
        discount: 0,
        tax: 0,
        total: returnTotal,
        notes: note
          ? `Cambio - ${note}`
          : `Cambio de venta ${exchangeData.originalSaleNumber}`,
        status: "COMPLETED",
        voucher_type: "NOTA_CREDITO_X",
        sale_date: saleDate.toISOString(),
        seller_id: user.id,
        location_id: locationId,
        created_by: user.id,
        related_sale_id: exchangeData.originalSaleId,
        shift_id: shiftId,
      })
      .select()
      .single();

    if (ncError) throw ncError;

    // Create NC items
    const ncItems = itemsToReturn.map((item) => ({
      sale_id: ncData.id,
      product_id: item.productId,
      description: item.name,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.price,
      discount: 0,
      tax_rate: item.taxRate,
      total: item.price * item.quantity,
    }));

    const { error: ncItemsError } = await supabase
      .from("sale_items")
      .insert(ncItems);

    if (ncItemsError) throw ncItemsError;

    // Increment stock for returned items
    for (const item of itemsToReturn) {
      if (item.productId) {
        const { error: stockError } = await supabase.rpc("increase_stock", {
          p_product_id: item.productId,
          p_location_id: locationId,
          p_quantity: item.quantity,
        });

        if (stockError) {
          console.error("Error incrementando stock:", stockError);
        }
      }
    }

    creditNote = {
      id: ncData.id,
      saleNumber: ncData.sale_number,
      total: ncData.total,
    };
  }

  // 2. Create new sale if there are new products AND balance > 0
  if (newCartItems.length > 0 && newProductsTotal > 0) {
    // Generate sale number
    const { data: saleNumber, error: saleNumberError } = await supabase.rpc(
      "generate_sale_number",
      { location_id_param: locationId },
    );
    if (saleNumberError) throw saleNumberError;

    // Calculate what needs to be paid (considering NC credits)
    const totalCreditNoteAmount =
      returnTotal + appliedCreditNotes.reduce((sum, nc) => sum + nc.amount, 0);
    const amountToPay = Math.max(0, newProductsTotal - totalCreditNoteAmount);

    // Create sale
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert({
        sale_number: saleNumber,
        customer_id: exchangeData.customerId,
        subtotal: newProductsSubtotal,
        discount: globalDiscountAmount,
        tax: 0,
        total: newProductsTotal,
        notes: note
          ? `Cambio - ${note}`
          : `Cambio de venta ${exchangeData.originalSaleNumber}`,
        status:
          amountToPay > 0 && payments.length === 0 ? "PENDING" : "COMPLETED",
        voucher_type: "COMPROBANTE_X",
        sale_date: saleDate.toISOString(),
        seller_id: user.id,
        location_id: locationId,
        created_by: user.id,
        shift_id: shiftId,
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Create sale items
    const saleItems = newCartItems.map((item) => ({
      sale_id: saleData.id,
      product_id: item.productId,
      description: item.name,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.price,
      discount:
        item.discount?.type === "percentage"
          ? (item.price * item.quantity * item.discount.value) / 100
          : item.discount?.value || 0,
      tax_rate: item.taxRate,
      total:
        item.price * item.quantity -
        (item.discount?.type === "percentage"
          ? (item.price * item.quantity * item.discount.value) / 100
          : item.discount?.value || 0),
    }));

    const { error: saleItemsError } = await supabase
      .from("sale_items")
      .insert(saleItems);

    if (saleItemsError) throw saleItemsError;

    // Decrease stock for new products
    for (const item of newCartItems) {
      if (item.productId) {
        const { error: stockError } = await supabase.rpc("decrease_stock", {
          p_product_id: item.productId,
          p_location_id: locationId,
          p_quantity: item.quantity,
        });

        if (stockError) {
          console.error("Error descontando stock:", stockError);
        }
      }
    }

    // Create RCB for the exchange payment
    if (payments.length > 0 && amountToPay > 0) {
      if (exchangeData.customerId) {
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

        if (totalPaid > 0) {
          const { data: paymentNumber, error: rcbNumberError } =
            await supabase.rpc("generate_customer_payment_number", {
              pos_number: 1,
            });
          if (rcbNumberError) throw rcbNumberError;

          const { data: customerPayment, error: rcbError } = await supabase
            .from("customer_payments")
            .insert({
              payment_number: paymentNumber,
              customer_id: exchangeData.customerId,
              payment_date: saleDate.toISOString(),
              total_amount: totalPaid,
              notes: `Cambio de venta ${exchangeData.originalSaleNumber}`,
              status: "completed",
              created_by: user.id,
            })
            .select("id")
            .single();
          if (rcbError) throw rcbError;

          const { error: allocationError } = await supabase
            .from("customer_payment_allocations")
            .insert({
              customer_payment_id: customerPayment.id,
              sale_id: saleData.id,
              amount: totalPaid,
            });
          if (allocationError) throw allocationError;

          const rcbMethods = payments.map((p) => ({
            customer_payment_id: customerPayment.id,
            payment_method_id: p.payment_method_id,
            method_name: p.method_name,
            amount: p.amount,
            reference: p.reference,
            cash_register_id: null,
          }));

          const { error: rcbMethodsError } = await supabase
            .from("customer_payment_methods")
            .insert(rcbMethods);
          if (rcbMethodsError) throw rcbMethodsError;
        }
      }
    }

    // Track credit note applications
    if (creditNote) {
      // Apply the NC we just created
      const { error: ncAppError } = await supabase
        .from("credit_note_applications")
        .insert({
          credit_note_id: creditNote.id,
          applied_to_sale_id: saleData.id,
          amount: Math.min(returnTotal, newProductsTotal),
        });

      if (ncAppError) {
        console.error("Error registrando aplicación de NC:", ncAppError);
      }
    }

    // Track additional credit note applications
    for (const nc of appliedCreditNotes) {
      const { error: ncAppError } = await supabase
        .from("credit_note_applications")
        .insert({
          credit_note_id: nc.creditNoteId,
          applied_to_sale_id: saleData.id,
          amount: nc.amount,
        });

      if (ncAppError) {
        console.error(
          "Error registrando aplicación de NC adicional:",
          ncAppError,
        );
      }
    }

    sale = {
      id: saleData.id,
      saleNumber: saleData.sale_number,
      total: saleData.total,
    };
  }

  // Calculate credit balance (if customer has credit remaining)
  const creditBalance = balance < 0 ? Math.abs(balance) : 0;

  return {
    creditNote,
    sale,
    creditBalance,
  };
}

/**
 * @deprecated Migrated to cancelCreditNoteAction in actions/sales.ts
 */
export async function cancelCreditNote(
  creditNoteId: string,
  revertStock: boolean,
): Promise<void> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  // Get the credit note with its items
  const { data: creditNote, error: ncError } = await supabase
    .from("sales")
    .select(
      `
      *,
      items:sale_items(*)
    `,
    )
    .eq("id", creditNoteId)
    .single();

  if (ncError) throw ncError;
  if (!creditNote) throw new Error("Nota de crédito no encontrada");

  // Verify it's a credit note
  if (!creditNote.voucher_type.startsWith("NOTA_CREDITO")) {
    throw new Error("El comprobante no es una nota de crédito");
  }

  // Check if NC has been applied to any sale
  const { data: applications } = await supabase
    .from("credit_note_applications")
    .select("id, amount")
    .eq("credit_note_id", creditNoteId);

  if (applications && applications.length > 0) {
    throw new Error(
      "No se puede anular una nota de crédito que ya fue aplicada a una venta",
    );
  }

  // Revert stock if requested
  if (revertStock && creditNote.items) {
    for (const item of creditNote.items) {
      if (item.product_id) {
        // NC increased stock, so we decrease it to revert
        const { error: stockError } = await supabase.rpc("decrease_stock", {
          p_product_id: item.product_id,
          p_location_id: creditNote.location_id!,
          p_quantity: item.quantity,
        });

        if (stockError) {
          console.error("Error revirtiendo stock:", stockError);
        }
      }
    }
  }

  // Update the credit note status to CANCELLED
  const { error: updateError } = await supabase
    .from("sales")
    .update({
      status: "CANCELLED",
      notes: creditNote.notes
        ? `${creditNote.notes} | ANULADA el ${new Date().toLocaleDateString("es-AR")}`
        : `ANULADA el ${new Date().toLocaleDateString("es-AR")}`,
    })
    .eq("id", creditNoteId);

  if (updateError) throw updateError;
}

export interface StockCheckResult {
  productId: string;
  productName: string;
  sku: string;
  requested: number;
  available: number;
  shortage: number;
}

export async function checkStockAvailability(
  items: {
    productId: string | null;
    name: string;
    sku: string;
    quantity: number;
  }[],
  locationId: string,
): Promise<StockCheckResult[]> {
  const supabase = createClient();

  // Filtrar solo productos reales (no custom items)
  const productIds = items
    .filter((item) => item.productId !== null)
    .map((item) => item.productId as string);

  if (productIds.length === 0) return [];

  // Obtener stock de la ubicación
  const { data: stockData, error } = await supabase
    .from("stock")
    .select("product_id, quantity")
    .eq("location_id", locationId)
    .in("product_id", productIds);

  if (error) throw error;

  // Crear mapa de stock
  const stockMap = new Map<string, number>();
  (stockData || []).forEach((s) => {
    stockMap.set(s.product_id, s.quantity);
  });

  // Verificar cada item
  const shortages: StockCheckResult[] = [];

  items.forEach((item) => {
    if (!item.productId) return; // Skip custom items

    const available = stockMap.get(item.productId) ?? 0;
    const shortage = item.quantity - available;

    if (shortage > 0) {
      shortages.push({
        productId: item.productId,
        productName: item.name,
        sku: item.sku,
        requested: item.quantity,
        available,
        shortage,
      });
    }
  });

  return shortages;
}
