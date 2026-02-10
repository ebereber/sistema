"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import type {
  BulkFilters,
  PriceHistory,
  ProductInsert,
  ProductUpdate,
} from "@/lib/services/products";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";
import * as XLSX from "xlsx";

// ============================================================================
// INDIVIDUAL MUTATIONS
// ============================================================================

export async function createProductAction(data: {
  product: Omit<ProductInsert, "organization_id">;
  stockByLocation: Array<{ location_id: string; quantity: number }>;
  userId: string;
  comboItems?: Array<{ product_id: string; quantity: number }>;
}): Promise<{ id: string; name: string }> {
  const organizationId = await getOrganizationId();
  const isCombo = data.product.product_type === "COMBO";
  const totalStock = data.stockByLocation.reduce(
    (sum, s) => sum + s.quantity,
    0,
  );

  // 1. Create product
  const { data: product, error: productError } = await supabaseAdmin
    .from("products")
    .insert({
      ...data.product,
      stock_quantity: isCombo ? 0 : totalStock,
      organization_id: organizationId,
    })
    .select("id, name")
    .single();

  if (productError) throw productError;

  // 2. Create combo items (if combo)
  if (isCombo && data.comboItems && data.comboItems.length > 0) {
    const comboItemsData = data.comboItems.map((item) => ({
      combo_product_id: product.id,
      product_id: item.product_id,
      quantity: item.quantity,
    }));

    const { error: comboError } = await supabaseAdmin
      .from("combo_items")
      .insert(comboItemsData);

    if (comboError) throw comboError;
  }

  // 3. Create stock records (skip for combos)
  if (!isCombo && data.stockByLocation.length > 0) {
    const stockRecords = data.stockByLocation.map((s) => ({
      product_id: product.id,
      location_id: s.location_id,
      quantity: s.quantity,
    }));

    const { error: stockError } = await supabaseAdmin
      .from("stock")
      .insert(stockRecords);
    if (stockError) throw stockError;
  }

  // 4. Create initial price history (skip for combos)
  if (!isCombo) {
    const { error: historyError } = await supabaseAdmin
      .from("price_history")
      .insert({
        product_id: product.id,
        cost: data.product.cost,
        price: data.product.price,
        margin_percentage: data.product.margin_percentage,
        tax_rate: data.product.tax_rate,
        reason: "Creacion inicial del producto",
        created_by: data.userId,
      });
    if (historyError) throw historyError;
  }

  // 5. Create initial stock movements for locations with quantity > 0 (skip for combos)
  if (!isCombo) {
    const stockMovements = data.stockByLocation
      .filter((s) => s.quantity > 0)
      .map((s) => ({
        product_id: product.id,
        location_to_id: s.location_id,
        quantity: s.quantity,
        reason: "Stock inicial del producto",
        reference_type: "INITIAL",
        created_by: data.userId,
      }));

    if (stockMovements.length > 0) {
      const { error: movementError } = await supabaseAdmin
        .from("stock_movements")
        .insert(stockMovements);
      if (movementError) throw movementError;
    }
  }

  revalidateTag("products", "minutes");

  return product;
}

export async function updateProductAction(
  id: string,
  data: {
    product: ProductUpdate;
    stockByLocation?: Array<{ location_id: string; quantity: number }>;
    userId: string;
    comboItems?: Array<{ product_id: string; quantity: number }>;
  },
): Promise<{ id: string; name: string }> {
  const isCombo = data.product.product_type === "COMBO";

  // Get current product for comparison
  const { data: currentProduct, error: fetchError } = await supabaseAdmin
    .from("products")
    .select("cost, price, margin_percentage, tax_rate, product_type")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  // Calculate new total stock if provided (not for combos)
  let updateData = { ...data.product };
  if (!isCombo && data.stockByLocation) {
    const totalStock = data.stockByLocation.reduce(
      (sum, s) => sum + s.quantity,
      0,
    );
    updateData = { ...updateData, stock_quantity: totalStock };
  }

  // 1. Update product
  const { data: product, error: updateError } = await supabaseAdmin
    .from("products")
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name")
    .single();

  if (updateError) throw updateError;

  // 2. Update combo items (if combo)
  if (isCombo && data.comboItems) {
    // Delete existing combo items
    await supabaseAdmin.from("combo_items").delete().eq("combo_product_id", id);

    // Insert new combo items
    if (data.comboItems.length > 0) {
      const comboItemsData = data.comboItems.map((item) => ({
        combo_product_id: id,
        product_id: item.product_id,
        quantity: item.quantity,
      }));

      const { error: comboError } = await supabaseAdmin
        .from("combo_items")
        .insert(comboItemsData);

      if (comboError) throw comboError;
    }
  }

  // 3. If price changed, create price history (skip for combos)
  if (!isCombo) {
    const priceChanged =
      currentProduct &&
      (currentProduct.cost !== data.product.cost ||
        currentProduct.price !== data.product.price ||
        currentProduct.margin_percentage !== data.product.margin_percentage);

    if (priceChanged) {
      await supabaseAdmin.from("price_history").insert({
        product_id: id,
        cost: data.product.cost ?? currentProduct.cost,
        price: data.product.price ?? currentProduct.price,
        margin_percentage:
          data.product.margin_percentage ?? currentProduct.margin_percentage,
        tax_rate: data.product.tax_rate ?? currentProduct.tax_rate,
        reason: "Actualizacion manual",
        created_by: data.userId,
      });
    }
  }

  // 4. If stock changed, update stock and create movements (skip for combos)
  if (!isCombo && data.stockByLocation) {
    for (const stockItem of data.stockByLocation) {
      const { data: currentStock } = await supabaseAdmin
        .from("stock")
        .select("quantity")
        .eq("product_id", id)
        .eq("location_id", stockItem.location_id)
        .single();

      const currentQty = currentStock?.quantity ?? 0;

      if (currentQty !== stockItem.quantity) {
        const diff = stockItem.quantity - currentQty;

        await supabaseAdmin.from("stock").upsert(
          {
            product_id: id,
            location_id: stockItem.location_id,
            quantity: stockItem.quantity,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "product_id,location_id" },
        );

        await supabaseAdmin.from("stock_movements").insert({
          product_id: id,
          [diff > 0 ? "location_to_id" : "location_from_id"]:
            stockItem.location_id,
          quantity: Math.abs(diff),
          reason: "Ajuste manual",
          reference_type: "ADJUSTMENT",
          created_by: data.userId,
        });
      }
    }
  }

  revalidateTag("products", "minutes");
  revalidateTag(`product-${id}`, "minutes");

  return product;
}

export async function archiveProductAction(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("products")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("products", "minutes");
  revalidateTag(`product-${id}`, "minutes");
}

export async function activateProductAction(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("products")
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("products", "minutes");
  revalidateTag(`product-${id}`, "minutes");
}

export async function deleteProductAction(id: string): Promise<void> {
  // Check if product has sales references
  const { data: movements } = await supabaseAdmin
    .from("stock_movements")
    .select("id")
    .eq("product_id", id)
    .eq("reference_type", "SALE")
    .limit(1);

  if (movements && movements.length > 0) {
    await supabaseAdmin
      .from("products")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    revalidateTag("products", "minutes");
    revalidateTag(`product-${id}`, "minutes");
    throw new Error("El producto tiene referencias y fue archivado");
  }

  // Delete related records first
  await supabaseAdmin.from("stock_movements").delete().eq("product_id", id);
  await supabaseAdmin.from("stock").delete().eq("product_id", id);
  await supabaseAdmin.from("price_history").delete().eq("product_id", id);

  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
  if (error) throw error;

  revalidateTag("products", "minutes");
}

export async function isSkuUniqueAction(
  sku: string,
  excludeId?: string,
): Promise<boolean> {
  let query = supabaseAdmin.from("products").select("id").eq("sku", sku);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.limit(1);
  if (error) throw error;
  return !data || data.length === 0;
}

export async function isBarcodeUniqueAction(
  barcode: string,
  excludeId?: string,
): Promise<boolean> {
  let query = supabaseAdmin
    .from("products")
    .select("id")
    .eq("barcode", barcode);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.limit(1);
  if (error) throw error;
  return !data || data.length === 0;
}

export async function updateProductStockAction(
  productId: string,
  data: {
    stockByLocation: Array<{ location_id: string; quantity: number }>;
    userId: string;
  },
): Promise<void> {
  for (const stockItem of data.stockByLocation) {
    const { data: currentStock } = await supabaseAdmin
      .from("stock")
      .select("quantity")
      .eq("product_id", productId)
      .eq("location_id", stockItem.location_id)
      .single();

    const currentQty = currentStock?.quantity ?? 0;

    if (currentQty !== stockItem.quantity) {
      const diff = stockItem.quantity - currentQty;

      await supabaseAdmin.from("stock").upsert(
        {
          product_id: productId,
          location_id: stockItem.location_id,
          quantity: stockItem.quantity,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id,location_id" },
      );

      await supabaseAdmin.from("stock_movements").insert({
        product_id: productId,
        [diff > 0 ? "location_to_id" : "location_from_id"]:
          stockItem.location_id,
        quantity: Math.abs(diff),
        reason: "Ajuste manual desde gestion de stock",
        reference_type: "ADJUSTMENT",
        created_by: data.userId,
      });
    }
  }

  // Update total stock in products table
  const totalStock = data.stockByLocation.reduce(
    (sum, s) => sum + s.quantity,
    0,
  );
  await supabaseAdmin
    .from("products")
    .update({
      stock_quantity: totalStock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  revalidateTag("products", "minutes");
  revalidateTag(`product-${productId}`, "minutes");
}

// ============================================================================
// BULK MUTATIONS
// ============================================================================

async function resolveProductIds(
  productIds?: string[],
  filters?: BulkFilters,
): Promise<string[]> {
  if (productIds) return productIds;

  if (!filters) return [];

  let query = supabaseAdmin.from("products").select("id");

  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`,
    );
  }

  if (filters.active !== undefined) {
    query = query.eq("active", filters.active);
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters.visibility && filters.visibility.length > 0) {
    query = query.in("visibility", filters.visibility);
  }

  if (filters.stockFilter === "WITH_STOCK") {
    query = query.gt("stock_quantity", 0);
  } else if (filters.stockFilter === "WITHOUT_STOCK") {
    query = query.eq("stock_quantity", 0);
  } else if (filters.stockFilter === "NEGATIVE_STOCK") {
    query = query.lt("stock_quantity", 0);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data?.map((p) => p.id) || [];
}

export async function bulkUpdatePricesAction(params: {
  productIds?: string[];
  filters?: BulkFilters;
  operation: "increase" | "decrease";
  type: "percentage" | "fixed";
  value: number;
  userId: string;
}): Promise<number> {
  const productIds = await resolveProductIds(params.productIds, params.filters);
  if (productIds.length === 0) return 0;

  const { data: products, error: fetchError } = await supabaseAdmin
    .from("products")
    .select("id, price, cost, margin_percentage, tax_rate")
    .in("id", productIds);

  if (fetchError) throw fetchError;

  let updatedCount = 0;
  for (const product of products || []) {
    let newPrice = product.price;

    if (params.type === "percentage") {
      const multiplier =
        params.operation === "increase"
          ? 1 + params.value / 100
          : 1 - params.value / 100;
      newPrice = product.price * multiplier;
    } else {
      newPrice =
        params.operation === "increase"
          ? product.price + params.value
          : product.price - params.value;
    }

    newPrice = Math.max(0, newPrice);

    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({ price: newPrice, updated_at: new Date().toISOString() })
      .eq("id", product.id);

    if (updateError) throw updateError;

    await supabaseAdmin.from("price_history").insert({
      product_id: product.id,
      cost: product.cost,
      price: newPrice,
      margin_percentage: product.margin_percentage,
      tax_rate: product.tax_rate,
      reason: `Actualizacion masiva: ${params.operation === "increase" ? "Aumento" : "Disminucion"} ${params.value}${params.type === "percentage" ? "%" : "$"}`,
      created_by: params.userId,
    });

    updatedCount++;
  }

  revalidateTag("products", "minutes");
  return updatedCount;
}

export async function bulkUpdateStockAction(params: {
  productIds?: string[];
  filters?: BulkFilters;
  locationId: string;
  operation: "replace" | "increase";
  quantity: number;
  reason?: string;
  userId: string;
}): Promise<number> {
  const productIds = await resolveProductIds(params.productIds, params.filters);
  if (productIds.length === 0) return 0;

  let updatedCount = 0;
  for (const productId of productIds) {
    const { data: currentStock } = await supabaseAdmin
      .from("stock")
      .select("quantity")
      .eq("product_id", productId)
      .eq("location_id", params.locationId)
      .single();

    const currentQty = currentStock?.quantity ?? 0;
    const newQty =
      params.operation === "replace"
        ? params.quantity
        : currentQty + params.quantity;

    if (currentQty !== newQty) {
      const diff = newQty - currentQty;

      await supabaseAdmin.from("stock").upsert(
        {
          product_id: productId,
          location_id: params.locationId,
          quantity: newQty,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id,location_id" },
      );

      await supabaseAdmin.from("stock_movements").insert({
        product_id: productId,
        [diff > 0 ? "location_to_id" : "location_from_id"]: params.locationId,
        quantity: Math.abs(diff),
        reason: params.reason || "Actualizacion masiva de stock",
        reference_type: "ADJUSTMENT",
        created_by: params.userId,
      });

      const { data: allStock } = await supabaseAdmin
        .from("stock")
        .select("quantity")
        .eq("product_id", productId);

      const totalStock = allStock?.reduce((sum, s) => sum + s.quantity, 0) ?? 0;

      await supabaseAdmin
        .from("products")
        .update({
          stock_quantity: totalStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

      updatedCount++;
    }
  }

  revalidateTag("products", "minutes");
  return updatedCount;
}

export async function bulkAssignCategoryAction(params: {
  productIds?: string[];
  filters?: BulkFilters;
  categoryId: string | null;
}): Promise<number> {
  const productIds = await resolveProductIds(params.productIds, params.filters);
  if (productIds.length === 0) return 0;

  const { error } = await supabaseAdmin
    .from("products")
    .update({
      category_id: params.categoryId,
      updated_at: new Date().toISOString(),
    })
    .in("id", productIds);

  if (error) throw error;

  revalidateTag("products", "minutes");
  return productIds.length;
}

export async function getProductStatusCountsAction(params: {
  productIds?: string[];
  filters?: BulkFilters;
}): Promise<{ active: number; inactive: number }> {
  const productIds = await resolveProductIds(params.productIds, params.filters);
  if (productIds.length === 0) return { active: 0, inactive: 0 };

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("active")
    .in("id", productIds);

  if (error) throw error;

  const active = data?.filter((p) => p.active).length ?? 0;
  const inactive = data?.filter((p) => !p.active).length ?? 0;

  return { active, inactive };
}

export async function bulkArchiveAction(params: {
  productIds?: string[];
  filters?: BulkFilters;
  archive: boolean;
}): Promise<number> {
  const productIds = await resolveProductIds(params.productIds, params.filters);
  if (productIds.length === 0) return 0;

  const { data, error } = await supabaseAdmin
    .from("products")
    .update({ active: !params.archive, updated_at: new Date().toISOString() })
    .in("id", productIds)
    .eq("active", params.archive)
    .select("id");

  if (error) throw error;

  revalidateTag("products", "minutes");
  return data?.length ?? 0;
}

export async function checkProductsWithReferencesAction(
  productIds: string[],
): Promise<{
  canDelete: string[];
  hasReferences: string[];
}> {
  const canDelete: string[] = [];
  const hasReferences: string[] = [];

  for (const id of productIds) {
    const { data: movements } = await supabaseAdmin
      .from("stock_movements")
      .select("id")
      .eq("product_id", id)
      .eq("reference_type", "SALE")
      .limit(1);

    if (movements && movements.length > 0) {
      hasReferences.push(id);
    } else {
      canDelete.push(id);
    }
  }

  return { canDelete, hasReferences };
}

export async function bulkDeleteAction(params: {
  productIds?: string[];
  filters?: BulkFilters;
}): Promise<{ deleted: number; archived: number }> {
  const productIds = await resolveProductIds(params.productIds, params.filters);
  if (productIds.length === 0) return { deleted: 0, archived: 0 };

  const { canDelete, hasReferences } =
    await checkProductsWithReferencesAction(productIds);

  // Archive products with references
  if (hasReferences.length > 0) {
    await supabaseAdmin
      .from("products")
      .update({ active: false, updated_at: new Date().toISOString() })
      .in("id", hasReferences);
  }

  // Delete products without references
  for (const id of canDelete) {
    await supabaseAdmin.from("stock_movements").delete().eq("product_id", id);
    await supabaseAdmin.from("stock").delete().eq("product_id", id);
    await supabaseAdmin.from("price_history").delete().eq("product_id", id);
    await supabaseAdmin.from("products").delete().eq("id", id);
  }

  revalidateTag("products", "minutes");

  return {
    deleted: canDelete.length,
    archived: hasReferences.length,
  };
}

export async function getAllProductIdsAction(
  filters: BulkFilters,
): Promise<string[]> {
  return resolveProductIds(undefined, filters);
}

export async function deleteProductImageAction(
  imageUrl: string,
): Promise<void> {
  const urlParts = imageUrl.split("/");
  const filePath = urlParts[urlParts.length - 1];

  const { error } = await supabaseAdmin.storage
    .from("product-images")
    .remove([filePath]);

  if (error) throw error;
}

export async function uploadProductImageAction(
  formData: FormData,
): Promise<string> {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No se proporcionó archivo");

  const fileExt = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from("product-images")
    .upload(fileName, buffer, {
      contentType: file.type,
    });

  if (error) throw error;

  const { data } = supabaseAdmin.storage
    .from("product-images")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

// ============================================================================
// EXPORT
// ============================================================================

const VISIBILITY_LABELS: Record<string, string> = {
  SALES_AND_PURCHASES: "Ventas y Compras",
  SALES_ONLY: "Solo Ventas",
  PURCHASES_ONLY: "Solo Compras",
};

export async function exportProductsAction(params: {
  mode: "all" | "selected";
  productIds?: string[];
  filters?: BulkFilters;
}): Promise<string> {
  const organizationId = await getOrganizationId();

  let query = supabaseAdmin
    .from("products")
    .select(
      "sku, name, category:categories(name), supplier:suppliers!products_default_supplier_id_fkey(name), cost, margin_percentage, tax_rate, price, stock_quantity, barcode, visibility, active",
    )
    .eq("organization_id", organizationId)
    .order("name");

  if (params.mode === "selected" && params.productIds?.length) {
    query = query.in("id", params.productIds);
  } else if (params.mode === "all" && params.filters) {
    const f = params.filters;
    if (f.search) {
      query = query.or(`name.ilike.%${f.search}%,sku.ilike.%${f.search}%`);
    }
    if (f.active !== undefined) {
      query = query.eq("active", f.active);
    }
    if (f.categoryId) {
      query = query.eq("category_id", f.categoryId);
    }
    if (f.visibility && f.visibility.length > 0) {
      query = query.in("visibility", f.visibility);
    }
    if (f.stockFilter === "WITH_STOCK") {
      query = query.gt("stock_quantity", 0);
    } else if (f.stockFilter === "WITHOUT_STOCK") {
      query = query.eq("stock_quantity", 0);
    } else if (f.stockFilter === "NEGATIVE_STOCK") {
      query = query.lt("stock_quantity", 0);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []).map((p) => ({
    SKU: p.sku,
    Nombre: p.name,
    Categoría: (p.category as { name: string } | null)?.name || "",
    Proveedor: (p.supplier as { name: string } | null)?.name || "",
    "Costo sin IVA": p.cost ?? 0,
    "Margen %": p.margin_percentage ?? 0,
    "IVA %": p.tax_rate ?? 21,
    "Precio con IVA": p.price,
    Stock: p.stock_quantity ?? 0,
    "Código de barras": p.barcode || "",
    Visibilidad: VISIBILITY_LABELS[p.visibility ?? ""] || p.visibility || "",
    Estado: p.active ? "Activo" : "Archivado",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key as keyof typeof r] ?? "").length),
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Productos");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer).toString("base64");
}

export async function getPriceHistoryAction(
  productId: string,
): Promise<PriceHistory[]> {
  const organizationId = await getOrganizationId();

  const { data, error } = await supabaseAdmin
    .from("price_history")
    .select("*, user:users(name)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateProductPricesAction(params: {
  changes: Array<{
    productId: string;
    cost: number;
    price: number;
    marginPercentage: number;
  }>;
  userId: string;
}): Promise<number> {
  let updated = 0;

  for (const change of params.changes) {
    const { data: current, error: fetchError } = await supabaseAdmin
      .from("products")
      .select("cost, price, margin_percentage, tax_rate")
      .eq("id", change.productId)
      .single();

    if (fetchError) throw fetchError;

    const priceChanged =
      current.cost !== change.cost ||
      current.price !== change.price ||
      current.margin_percentage !== change.marginPercentage;

    if (!priceChanged) continue;

    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({
        cost: change.cost,
        price: change.price,
        margin_percentage: change.marginPercentage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", change.productId);

    if (updateError) throw updateError;

    await supabaseAdmin.from("price_history").insert({
      product_id: change.productId,
      cost: change.cost,
      price: change.price,
      margin_percentage: change.marginPercentage,
      tax_rate: current.tax_rate,
      reason: "Actualización desde módulo de precios",
      created_by: params.userId,
    });

    updated++;
  }

  revalidateTag("products", "minutes");
  return updated;
}

export async function exportPricesAction(): Promise<string> {
  const organizationId = await getOrganizationId();

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("sku, name, cost, margin_percentage, tax_rate, price")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("name");

  if (error) throw error;

  const rows = (data || []).map((p) => ({
    SKU: p.sku,
    Nombre: p.name,
    "Costo sin IVA": p.cost ?? 0,
    "Margen %": p.margin_percentage ?? 0,
    "IVA %": p.tax_rate ?? 21,
    "Precio con IVA": p.price,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  const colWidths = Object.keys(rows[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key as keyof typeof r] ?? "").length),
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Precios");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer).toString("base64");
}
