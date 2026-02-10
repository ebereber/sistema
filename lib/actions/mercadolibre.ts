"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getMeliAccount, meliApiFetch } from "@/lib/mercadolibre";
import {
  getAllMeliItemIds,
  getMeliItems,
  updateMeliItemStock,
} from "@/lib/services/mercadolibre";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { MeliItem } from "@/types/mercadolibre";
import { revalidateTag } from "next/cache";

// ============================================================================
// DISCONNECT
// ============================================================================

/**
 * Disconnect a MercadoLibre account.
 * Deletes product/order mappings and the account record.
 */
export async function disconnectMercadoLibreAction(meliUserId: number) {
  const organizationId = await getOrganizationId();

  // Verify the account belongs to this organization
  const { data: account } = await supabaseAdmin
    .from("mercadolibre_accounts")
    .select("id")
    .eq("meli_user_id", meliUserId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!account) {
    throw new Error("Cuenta de Mercado Libre no encontrada");
  }

  // Delete product mappings
  await supabaseAdmin
    .from("mercadolibre_product_map")
    .delete()
    .eq("meli_user_id", meliUserId);

  // Delete order mappings
  await supabaseAdmin
    .from("mercadolibre_order_map")
    .delete()
    .eq("meli_user_id", meliUserId);

  // Delete the account
  const { error } = await supabaseAdmin
    .from("mercadolibre_accounts")
    .delete()
    .eq("meli_user_id", meliUserId)
    .eq("organization_id", organizationId);

  if (error) throw error;

  revalidateTag("mercadolibre", "minutes");
}

// ============================================================================
// PRICE LIST
// ============================================================================

/**
 * Update the price list associated with the MercadoLibre account.
 */
export async function updateMeliPriceListAction(
  priceListId: string | null,
): Promise<void> {
  const organizationId = await getOrganizationId();

  const { error } = await supabaseAdmin
    .from("mercadolibre_accounts")
    .update({
      price_list_id: priceListId,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId);

  if (error) throw error;

  revalidateTag("mercadolibre", "minutes");
}

// ============================================================================
// PRICE HELPERS
// ============================================================================

type PriceListAdjustment = {
  adjustment_type: "AUMENTO" | "DESCUENTO";
  adjustment_percentage: number;
};

/**
 * Calculate the adjusted price to push TO MercadoLibre (local → MeLi).
 */
function getMeliAdjustedPrice(
  basePrice: number,
  priceList?: PriceListAdjustment,
): number {
  if (!priceList) return basePrice;
  const pct = Number(priceList.adjustment_percentage);
  if (pct <= 0) return basePrice;
  if (priceList.adjustment_type === "AUMENTO") {
    return Math.round(basePrice * (1 + pct / 100));
  }
  return Math.round(basePrice * (1 - pct / 100));
}

/**
 * Reverse-calculate the local price FROM a MercadoLibre price.
 * Inverse of getMeliAdjustedPrice.
 */
function getMeliReversePrice(
  meliPrice: number,
  priceList?: PriceListAdjustment,
): number {
  if (!priceList) return meliPrice;
  const pct = Number(priceList.adjustment_percentage);
  if (pct <= 0 || pct >= 100) return meliPrice;
  if (priceList.adjustment_type === "AUMENTO") {
    return Math.round(meliPrice / (1 + pct / 100));
  }
  return Math.round(meliPrice / (1 - pct / 100));
}

/**
 * Fetch the price list adjustment data for a MeLi account.
 */
async function fetchPriceListForAccount(
  priceListId: string | null,
): Promise<PriceListAdjustment | undefined> {
  if (!priceListId) return undefined;
  const { data: pl } = await supabaseAdmin
    .from("price_lists")
    .select("adjustment_type, adjustment_percentage")
    .eq("id", priceListId)
    .eq("active", true)
    .maybeSingle();
  if (pl) return pl as PriceListAdjustment;
  return undefined;
}

// ============================================================================
// PRODUCT SYNC: MercadoLibre → Local
// ============================================================================

interface MeliProductData {
  name: string;
  price: number;
  stock: number;
  image_url: string | null;
  active: boolean;
  sku: string;
}

/**
 * Sync products FROM MercadoLibre INTO the local database.
 *
 * For each MeLi item:
 * 1. Check if it already exists in the mapping table
 * 2. If mapped: update the local product
 * 3. If not mapped: create a new local product + mapping
 * 4. Sync stock records and movements
 *
 * Items with multiple variations become separate local products.
 * Since mercadolibre_product_map has no meli_variation_id column,
 * we encode "itemId-variationId" in meli_item_id for variation-level mappings.
 */
export async function syncProductsFromMercadoLibreAction(): Promise<{
  created: number;
  updated: number;
  removed: number;
  errors: string[];
}> {
  const organizationId = await getOrganizationId();
  const user = await getServerUser();
  if (!user) throw new Error("Usuario no autenticado");

  const account = await getMeliAccount(organizationId);
  if (!account) throw new Error("No hay cuenta de MercadoLibre conectada");

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  // 1. Get all item IDs
  const itemIds = await getAllMeliItemIds(account);

  // 2. Get item details in batches of 20 (multiget)
  const meliItems = await getMeliItems(account, itemIds);

  // 3. Get existing mappings
  const { data: existingMappings } = await supabaseAdmin
    .from("mercadolibre_product_map")
    .select("id, meli_item_id, local_product_id")
    .eq("meli_user_id", account.meli_user_id);

  const mappingByMeliId = new Map(
    (existingMappings || []).map((m) => [m.meli_item_id, m]),
  );

  // 3b. Build set of current MeLi IDs (including variation keys) and clean orphans
  const currentMeliIds = new Set<string>();
  for (const item of meliItems) {
    if (item.variations && item.variations.length > 1) {
      for (const v of item.variations) {
        currentMeliIds.add(`${item.id}-${v.id}`);
      }
    } else {
      currentMeliIds.add(item.id);
    }
  }

  const orphanedMappings = (existingMappings || []).filter(
    (m) => !currentMeliIds.has(m.meli_item_id),
  );

  if (orphanedMappings.length > 0) {
    await supabaseAdmin
      .from("mercadolibre_product_map")
      .delete()
      .in(
        "id",
        orphanedMappings.map((m) => m.id),
      );
  }

  const removed = orphanedMappings.length;

  // 4. Get main location for stock assignment
  const { data: mainLocation } = await supabaseAdmin
    .from("locations")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_main", true)
    .eq("active", true)
    .maybeSingle();

  const locationId = mainLocation?.id;

  // 5. Fetch price list for reverse-price calculation
  const priceListData = await fetchPriceListForAccount(account.price_list_id);

  // 6. Process each item
  for (const item of meliItems) {
    try {
      if (item.variations && item.variations.length > 1) {
        // Item WITH multiple variations → each variation = 1 local product
        for (const variation of item.variations) {
          const mapKey = `${item.id}-${variation.id}`;
          const existing = mappingByMeliId.get(mapKey);

          const varAttrs = variation.attribute_combinations
            .map((a) => `${a.name}: ${a.value_name}`)
            .join(", ");
          const name = varAttrs ? `${item.title} - ${varAttrs}` : item.title;

          const productData: MeliProductData = {
            name,
            price: getMeliReversePrice(variation.price || item.price, priceListData),
            stock: variation.available_quantity,
            image_url: getItemImage(item, variation.picture_ids),
            active: item.status === "active",
            sku: variation.seller_custom_field || `${item.id}-${variation.id}`,
          };

          if (existing) {
            await updateLocalProductFromMeli(
              existing.local_product_id,
              productData,
              locationId,
              user.id,
            );
            await supabaseAdmin
              .from("mercadolibre_product_map")
              .update({ last_synced_at: new Date().toISOString() })
              .eq("meli_user_id", account.meli_user_id)
              .eq("meli_item_id", mapKey);
            updated++;
          } else {
            const newProduct = await createLocalProductFromMeli(
              productData,
              locationId,
              user.id,
              organizationId,
            );
            await supabaseAdmin.from("mercadolibre_product_map").insert({
              meli_user_id: account.meli_user_id,
              local_product_id: newProduct.id,
              meli_item_id: mapKey,
            });
            created++;
          }
        }
      } else {
        // Simple item (no variations or 1 variation)
        const existing = mappingByMeliId.get(item.id);

        const productData: MeliProductData = {
          name: item.title,
          price: getMeliReversePrice(item.price, priceListData),
          stock: item.available_quantity,
          image_url: item.pictures?.[0]?.secure_url || null,
          active: item.status === "active",
          sku: item.seller_custom_field || item.id,
        };

        if (existing) {
          await updateLocalProductFromMeli(
            existing.local_product_id,
            productData,
            locationId,
            user.id,
          );
          await supabaseAdmin
            .from("mercadolibre_product_map")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("meli_user_id", account.meli_user_id)
            .eq("meli_item_id", item.id);
          updated++;
        } else {
          const newProduct = await createLocalProductFromMeli(
            productData,
            locationId,
            user.id,
            organizationId,
          );
          await supabaseAdmin.from("mercadolibre_product_map").insert({
            meli_user_id: account.meli_user_id,
            local_product_id: newProduct.id,
            meli_item_id: item.id,
          });
          created++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      errors.push(`Item ${item.id}: ${msg}`);
    }
  }

  revalidateTag("products", "minutes");
  revalidateTag("mercadolibre", "minutes");

  return { created, updated, removed, errors };
}

// ============================================================================
// HELPERS
// ============================================================================

function getItemImage(
  item: MeliItem,
  variationPictureIds?: string[],
): string | null {
  if (variationPictureIds && variationPictureIds.length > 0) {
    const pic = item.pictures?.find((p) => p.id === variationPictureIds[0]);
    if (pic) return pic.secure_url;
  }
  return item.pictures?.[0]?.secure_url || null;
}

async function createLocalProductFromMeli(
  data: MeliProductData,
  locationId: string | undefined,
  userId: string,
  organizationId: string,
) {
  const { data: product, error } = await supabaseAdmin
    .from("products")
    .insert({
      name: data.name,
      sku: data.sku,
      price: data.price,
      cost: null,
      image_url: data.image_url,
      active: data.active,
      stock_quantity: data.stock,
      track_stock: true,
      product_type: "PRODUCT",
      visibility: "SALES_AND_PURCHASES",
      tax_rate: 21,
      currency: "ARS",
      organization_id: organizationId,
    })
    .select("id")
    .single();

  if (error) throw error;

  if (locationId) {
    await supabaseAdmin.from("stock").insert({
      product_id: product.id,
      location_id: locationId,
      quantity: data.stock,
    });

    if (data.stock > 0) {
      await supabaseAdmin.from("stock_movements").insert({
        product_id: product.id,
        location_to_id: locationId,
        quantity: data.stock,
        reason: "Sincronización desde MercadoLibre",
        reference_type: "MERCADOLIBRE_SYNC",
        created_by: userId,
      });
    }
  }

  return product;
}

async function updateLocalProductFromMeli(
  localProductId: string,
  data: MeliProductData,
  locationId: string | undefined,
  userId: string,
) {
  await supabaseAdmin
    .from("products")
    .update({
      name: data.name,
      price: data.price,
      image_url: data.image_url,
      active: data.active,
      stock_quantity: data.stock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", localProductId);

  if (locationId) {
    const { data: currentStock } = await supabaseAdmin
      .from("stock")
      .select("id, quantity")
      .eq("product_id", localProductId)
      .eq("location_id", locationId)
      .maybeSingle();

    const previousQty = currentStock?.quantity ?? 0;
    const diff = data.stock - previousQty;

    if (currentStock) {
      await supabaseAdmin
        .from("stock")
        .update({ quantity: data.stock, updated_at: new Date().toISOString() })
        .eq("id", currentStock.id);
    } else {
      await supabaseAdmin.from("stock").insert({
        product_id: localProductId,
        location_id: locationId,
        quantity: data.stock,
      });
    }

    if (diff !== 0) {
      await supabaseAdmin.from("stock_movements").insert({
        product_id: localProductId,
        ...(diff > 0
          ? { location_to_id: locationId, quantity: diff }
          : { location_from_id: locationId, quantity: Math.abs(diff) }),
        reason: "Sincronización desde MercadoLibre",
        reference_type: "MERCADOLIBRE_SYNC",
        created_by: userId,
      });
    }
  }
}

// ============================================================================
// ORDER IMPORT: MercadoLibre → Local Sale
// ============================================================================

/**
 * Import a MercadoLibre order as a local sale.
 * Uses mercadolibre_order_map for idempotency (avoids duplicate imports).
 */
export async function importMeliOrderAction(
  account: import("@/lib/mercadolibre").MeliAccount,
  meliOrderId: number,
): Promise<{ saleId: string }> {
  // Idempotency check
  const { data: existingMap } = await supabaseAdmin
    .from("mercadolibre_order_map")
    .select("id, local_sale_id")
    .eq("meli_user_id", account.meli_user_id)
    .eq("meli_order_id", meliOrderId)
    .maybeSingle();

  if (existingMap) {
    return { saleId: existingMap.local_sale_id };
  }

  // Fetch the order from MeLi
  const { getMeliOrder } = await import("@/lib/services/mercadolibre");
  const meliOrder = await getMeliOrder(account, meliOrderId);
  if (!meliOrder) throw new Error(`No se pudo obtener la orden ${meliOrderId} de MercadoLibre`);

  // Get main location
  const { data: mainLocation } = await supabaseAdmin
    .from("locations")
    .select("id")
    .eq("organization_id", account.organization_id)
    .eq("is_main", true)
    .eq("active", true)
    .maybeSingle();

  if (!mainLocation) {
    throw new Error("No se encontró una ubicación principal activa");
  }

  const locationId = mainLocation.id;

  // Generate sale number
  const { data: saleNumber, error: numError } = await supabaseAdmin.rpc(
    "generate_sale_number",
    { location_id_param: locationId },
  );
  if (numError) throw numError;

  // Determine initial status based on payment
  const isPaid = meliOrder.status === "paid" || meliOrder.paid_amount >= meliOrder.total_amount;
  const status = isPaid ? "COMPLETED" : "PENDING";

  // Resolve local customer
  const customerId = await resolveCustomerFromMeliOrder(meliOrder, account.organization_id);

  // Create the local sale
  const { data: sale, error: saleError } = await supabaseAdmin
    .from("sales")
    .insert({
      sale_number: saleNumber,
      sale_date: meliOrder.date_created,
      voucher_type: "COMPROBANTE_X",
      status,
      location_id: locationId,
      customer_id: customerId,
      subtotal: meliOrder.total_amount,
      discount: 0,
      tax: 0,
      total: meliOrder.total_amount,
      amount_paid: isPaid ? meliOrder.total_amount : 0,
      notes: `Orden de MercadoLibre #${meliOrder.id}`,
      created_by: account.user_id,
      organization_id: account.organization_id,
    })
    .select("id")
    .single();

  if (saleError) throw saleError;

  // Map order items to sale items
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

  for (const orderItem of meliOrder.order_items) {
    // Look up local product via mapping
    let localProductId: string | null = null;

    // Try variation key first (itemId-variationId)
    if (orderItem.item.variation_id) {
      const mapKey = `${orderItem.item.id}-${orderItem.item.variation_id}`;
      const { data: mapping } = await supabaseAdmin
        .from("mercadolibre_product_map")
        .select("local_product_id")
        .eq("meli_user_id", account.meli_user_id)
        .eq("meli_item_id", mapKey)
        .maybeSingle();

      localProductId = mapping?.local_product_id || null;
    }

    // Fallback: try by item ID only
    if (!localProductId) {
      const { data: mapping } = await supabaseAdmin
        .from("mercadolibre_product_map")
        .select("local_product_id")
        .eq("meli_user_id", account.meli_user_id)
        .eq("meli_item_id", orderItem.item.id)
        .maybeSingle();

      localProductId = mapping?.local_product_id || null;
    }

    const unitPrice = orderItem.unit_price;
    const itemTotal = unitPrice * orderItem.quantity;

    saleItems.push({
      sale_id: sale.id,
      product_id: localProductId,
      description: orderItem.item.title,
      sku: orderItem.item.seller_sku,
      quantity: orderItem.quantity,
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

  // NOTE: Stock is NOT decremented here. The items/updated notification
  // from MeLi will set the stock to the correct value, avoiding double
  // decrement when both orders_v2 and items fire.

  // Save order mapping for idempotency
  await supabaseAdmin.from("mercadolibre_order_map").insert({
    meli_user_id: account.meli_user_id,
    local_sale_id: sale.id,
    meli_order_id: meliOrderId,
  });

  // If paid, create customer payment
  if (isPaid && customerId) {
    try {
      await createPaymentForMeliOrder(sale.id, customerId, meliOrder, account);
    } catch (err) {
      console.error(`Error creating payment for MeLi order ${meliOrderId}:`, err);
    }
  }

  revalidateTag("sales", "minutes");

  return { saleId: sale.id };
}

/**
 * Handle a MeLi order payment update (PENDING → paid).
 * Called when orders_v2 fires for an already-imported order that is now paid.
 */
export async function handleMeliOrderPaymentUpdate(
  account: import("@/lib/mercadolibre").MeliAccount,
  meliOrderId: number,
): Promise<void> {
  // Find the local sale via order map
  const { data: orderMap } = await supabaseAdmin
    .from("mercadolibre_order_map")
    .select("local_sale_id")
    .eq("meli_user_id", account.meli_user_id)
    .eq("meli_order_id", meliOrderId)
    .maybeSingle();

  if (!orderMap) return; // Order not imported

  // Get the sale
  const { data: sale } = await supabaseAdmin
    .from("sales")
    .select("id, customer_id, total, amount_paid, status")
    .eq("id", orderMap.local_sale_id)
    .single();

  if (!sale) return;

  // Already paid — idempotent
  if (sale.amount_paid >= sale.total) return;

  // Fetch order from MeLi to check payment status
  const { getMeliOrder } = await import("@/lib/services/mercadolibre");
  const meliOrder = await getMeliOrder(account, meliOrderId);
  if (!meliOrder) return;

  const isPaid = meliOrder.status === "paid" || meliOrder.paid_amount >= meliOrder.total_amount;
  if (!isPaid) return;

  if (!sale.customer_id) {
    console.error(`Cannot create payment for sale ${sale.id}: no customer_id`);
    return;
  }

  await createPaymentForMeliOrder(sale.id, sale.customer_id, meliOrder, account);

  // Update sale status
  await supabaseAdmin
    .from("sales")
    .update({
      amount_paid: sale.total,
      status: "COMPLETED",
    })
    .eq("id", sale.id);

  revalidateTag("sales", "minutes");
  revalidateTag("customer-payments", "minutes");
}

/**
 * Create a customer payment record for a paid MeLi order.
 */
async function createPaymentForMeliOrder(
  saleId: string,
  customerId: string,
  meliOrder: import("@/types/mercadolibre").MeliOrder,
  account: import("@/lib/mercadolibre").MeliAccount,
): Promise<void> {
  // Get sale to determine amount
  const { data: sale } = await supabaseAdmin
    .from("sales")
    .select("total, amount_paid")
    .eq("id", saleId)
    .single();

  if (!sale) return;

  const amountToPay = sale.total - sale.amount_paid;
  if (amountToPay <= 0) return;

  // Generate payment number
  const { data: paymentNumber, error: numError } = await supabaseAdmin.rpc(
    "generate_customer_payment_number",
    { pos_number: 1 },
  );
  if (numError) throw numError;

  // Create customer payment
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("customer_payments")
    .insert({
      payment_number: paymentNumber,
      customer_id: customerId,
      payment_date: new Date().toISOString(),
      total_amount: amountToPay,
      notes: `Pago recibido en MercadoLibre - Orden #${meliOrder.id}`,
      status: "completed",
      created_by: account.user_id,
      organization_id: account.organization_id,
    })
    .select("id")
    .single();

  if (paymentError) throw paymentError;

  // Create allocation linking payment to sale
  const { error: allocError } = await supabaseAdmin
    .from("customer_payment_allocations")
    .insert({
      customer_payment_id: payment.id,
      sale_id: saleId,
      amount: amountToPay,
    });

  if (allocError) throw allocError;

  // Create payment method
  const { error: methodError } = await supabaseAdmin
    .from("customer_payment_methods")
    .insert({
      customer_payment_id: payment.id,
      method_name: "MercadoLibre",
      amount: amountToPay,
    });

  if (methodError) throw methodError;
}

/**
 * Resolve (find or create) a local customer from a MeLi order's buyer data.
 * Returns the local customer ID, or null if the order has no usable buyer info.
 */
async function resolveCustomerFromMeliOrder(
  meliOrder: import("@/types/mercadolibre").MeliOrder,
  organizationId: string,
): Promise<string | null> {
  const buyer = meliOrder.buyer;
  if (!buyer) return null;

  const name = [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || buyer.nickname;
  if (!name) return null;

  // Try to find by email first
  if (buyer.email) {
    const { data: byEmail } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("email", buyer.email)
      .eq("active", true)
      .maybeSingle();

    if (byEmail) return byEmail.id;
  }

  // Create a new customer
  const { data: newCustomer, error } = await supabaseAdmin
    .from("customers")
    .insert({
      name,
      email: buyer.email || null,
      active: true,
      organization_id: organizationId,
    })
    .select("id")
    .single();

  if (error || !newCustomer) {
    console.error("Error creating customer from MeLi order:", error);
    return null;
  }

  revalidateTag("customers", "minutes");
  return newCustomer.id;
}

// ============================================================================
// STOCK SYNC: Local → MercadoLibre
// ============================================================================

/**
 * Parse a meli_item_id that may contain a variation suffix.
 * "MLA123456789" → { itemId: "MLA123456789", variationId: null }
 * "MLA123456789-98765" → { itemId: "MLA123456789", variationId: 98765 }
 */
function parseMeliItemKey(meliItemId: string): {
  itemId: string;
  variationId: number | null;
} {
  // MeLi item IDs start with "MLA" (or similar country prefix) followed by digits
  // Variation keys are "MLA123456789-98765" where the part after "-" is the variation ID
  const dashIndex = meliItemId.indexOf("-", 3); // skip country prefix
  if (dashIndex === -1) {
    return { itemId: meliItemId, variationId: null };
  }

  const potentialVarId = meliItemId.substring(dashIndex + 1);
  const variationId = parseInt(potentialVarId, 10);

  if (Number.isNaN(variationId)) {
    return { itemId: meliItemId, variationId: null };
  }

  return {
    itemId: meliItemId.substring(0, dashIndex),
    variationId,
  };
}

/**
 * Sync stock to MercadoLibre for all mapped products after a local stock change.
 * Non-blocking — errors are logged but never propagated.
 */
export async function syncSaleStockToMercadoLibre(
  productIds: string[],
): Promise<void> {
  if (productIds.length === 0) return;

  // Find any connected MeLi account that maps these products
  const { data: mappings } = await supabaseAdmin
    .from("mercadolibre_product_map")
    .select("local_product_id, meli_item_id, meli_user_id")
    .in("local_product_id", productIds);

  if (!mappings || mappings.length === 0) return;

  // Get unique meli_user_ids to fetch accounts
  const meliUserIds = [...new Set(mappings.map((m) => m.meli_user_id))];

  // Fetch accounts with valid tokens
  const accounts = new Map<number, Awaited<ReturnType<typeof getMeliAccount>>>();
  for (const meliUserId of meliUserIds) {
    const { data: accountData } = await supabaseAdmin
      .from("mercadolibre_accounts")
      .select("organization_id")
      .eq("meli_user_id", meliUserId)
      .maybeSingle();

    if (accountData) {
      const account = await getMeliAccount(accountData.organization_id);
      if (account) {
        accounts.set(meliUserId, account);
      }
    }
  }

  if (accounts.size === 0) return;

  // Fetch price list data for each account
  const priceListsByUserId = new Map<number, PriceListAdjustment | undefined>();
  for (const [meliUserId, account] of accounts) {
    if (account) {
      const plData = await fetchPriceListForAccount(account.price_list_id);
      priceListsByUserId.set(meliUserId, plData);
    }
  }

  // Get current stock and price for each mapped product
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, stock_quantity, price")
    .in(
      "id",
      mappings.map((m) => m.local_product_id),
    );

  const productMap = new Map(
    (products || []).map((p) => [p.id, { stock: p.stock_quantity ?? 0, price: p.price ?? 0 }]),
  );

  // Sync all in parallel
  const results = await Promise.allSettled(
    mappings.map((m) => {
      const account = accounts.get(m.meli_user_id);
      if (!account) return Promise.resolve();

      const product = productMap.get(m.local_product_id);
      const stock = Math.max(0, product?.stock ?? 0);
      const priceList = priceListsByUserId.get(m.meli_user_id);
      const adjustedPrice = getMeliAdjustedPrice(product?.price ?? 0, priceList);
      const { itemId, variationId } = parseMeliItemKey(m.meli_item_id);
      return updateMeliItemStock(account, itemId, variationId, stock, adjustedPrice);
    }),
  );

  // Log errors silently
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(
        `Error syncing product ${mappings[i].local_product_id} to MeLi:`,
        r.reason,
      );
    }
  });
}

/**
 * Push all local prices (adjusted) to MercadoLibre.
 * Useful after changing the price list or updating local prices.
 */
export async function syncPricesToMercadoLibreAction(): Promise<{
  updated: number;
  priceSkipped: number;
  errors: string[];
}> {
  const organizationId = await getOrganizationId();
  const account = await getMeliAccount(organizationId);
  if (!account) throw new Error("No hay cuenta de MercadoLibre conectada");

  const { data: mappings } = await supabaseAdmin
    .from("mercadolibre_product_map")
    .select("local_product_id, meli_item_id")
    .eq("meli_user_id", account.meli_user_id);

  if (!mappings || mappings.length === 0)
    return { updated: 0, priceSkipped: 0, errors: [] };

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, price")
    .in(
      "id",
      mappings.map((m) => m.local_product_id),
    );

  const priceMap = new Map(
    (products || []).map((p) => [p.id, p.price ?? 0]),
  );

  const priceListData = await fetchPriceListForAccount(account.price_list_id);

  let updated = 0;
  let priceSkipped = 0;
  const errors: string[] = [];

  for (const m of mappings) {
    try {
      const basePrice = priceMap.get(m.local_product_id) ?? 0;
      const adjustedPrice = getMeliAdjustedPrice(basePrice, priceListData);
      const { itemId } = parseMeliItemKey(m.meli_item_id);
      const response = await meliApiFetch(account, `/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ price: adjustedPrice }),
      });
      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        if (errBody.includes("item.price.not_modifiable")) {
          console.warn(
            `MeLi: price not modifiable for ${itemId} (catalog item)`,
          );
          priceSkipped++;
          continue;
        }
        throw new Error(`${response.status} ${errBody}`);
      }
      updated++;
    } catch (err) {
      errors.push(
        `${m.meli_item_id}: ${err instanceof Error ? err.message : "Error"}`,
      );
    }
  }

  return { updated, priceSkipped, errors };
}
