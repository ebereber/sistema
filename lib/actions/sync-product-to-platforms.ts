"use server";

import { getMeliAccount, meliApiFetch } from "@/lib/mercadolibre";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { tiendanubeFetch } from "@/lib/tiendanube";

// ============================================================================
// TYPES
// ============================================================================

type PriceListAdjustment = {
  adjustment_type: "AUMENTO" | "DESCUENTO";
  adjustment_percentage: number;
};

// ============================================================================
// HELPERS
// ============================================================================

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

function parseMeliItemKey(meliItemId: string): {
  itemId: string;
  variationId: number | null;
} {
  const dashIndex = meliItemId.indexOf("-", 3);
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// SYNC PRODUCT TO MERCADOLIBRE
// ============================================================================

/**
 * Sync a single product's price and stock to MercadoLibre.
 * Fire-and-forget - errors are logged but not propagated.
 */
export async function syncProductToMercadoLibre(
  productId: string,
): Promise<void> {
  // Get product data
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id, price, stock_quantity, organization_id")
    .eq("id", productId)
    .single();

  if (!product) return;

  // Get MeLi account
  const account = await getMeliAccount(product.organization_id);
  if (!account) return;

  // Get mapping
  const { data: mapping } = await supabaseAdmin
    .from("mercadolibre_product_map")
    .select("meli_item_id")
    .eq("local_product_id", productId)
    .eq("meli_user_id", account.meli_user_id)
    .maybeSingle();

  if (!mapping) return;

  // Get price list for adjustment
  let priceListData: PriceListAdjustment | undefined;
  if (account.price_list_id) {
    const { data: pl } = await supabaseAdmin
      .from("price_lists")
      .select("adjustment_type, adjustment_percentage")
      .eq("id", account.price_list_id)
      .eq("active", true)
      .maybeSingle();
    if (pl) priceListData = pl as PriceListAdjustment;
  }

  const adjustedPrice = getMeliAdjustedPrice(product.price ?? 0, priceListData);
  const stock = Math.max(0, product.stock_quantity ?? 0);
  const { itemId, variationId } = parseMeliItemKey(mapping.meli_item_id);

  try {
    if (variationId) {
      // Update variation stock
      await meliApiFetch(
        account,
        `/items/${itemId}/variations/${variationId}`,
        {
          method: "PUT",
          body: JSON.stringify({ available_quantity: stock }),
        },
      );
      // Update item-level price
      const priceResponse = await meliApiFetch(account, `/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ price: adjustedPrice }),
      });
      if (!priceResponse.ok) {
        const errBody = await priceResponse.text().catch(() => "");
        if (errBody.includes("item.price.not_modifiable")) {
          console.warn(
            `[MeLi] Price not modifiable for ${itemId} (catalog item)`,
          );
        }
      }
    } else {
      // Simple item - update both
      const response = await meliApiFetch(account, `/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({
          available_quantity: stock,
          price: adjustedPrice,
        }),
      });
      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        if (errBody.includes("item.price.not_modifiable")) {
          // Retry without price
          await meliApiFetch(account, `/items/${itemId}`, {
            method: "PUT",
            body: JSON.stringify({ available_quantity: stock }),
          });
          console.warn(
            `[MeLi] Price not modifiable for ${itemId}, stock updated`,
          );
        }
      }
    }
    console.log(
      `[MeLi] Synced product ${productId} → ${itemId} (price: ${adjustedPrice}, stock: ${stock})`,
    );
  } catch (error) {
    console.error(`[MeLi] Error syncing product ${productId}:`, error);
  }
}

// ============================================================================
// SYNC PRODUCT TO TIENDANUBE
// ============================================================================

/**
 * Sync a single product's price and stock to Tiendanube.
 * Fire-and-forget - errors are logged but not propagated.
 */
export async function syncProductToTiendanube(
  productId: string,
): Promise<void> {
  // Get product data
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id, price, stock_quantity")
    .eq("id", productId)
    .single();

  if (!product) return;

  // Get TN store
  const { data: store } = await supabaseAdmin
    .from("tiendanube_stores")
    .select("store_id")
    .limit(1)
    .maybeSingle();

  if (!store) return;

  // Get mapping
  const { data: mapping } = await supabaseAdmin
    .from("tiendanube_product_map")
    .select("tiendanube_product_id, tiendanube_variant_id")
    .eq("local_product_id", productId)
    .eq("store_id", store.store_id)
    .maybeSingle();

  if (!mapping || !mapping.tiendanube_variant_id) return;

  const stock = Math.max(0, product.stock_quantity ?? 0);
  const price = product.price ?? 0;

  try {
    // Update variant with both price and stock
    await tiendanubeFetch(
      store.store_id,
      `products/${mapping.tiendanube_product_id}/variants/${mapping.tiendanube_variant_id}`,
      {
        method: "PUT",
        body: { stock, price: price.toString() },
      },
    );
    console.log(
      `[TN] Synced product ${productId} → ${mapping.tiendanube_product_id}/${mapping.tiendanube_variant_id} (price: ${price}, stock: ${stock})`,
    );
  } catch (error) {
    console.error(`[TN] Error syncing product ${productId}:`, error);
  }
}

// ============================================================================
// SYNC PRODUCT TO ALL PLATFORMS
// ============================================================================

/**
 * Sync a product's price and stock to all connected platforms.
 * Call this after updating a product.
 */
export async function syncProductToPlatforms(productId: string): Promise<void> {
  await Promise.all([
    syncProductToMercadoLibre(productId).catch(() => {}),
    syncProductToTiendanube(productId).catch(() => {}),
  ]);
}

// ============================================================================
// BATCH SYNC TO ALL PLATFORMS
// ============================================================================

const BATCH_SIZE = 5; // Process 5 products at a time
const BATCH_DELAY_MS = 500; // Wait 500ms between batches to respect rate limits

/**
 * Sync multiple products' price and stock to all connected platforms.
 * Processes in batches to respect rate limits.
 * Fire-and-forget - errors are logged but not propagated.
 */
export async function syncProductsToPlatforms(
  productIds: string[],
): Promise<void> {
  if (productIds.length === 0) return;

  // Process in batches
  for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
    const batch = productIds.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(batch.map((id) => syncProductToPlatforms(id)));

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < productIds.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(
    `[Platforms] Batch sync completed for ${productIds.length} products`,
  );
}
