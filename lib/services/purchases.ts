import { createClient } from "@/lib/supabase/client";

// Types
export interface Purchase {
  id: string;
  purchase_number: string | null;
  supplier_id: string;
  location_id: string | null;
  voucher_type: string;
  voucher_number: string;
  invoice_date: string;
  due_date: string | null;
  accounting_date: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: "draft" | "completed" | "cancelled";
  products_received: boolean;
  notes: string | null;
  attachment_url: string | null;
  tax_category: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relations
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
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  type: "product" | "custom";
  created_at: string;
}

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

export async function getPurchases(params: GetPurchasesParams = {}): Promise<{
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

  let query = supabase.from("purchases").select(
    `
      *,
      supplier:suppliers(id, name, tax_id),
      location:locations(id, name)
    `,
    { count: "exact" },
  );

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
    query = query.ilike("voucher_number", `%${search}%`);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: data || [],
    count: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

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

  return data;
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

  // Generate purchase number
  const { data: purchaseNumber, error: numberError } = await supabase.rpc(
    "generate_purchase_number",
    { location_id_param: purchaseData.location_id || null },
  );
  if (numberError) throw numberError;

  // Create purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      purchase_number: purchaseNumber, // ← Agregar
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

  return purchase;
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
      voucher_number: purchaseData.voucher_number,
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

  return purchase;
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

  return data;
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

  return data;
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

// Delete purchase
export async function deletePurchase(id: string): Promise<void> {
  const supabase = createClient();

  // Get purchase with items
  const purchase = await getPurchaseById(id);
  if (!purchase) throw new Error("Compra no encontrada");

  // TODO: When payments are implemented, check here
  // const { count } = await supabase
  //   .from("supplier_payments")
  //   .select("id", { count: "exact", head: true })
  //   .eq("purchase_id", id);
  // if (count && count > 0) {
  //   throw new Error("No se puede eliminar esta compra porque tiene pagos asociados");
  // }

  // If products were received, revert stock
  if (purchase.products_received && purchase.location_id && purchase.items) {
    for (const item of purchase.items) {
      if (item.product_id && item.type === "product") {
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

  // Delete purchase (items will cascade)
  const { error } = await supabase.from("purchases").delete().eq("id", id);

  if (error) throw error;
}
