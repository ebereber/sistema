import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

export type Purchase = Omit<
  Tables<"purchases">,
  "status" | "payment_status"
> & {
  status: "draft" | "completed" | "cancelled";
  payment_status: "pending" | "partial" | "paid" | null;
  supplier?: {
    id: string;
    name: string;
    tax_id: string | null;
  };
  location?: {
    id: string;
    name: string;
  };
  items?: PurchaseItem[];
};

export type PurchaseItem = Omit<Tables<"purchase_items">, "type"> & {
  type: "product" | "custom";
};

export interface CreatePurchaseData {
  supplier_id: string;
  location_id?: string | null;
  voucher_type: string;
  voucher_number: string;
  invoice_date: string;
  due_date?: string | null;
  accounting_date?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  products_received: boolean;
  notes?: string | null;
  attachment_url?: string | null;
  tax_category?: string | null;
  purchase_order_id?: string | null;
}

export interface CreatePurchaseItemData {
  product_id?: string | null;
  name: string;
  sku?: string | null;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  type: "product" | "custom";
}

// Get all purchases with pagination
export interface GetPurchasesParams {
  page?: number;
  pageSize?: number;
  status?: "draft" | "completed" | "cancelled";
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PurchasePaymentAllocation {
  id: string;
  amount: number;
  created_at: string;
  payment_id: string;
  payment_number: string;
  payment_date: string;
  payment_status: string;
  methods: string[];
}

/* export async function getPurchases(
  params: GetPurchasesParams = {},
  scope?: UserScope,
): Promise<{
  data: Purchase[];
  count: number;
  totalPages: number;
}> {
  const supabase = createClient();
  const {
    page = 1,
    pageSize = 20,
    status,
    supplierId,
    dateFrom,
    dateTo,
    search,
  } = params;

  let query = supabase
    .from("purchases")
    .select(
      `*, supplier:suppliers(id, name, tax_id), location:locations(id, name)`,
      { count: "exact" },
    );

  // Aplicar visibilidad de datos
  if (scope) {
    query = applyDataScope(query, scope, { userColumn: "user_id" });
  }

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

  // Pagination
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
} */

// Get purchase by ID with items
export async function getPurchaseById(id: string): Promise<Purchase | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("purchases")
    .select(
      `
      *,
      supplier:suppliers(id, name, tax_id),
      location:locations(id, name),
      items:purchase_items(*)
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as unknown as Purchase;
}

// Create purchase with items
export async function createPurchase(
  purchaseData: CreatePurchaseData,
  items: CreatePurchaseItemData[],
): Promise<Purchase> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Usuario no autenticado");

  // Get organization_id
  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!userData?.organization_id) throw new Error("Usuario sin organización");
  const organizationId = userData.organization_id;

  // Generate purchase number
  const { data: purchaseNumber, error: numberError } = await supabase.rpc(
    "generate_purchase_number",
    { location_id_param: (purchaseData.location_id ?? null) as string },
    //hay un error de tipo acá Dejá el cast entonces.
    // El RPC en la base de datos tiene el parámetro definido como text no nullable.
    // Cambiar eso requiere modificar la función SQL y no vale la pena ahora.
  );
  if (numberError) throw numberError;

  // Create purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      purchase_number: purchaseNumber || "", // ← Agregar
      supplier_id: purchaseData.supplier_id,
      location_id: purchaseData.location_id || null,
      voucher_type: purchaseData.voucher_type,
      voucher_number: purchaseData.voucher_number,
      invoice_date: purchaseData.invoice_date,
      due_date: purchaseData.due_date || null,
      accounting_date: purchaseData.accounting_date || null,
      subtotal: purchaseData.subtotal,
      discount: purchaseData.discount,
      tax: purchaseData.tax,
      total: purchaseData.total,
      status: "completed",
      products_received: purchaseData.products_received,
      notes: purchaseData.notes || null,
      attachment_url: purchaseData.attachment_url || null,
      tax_category: purchaseData.tax_category || null,
      created_by: user.id,
      purchase_order_id: purchaseData.purchase_order_id || null,
      organization_id: organizationId,
    })
    .select()
    .single();

  if (purchaseError) throw purchaseError;

  // Create items
  if (items.length > 0) {
    const itemsWithPurchaseId = items.map((item) => ({
      purchase_id: purchase.id,
      product_id: item.product_id || null,
      name: item.name,
      sku: item.sku || null,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      subtotal: item.subtotal,
      type: item.type,
    }));

    const { error: itemsError } = await supabase
      .from("purchase_items")
      .insert(itemsWithPurchaseId);

    if (itemsError) throw itemsError;
  }

  // Increase stock if products received
  if (purchaseData.products_received && purchaseData.location_id) {
    for (const item of items) {
      if (item.product_id && item.type === "product") {
        const { error: stockError } = await supabase.rpc(
          "increase_stock_from_purchase",
          {
            p_product_id: item.product_id,
            p_location_id: purchaseData.location_id,
            p_quantity: item.quantity,
          },
        );

        if (stockError) {
          console.error("Error increasing stock:", stockError);
        }
      }
    }
  }

  // Si viene de una orden de compra, marcarla como facturada
  if (purchaseData.purchase_order_id) {
    await supabase
      .from("purchase_orders")
      .update({ status: "invoiced", updated_at: new Date().toISOString() })
      .eq("id", purchaseData.purchase_order_id);
  }

  return purchase as unknown as Purchase;
}

// Update purchase
// Update purchase with items
export async function updatePurchase(
  id: string,
  purchaseData: Partial<CreatePurchaseData>,
  items?: CreatePurchaseItemData[],
): Promise<Purchase> {
  const supabase = createClient();

  // Update purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .update({
      supplier_id: purchaseData.supplier_id,
      location_id: purchaseData.location_id || null,
      voucher_type: purchaseData.voucher_type,
      voucher_number: purchaseData.voucher_number || "",
      invoice_date: purchaseData.invoice_date,
      due_date: purchaseData.due_date || null,
      accounting_date: purchaseData.accounting_date || null,
      subtotal: purchaseData.subtotal,
      discount: purchaseData.discount,
      tax: purchaseData.tax,
      total: purchaseData.total,
      products_received: purchaseData.products_received,
      notes: purchaseData.notes || null,
      tax_category: purchaseData.tax_category || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (purchaseError) throw purchaseError;

  // Update items if provided
  if (items) {
    // Delete existing items
    const { error: deleteError } = await supabase
      .from("purchase_items")
      .delete()
      .eq("purchase_id", id);

    if (deleteError) throw deleteError;

    // Insert new items
    if (items.length > 0) {
      const itemsWithPurchaseId = items.map((item) => ({
        purchase_id: id,
        product_id: item.product_id || null,
        name: item.name,
        sku: item.sku || null,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        subtotal: item.subtotal,
        type: item.type,
      }));

      const { error: itemsError } = await supabase
        .from("purchase_items")
        .insert(itemsWithPurchaseId);

      if (itemsError) throw itemsError;
    }
  }

  return purchase as unknown as Purchase;
}
// Cancel purchase (and revert stock if needed)
export async function cancelPurchase(id: string): Promise<Purchase> {
  const supabase = createClient();

  // Get purchase with items
  const purchase = await getPurchaseById(id);
  if (!purchase) throw new Error("Compra no encontrada");

  if (purchase.status === "cancelled") {
    throw new Error("La compra ya está cancelada");
  }

  // Revert stock if products were received
  if (purchase.products_received && purchase.location_id && purchase.items) {
    for (const item of purchase.items) {
      if (item.product_id && item.type === "product") {
        // Decrease stock
        const { error: stockError } = await supabase.rpc("decrease_stock", {
          p_product_id: item.product_id,
          p_location_id: purchase.location_id,
          p_quantity: item.quantity,
        });

        if (stockError) {
          console.error("Error decreasing stock:", stockError);
        }
      }
    }
  }

  // Update status
  const { data, error } = await supabase
    .from("purchases")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data as unknown as Purchase;
}

// Mark products as received (increase stock)
export async function markProductsReceived(
  id: string,
  locationId: string,
): Promise<Purchase> {
  const supabase = createClient();

  // Get purchase with items
  const purchase = await getPurchaseById(id);
  if (!purchase) throw new Error("Compra no encontrada");

  if (purchase.products_received) {
    throw new Error("Los productos ya fueron marcados como recibidos");
  }

  // Increase stock for each item
  if (purchase.items) {
    for (const item of purchase.items) {
      if (item.product_id && item.type === "product") {
        const { error: stockError } = await supabase.rpc(
          "increase_stock_from_purchase",
          {
            p_product_id: item.product_id,
            p_location_id: locationId,
            p_quantity: item.quantity,
          },
        );

        if (stockError) {
          console.error("Error increasing stock:", stockError);
        }
      }
    }
  }

  // Update purchase
  const { data, error } = await supabase
    .from("purchases")
    .update({
      products_received: true,
      location_id: locationId,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data as unknown as Purchase;
}

// Upload attachment
// Subir archivo
export async function uploadPurchaseAttachment(file: File): Promise<string> {
  const supabase = createClient();

  const fileExt = file.name.split(".").pop();
  const fileName = `purchases/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("product-images").getPublicUrl(fileName);

  return publicUrl;
}

// Check for duplicate purchase (exclude current purchase in edit mode)
export async function checkDuplicatePurchase(
  supplierId: string,
  voucherType: string,
  voucherNumber: string,
  excludeId?: string,
): Promise<boolean> {
  const supabase = createClient();

  let query = supabase
    .from("purchases")
    .select("id")
    .eq("supplier_id", supplierId)
    .eq("voucher_type", voucherType)
    .eq("voucher_number", voucherNumber)
    .neq("status", "cancelled");

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;

  return data !== null;
}
//DELETE PURCHASES ESTA EN ACTIONS/PURCHASES

// Get payments for a specific purchase
export async function getPaymentsByPurchaseId(
  purchaseId: string,
): Promise<PurchasePaymentAllocation[]> {
  const supabase = createClient();

  // Get allocations with payment info
  const { data: allocations, error: allocError } = await supabase
    .from("supplier_payment_allocations")
    .select("id, amount, created_at, payment_id")
    .eq("purchase_id", purchaseId)
    .order("created_at", { ascending: false });

  if (allocError) throw allocError;
  if (!allocations || allocations.length === 0) return [];

  // Get payment details for each allocation
  const paymentIds = allocations.map((a) => a.payment_id);

  const { data: payments, error: payError } = await supabase
    .from("supplier_payments")
    .select("id, payment_number, payment_date, status")
    .in("id", paymentIds);

  if (payError) throw payError;

  // Get payment methods
  const { data: methods, error: methodsError } = await supabase
    .from("supplier_payment_methods")
    .select("payment_id, method_name")
    .in("payment_id", paymentIds);

  if (methodsError) throw methodsError;

  // Combine data
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
