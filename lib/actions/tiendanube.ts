"use server";

import {
  getAllTiendanubeProducts,
  getTiendanubeCategories,
  updateTiendanubeVariantStock,
} from "@/lib/services/tiendanube";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extractI18n, parsePrice } from "@/lib/tiendanube";
import type { TiendanubeProduct } from "@/types/tiendanube";
import { revalidateTag } from "next/cache";

// ============================================================================
// STORE CONNECTION
// ============================================================================

/**
 * Get the connected Tiendanube store for the current user.
 */
export async function getTiendanubeStoreAction(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("tiendanube_stores")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Disconnect a Tiendanube store.
 */
export async function disconnectTiendanubeStoreAction(
  storeId: string,
  userId: string,
) {
  const { error } = await supabaseAdmin
    .from("tiendanube_stores")
    .delete()
    .eq("store_id", storeId)
    .eq("user_id", userId);

  if (error) throw error;

  // Also clean up product mappings
  await supabaseAdmin
    .from("tiendanube_product_map")
    .delete()
    .eq("store_id", storeId);

  revalidateTag("tiendanube", "minutes");
}

// ============================================================================
// PRODUCT SYNC: Tiendanube → Local
// ============================================================================

/**
 * Sync products FROM Tiendanube INTO the local database.
 *
 * For each Tiendanube product:
 * 1. Check if it already exists in the mapping table
 * 2. If mapped: update the local product
 * 3. If not mapped: create a new local product + mapping
 * 4. Sync stock records and movements
 */
export async function syncProductsFromTiendanubeAction(
  storeId: string,
  userId: string,
): Promise<{ created: number; updated: number; errors: string[] }> {
  const errors: string[] = [];
  let created = 0;
  let updated = 0;

  // 1. Get all products from Tiendanube
  const tnProducts = await getAllTiendanubeProducts(storeId);

  // 2. Get existing mappings
  const { data: existingMappings } = await supabaseAdmin
    .from("tiendanube_product_map")
    .select("tiendanube_product_id, local_product_id, tiendanube_variant_id")
    .eq("store_id", storeId);

  const mappingByTnId = new Map(
    (existingMappings || []).map((m) => [m.tiendanube_product_id, m]),
  );

  // 3. Get or create Tiendanube categories locally
  const tnCategories = await getTiendanubeCategories(storeId);
  const categoryMap = await syncCategoriesFromTiendanube(tnCategories);

  // 4. Get the main location for stock assignment
  const { data: mainLocation } = await supabaseAdmin
    .from("locations")
    .select("id")
    .eq("is_main", true)
    .eq("active", true)
    .single();

  const locationId = mainLocation?.id;

  // 5. Process each product
  for (const tnProduct of tnProducts) {
    try {
      const existing = mappingByTnId.get(tnProduct.id);
      const variant = tnProduct.variants[0];

      if (!variant) {
        errors.push(`Producto TN #${tnProduct.id} sin variantes, omitido`);
        continue;
      }

      const productData = mapTiendanubeProductToLocal(tnProduct, categoryMap);

      if (existing) {
        // Update existing product
        await updateLocalProductFromTiendanube(
          existing.local_product_id,
          productData,
          variant.stock ?? 0,
          locationId,
          userId,
        );

        // Update mapping sync time
        await supabaseAdmin
          .from("tiendanube_product_map")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("store_id", storeId)
          .eq("tiendanube_product_id", tnProduct.id);

        updated++;
      } else {
        // Create new product
        const newProduct = await createLocalProductFromTiendanube(
          productData,
          variant.stock ?? 0,
          locationId,
          userId,
        );

        // Create mapping
        await supabaseAdmin.from("tiendanube_product_map").insert({
          store_id: storeId,
          local_product_id: newProduct.id,
          tiendanube_product_id: tnProduct.id,
          tiendanube_variant_id: variant.id,
          last_synced_at: new Date().toISOString(),
        });

        created++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      errors.push(`Producto TN #${tnProduct.id}: ${msg}`);
    }
  }

  revalidateTag("products", "minutes");

  return { created, updated, errors };
}

// ============================================================================
// STOCK SYNC: Local → Tiendanube
// ============================================================================

/**
 * Push local stock for a product to Tiendanube.
 */
export async function syncStockToTiendanubeAction(
  productId: string,
  storeId: string,
) {
  // Get the mapping
  const { data: mapping, error: mapError } = await supabaseAdmin
    .from("tiendanube_product_map")
    .select("tiendanube_product_id, tiendanube_variant_id")
    .eq("store_id", storeId)
    .eq("local_product_id", productId)
    .single();

  if (mapError || !mapping) {
    throw new Error("Producto no vinculado a Tiendanube");
  }

  if (!mapping.tiendanube_variant_id) {
    throw new Error("Variante de Tiendanube no mapeada");
  }

  // Get the local stock total
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .single();

  const stock = product?.stock_quantity ?? 0;

  await updateTiendanubeVariantStock(
    storeId,
    mapping.tiendanube_product_id,
    mapping.tiendanube_variant_id,
    stock,
  );
}

// ============================================================================
// ORDER SYNC: Local → Tiendanube
// ============================================================================

/**
 * Push a local sale to Tiendanube as an order.
 */
export async function pushOrderToTiendanubeAction(
  saleId: string,
  storeId: string,
) {
  // Get the sale with items
  const { data: sale, error: saleError } = await supabaseAdmin
    .from("sales")
    .select(
      `
      *,
      customer:customers(id, name, email, phone, tax_id),
      items:sale_items(
        id, product_id, description, sku, quantity, unit_price, total
      )
    `,
    )
    .eq("id", saleId)
    .single();

  if (saleError || !sale) {
    throw new Error("Venta no encontrada");
  }

  // Map sale items to Tiendanube order products
  const items = (sale.items || []) as Array<{
    product_id: string | null;
    quantity: number;
    unit_price: number;
  }>;

  const orderProducts: Array<{
    product_id: number;
    variant_id: number;
    quantity: number;
    price: string;
  }> = [];

  for (const item of items) {
    if (!item.product_id) continue;

    const { data: mapping } = await supabaseAdmin
      .from("tiendanube_product_map")
      .select("tiendanube_product_id, tiendanube_variant_id")
      .eq("store_id", storeId)
      .eq("local_product_id", item.product_id)
      .single();

    if (mapping && mapping.tiendanube_variant_id) {
      orderProducts.push({
        product_id: mapping.tiendanube_product_id,
        variant_id: mapping.tiendanube_variant_id,
        quantity: item.quantity,
        price: String(item.unit_price),
      });
    }
  }

  if (orderProducts.length === 0) {
    throw new Error("No hay productos mapeados a Tiendanube en esta venta");
  }

  const { createTiendanubeOrder } = await import("@/lib/services/tiendanube");

  const customer = sale.customer as {
    name: string;
    email: string | null;
    phone: string | null;
    tax_id: string | null;
  } | null;

  const orderData = {
    currency: "ARS",
    language: "es",
    gateway: "not-provided",
    status: "closed",
    payment_status: "paid",
    products: orderProducts,
    ...(customer && {
      customer: {
        name: customer.name,
        email: customer.email || "",
        ...(customer.phone && { phone: customer.phone }),
        ...(customer.tax_id && { identification: customer.tax_id }),
      },
    }),
    ...(sale.notes && { note: sale.notes }),
  };

  return createTiendanubeOrder(storeId, orderData);
}

// ============================================================================
// ORDER IMPORT: Tiendanube → Local Sale
// ============================================================================

/**
 * Import a Tiendanube order as a local sale.
 * Uses tiendanube_order_map for idempotency (avoids duplicate imports).
 */
export async function importTiendanubeOrderAction(
  storeId: string,
  tiendanubeOrderId: number,
  userId: string,
): Promise<{ saleId: string }> {
  // Idempotency check: verify we haven't already imported this order
  const { data: existingMap } = await supabaseAdmin
    .from("tiendanube_order_map")
    .select("id, local_sale_id")
    .eq("store_id", storeId)
    .eq("tiendanube_order_id", tiendanubeOrderId)
    .maybeSingle();

  if (existingMap) {
    return { saleId: existingMap.local_sale_id };
  }

  // Fetch the order from Tiendanube
  const { getTiendanubeOrder } = await import("@/lib/services/tiendanube");
  const tnOrder = await getTiendanubeOrder(storeId, tiendanubeOrderId);

  // Get main location
  const { data: mainLocation } = await supabaseAdmin
    .from("locations")
    .select("id")
    .eq("is_main", true)
    .eq("active", true)
    .maybeSingle();

  if (!mainLocation) {
    throw new Error("No active main location found — cannot import order");
  }

  const locationId = mainLocation.id;

  // Generate sale number
  const { data: saleNumber, error: numError } = await supabaseAdmin.rpc(
    "generate_sale_number",
    { location_id_param: locationId },
  );
  if (numError) throw numError;

  // Map TN order totals (prices come as strings)
  const total = Number.parseFloat(tnOrder.total) || 0;
  const subtotal = Number.parseFloat(tnOrder.subtotal) || 0;
  const discount = Number.parseFloat(tnOrder.discount) || 0;
  const tax = total - subtotal + discount; // Derive tax

  // Create the local sale
  const { data: sale, error: saleError } = await supabaseAdmin
    .from("sales")
    .insert({
      sale_number: saleNumber,
      sale_date: tnOrder.created_at,
      voucher_type: "COMPROBANTE_X",
      status: "COMPLETED",
      location_id: locationId,
      subtotal,
      discount,
      tax: tax > 0 ? tax : 0,
      total,
      amount_paid: total,
      notes: `Pedido de Tienda Nube #${tnOrder.number || tnOrder.id}`,
      created_by: userId,
    })
    .select("id")
    .single();

  if (saleError) throw saleError;

  // Map order products to sale items
  const saleItems: Array<{
    sale_id: string;
    product_id: string | null;
    description: string;
    sku: string | null;
    quantity: number;
    unit_price: number;
    discount: number;
    tax_rate: number;
    total: number;
  }> = [];

  for (const tnItem of tnOrder.products) {
    // Look up local product via mapping (by variant_id for future multi-variant support)
    let localProductId: string | null = null;

    if (tnItem.variant_id) {
      const { data: mapping } = await supabaseAdmin
        .from("tiendanube_product_map")
        .select("local_product_id")
        .eq("store_id", storeId)
        .eq("tiendanube_variant_id", tnItem.variant_id)
        .maybeSingle();

      localProductId = mapping?.local_product_id || null;
    }

    // Fallback: try by product_id
    if (!localProductId && tnItem.product_id) {
      const { data: mapping } = await supabaseAdmin
        .from("tiendanube_product_map")
        .select("local_product_id")
        .eq("store_id", storeId)
        .eq("tiendanube_product_id", tnItem.product_id)
        .maybeSingle();

      localProductId = mapping?.local_product_id || null;
    }

    const unitPrice = Number.parseFloat(tnItem.price) || 0;
    const itemTotal = unitPrice * tnItem.quantity;

    saleItems.push({
      sale_id: sale.id,
      product_id: localProductId,
      description: tnItem.name,
      sku: tnItem.sku,
      quantity: tnItem.quantity,
      unit_price: unitPrice,
      discount: 0,
      tax_rate: 21,
      total: itemTotal,
    });
  }

  if (saleItems.length > 0) {
    const { error: itemsError } = await supabaseAdmin
      .from("sale_items")
      .insert(saleItems);

    if (itemsError) throw itemsError;
  }

  // NOTE: Stock is NOT decremented here. The product/updated webhook from
  // Tiendanube will set the stock to the correct value, avoiding double
  // decrement when both order/created and product/updated fire.

  // Save the order mapping for idempotency
  await supabaseAdmin.from("tiendanube_order_map").insert({
    store_id: storeId,
    local_sale_id: sale.id,
    tiendanube_order_id: tiendanubeOrderId,
  });

  revalidateTag("sales", "minutes");
  revalidateTag("products", "minutes");

  return { saleId: sale.id };
}

// ============================================================================
// STOCK SYNC AFTER LOCAL SALE
// ============================================================================

/**
 * Sync stock to Tiendanube for all mapped products in a sale.
 * Called after a local sale completes. Non-blocking — errors are logged but
 * never propagated to the caller.
 */
export async function syncSaleStockToTiendanube(
  productIds: string[],
): Promise<void> {
  if (productIds.length === 0) return;

  // Check if there's a connected TN store
  const { data: store } = await supabaseAdmin
    .from("tiendanube_stores")
    .select("store_id")
    .limit(1)
    .maybeSingle();

  if (!store) return;

  // Get all mappings for these products in a single query
  const { data: mappings } = await supabaseAdmin
    .from("tiendanube_product_map")
    .select("local_product_id, tiendanube_product_id, tiendanube_variant_id")
    .eq("store_id", store.store_id)
    .in("local_product_id", productIds);

  if (!mappings || mappings.length === 0) return;

  // Sync all in parallel, without blocking if any fails
  const results = await Promise.allSettled(
    mappings
      .filter((m) => m.tiendanube_variant_id)
      .map((m) =>
        syncStockToTiendanubeAction(m.local_product_id, store.store_id),
      ),
  );

  // Log errors silently
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(
        `Error syncing product ${mappings[i].local_product_id} to TN:`,
        r.reason,
      );
    }
  });
}

// ============================================================================
// WEBHOOK MANAGEMENT
// ============================================================================

/**
 * Register the standard webhooks for a Tiendanube store.
 */
export async function registerWebhooksAction(storeId: string) {
  const { createTiendanubeWebhook } = await import("@/lib/services/tiendanube");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const webhookUrl = `${baseUrl}/api/tiendanube/webhooks`;

  const events = [
    "order/created",
    "order/paid",
    "product/updated",
    "app/uninstalled",
  ];

  const results: Array<{ event: string; success: boolean; error?: string }> =
    [];

  for (const event of events) {
    try {
      await createTiendanubeWebhook(storeId, event, webhookUrl);
      results.push({ event, success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      results.push({ event, success: false, error: msg });
    }
  }

  return results;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Map a Tiendanube product to local product fields.
 */
function mapTiendanubeProductToLocal(
  tnProduct: TiendanubeProduct,
  categoryMap: Map<number, string>,
) {
  const variant = tnProduct.variants[0];
  const categoryId =
    tnProduct.categories.length > 0
      ? categoryMap.get(tnProduct.categories[0].id) || null
      : null;

  return {
    name: extractI18n(tnProduct.name),
    description: extractI18n(tnProduct.description) || null,
    sku: variant?.sku || `TN-${tnProduct.id}`,
    barcode: variant?.barcode || null,
    price: parsePrice(variant?.price) ?? 0,
    cost: parsePrice(variant?.cost) ?? null,
    image_url: tnProduct.images[0]?.src || null,
    category_id: categoryId,
    active: tnProduct.published,
    track_stock: variant?.stock_management ?? false,
    product_type: "PRODUCT" as const,
    visibility: "SALES_AND_PURCHASES" as const,
    tax_rate: 21,
    currency: "ARS",
  };
}

/**
 * Create a local product from Tiendanube data.
 */
async function createLocalProductFromTiendanube(
  productData: ReturnType<typeof mapTiendanubeProductToLocal>,
  stock: number,
  locationId: string | undefined,
  userId: string,
) {
  const { data: product, error } = await supabaseAdmin
    .from("products")
    .insert({
      ...productData,
      stock_quantity: stock,
    })
    .select("id, name")
    .single();

  if (error) throw error;

  // Create stock record if location exists and tracking is enabled
  if (locationId && productData.track_stock) {
    await supabaseAdmin.from("stock").insert({
      product_id: product.id,
      location_id: locationId,
      quantity: stock,
    });

    if (stock > 0) {
      await supabaseAdmin.from("stock_movements").insert({
        product_id: product.id,
        location_to_id: locationId,
        quantity: stock,
        reason: "Sincronización desde Tiendanube",
        reference_type: "TIENDANUBE_SYNC",
        created_by: userId,
      });
    }
  }

  return product;
}

/**
 * Update a local product with Tiendanube data.
 */
async function updateLocalProductFromTiendanube(
  localProductId: string,
  productData: ReturnType<typeof mapTiendanubeProductToLocal>,
  stock: number,
  locationId: string | undefined,
  userId: string,
) {
  const { error } = await supabaseAdmin
    .from("products")
    .update({
      ...productData,
      stock_quantity: stock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", localProductId);

  if (error) throw error;

  // Update stock if location exists and tracking is enabled
  if (locationId && productData.track_stock) {
    // Get current stock
    const { data: currentStock } = await supabaseAdmin
      .from("stock")
      .select("id, quantity")
      .eq("product_id", localProductId)
      .eq("location_id", locationId)
      .maybeSingle();

    const previousQty = currentStock?.quantity ?? 0;
    const diff = stock - previousQty;

    if (currentStock) {
      await supabaseAdmin
        .from("stock")
        .update({ quantity: stock, updated_at: new Date().toISOString() })
        .eq("id", currentStock.id);
    } else {
      await supabaseAdmin.from("stock").insert({
        product_id: localProductId,
        location_id: locationId,
        quantity: stock,
      });
    }

    if (diff !== 0) {
      await supabaseAdmin.from("stock_movements").insert({
        product_id: localProductId,
        ...(diff > 0
          ? { location_to_id: locationId, quantity: diff }
          : { location_from_id: locationId, quantity: Math.abs(diff) }),
        reason: "Sincronización desde Tiendanube",
        reference_type: "TIENDANUBE_SYNC",
        created_by: userId,
      });
    }
  }
}

/**
 * Sync Tiendanube categories to local categories.
 * Returns a map of Tiendanube category ID → local category ID.
 */
async function syncCategoriesFromTiendanube(
  tnCategories: Array<{ id: number; name: Record<string, string> }>,
): Promise<Map<number, string>> {
  const map = new Map<number, string>();

  for (const tnCat of tnCategories) {
    const name = extractI18n(tnCat.name);
    if (!name) continue;

    // Try to find existing category by name
    const { data: existing } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("name", name)
      .eq("active", true)
      .maybeSingle();

    if (existing) {
      map.set(tnCat.id, existing.id);
    } else {
      // Create new category
      const { data: newCat, error } = await supabaseAdmin
        .from("categories")
        .insert({ name, active: true })
        .select("id")
        .single();

      if (!error && newCat) {
        map.set(tnCat.id, newCat.id);
      }
    }
  }

  revalidateTag("categories", "minutes");
  return map;
}
