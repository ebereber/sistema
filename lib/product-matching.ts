import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

// ============================================================================
// TYPES
// ============================================================================

export interface ProductIdentifiers {
  sku?: string | null;
  barcode?: string | null;
  name?: string; // For logging/debugging only
}

export interface MatchResult {
  found: boolean;
  productId: string | null;
  matchedBy: "sku" | "barcode" | null;
}

export interface DuplicateCandidate {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  image_url: string | null;
  price: number | null;
  stock_quantity: number | null;
  created_at: string;
  mappings: {
    mercadolibre: { meli_item_id: string; meli_user_id: number } | null;
    tiendanube: {
      tiendanube_product_id: number;
      tiendanube_variant_id: number | null;
      store_id: string;
    } | null;
  };
}

export interface DuplicateGroup {
  matchKey: string; // The SKU or barcode that links them
  matchType: "sku" | "barcode";
  products: DuplicateCandidate[];
}

// ============================================================================
// SKU NORMALIZATION
// ============================================================================

/**
 * Normalize a SKU for comparison.
 * - Trims whitespace
 * - Converts to uppercase
 * - Removes common MercadoLibre prefixes (MLA, MLB, MLM, etc.)
 * - Removes leading zeros
 */
export function normalizeSku(sku: string | null | undefined): string | null {
  if (!sku) return null;

  let normalized = sku.trim().toUpperCase();

  // Skip if it looks like a platform-generated ID (not a real SKU)
  // MLA123456789 or TN-12345 patterns
  if (
    /^(MLA|MLB|MLM|MLU|MLC|MCO|MPE|MLV|MEC|MRD|MBO|MPA|MNI|MCR|MSV|MGT|MHN)\d+$/.test(
      normalized,
    )
  ) {
    return null; // This is a MeLi item ID, not a real SKU
  }
  if (/^TN-\d+$/.test(normalized)) {
    return null; // This is a TN fallback ID, not a real SKU
  }

  // Remove MeLi country prefixes if they were added to an actual SKU
  // e.g., "MLA-SKU123" → "SKU123"
  normalized = normalized.replace(
    /^(MLA|MLB|MLM|MLU|MLC|MCO|MPE|MLV|MEC|MRD|MBO|MPA|MNI|MCR|MSV|MGT|MHN)[-_\s]?/,
    "",
  );

  // Remove leading zeros (but keep at least one character)
  normalized = normalized.replace(/^0+(?=.)/, "");

  return normalized || null;
}

/**
 * Normalize a barcode (EAN/UPC) for comparison.
 * - Trims whitespace
 * - Removes non-numeric characters
 * - Pads to standard lengths if needed (EAN-13, UPC-A)
 */
export function normalizeBarcode(
  barcode: string | null | undefined,
): string | null {
  if (!barcode) return null;

  // Remove all non-numeric characters
  const numeric = barcode.replace(/\D/g, "");

  if (numeric.length === 0) return null;

  // Valid barcode lengths: 8 (EAN-8), 12 (UPC-A), 13 (EAN-13), 14 (GTIN-14)
  if (![8, 12, 13, 14].includes(numeric.length)) {
    // If it's close to a valid length, it might be missing leading zeros
    if (numeric.length < 13) {
      return numeric.padStart(13, "0"); // Pad to EAN-13
    }
    // Otherwise return as-is (might be internal code)
    return numeric;
  }

  return numeric;
}

// ============================================================================
// PRODUCT MATCHING
// ============================================================================

/**
 * Find an existing product by SKU or barcode.
 * Returns the first match found, prioritizing SKU over barcode.
 *
 * @param identifiers - The SKU and/or barcode to search for
 * @param organizationId - The organization to search within
 * @param excludeProductId - Optional product ID to exclude (for updates)
 */
export async function findExistingProduct(
  identifiers: ProductIdentifiers,
  organizationId: string,
  excludeProductId?: string,
): Promise<MatchResult> {
  const normalizedSku = normalizeSku(identifiers.sku);
  const normalizedBarcode = normalizeBarcode(identifiers.barcode);

  // If no valid identifiers, can't match
  if (!normalizedSku && !normalizedBarcode) {
    return { found: false, productId: null, matchedBy: null };
  }

  // Try SKU first (more reliable)
  if (normalizedSku) {
    // We need to compare normalized SKUs, so we fetch all products with non-null SKUs
    // and normalize them for comparison. This is less efficient but more accurate.
    // For better performance at scale, consider adding a normalized_sku column.
    const { data: skuMatches } = await supabaseAdmin
      .from("products")
      .select("id, sku")
      .eq("organization_id", organizationId)
      .not("sku", "is", null);

    if (skuMatches) {
      for (const product of skuMatches) {
        if (excludeProductId && product.id === excludeProductId) continue;

        const productNormalizedSku = normalizeSku(product.sku);
        if (productNormalizedSku === normalizedSku) {
          return { found: true, productId: product.id, matchedBy: "sku" };
        }
      }
    }
  }

  // Try barcode
  if (normalizedBarcode) {
    const { data: barcodeMatches } = await supabaseAdmin
      .from("products")
      .select("id, barcode")
      .eq("organization_id", organizationId)
      .not("barcode", "is", null);

    if (barcodeMatches) {
      for (const product of barcodeMatches) {
        if (excludeProductId && product.id === excludeProductId) continue;

        const productNormalizedBarcode = normalizeBarcode(product.barcode);
        if (productNormalizedBarcode === normalizedBarcode) {
          return { found: true, productId: product.id, matchedBy: "barcode" };
        }
      }
    }
  }

  return { found: false, productId: null, matchedBy: null };
}

/**
 * Check if a product is already mapped to a specific platform.
 */
export async function isProductMappedTo(
  productId: string,
  platform: "mercadolibre" | "tiendanube",
  platformAccountId: number | string, // meli_user_id or store_id
): Promise<boolean> {
  if (platform === "mercadolibre") {
    const { data } = await supabaseAdmin
      .from("mercadolibre_product_map")
      .select("id")
      .eq("local_product_id", productId)
      .eq("meli_user_id", platformAccountId as number)
      .maybeSingle();

    return !!data;
  } else {
    const { data } = await supabaseAdmin
      .from("tiendanube_product_map")
      .select("id")
      .eq("local_product_id", productId)
      .eq("store_id", platformAccountId as string)
      .maybeSingle();

    return !!data;
  }
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

/**
 * Detect duplicate products in the database.
 * Returns groups of products that share the same SKU or barcode
 * but have separate product records.
 */
export async function detectDuplicateProducts(
  organizationId: string,
): Promise<DuplicateGroup[]> {
  // Get all products with their mappings
  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select(
      `
      id,
      name,
      sku,
      barcode,
      image_url,
      price,
      stock_quantity,
      created_at
    `,
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error || !products) {
    console.error("Error fetching products for duplicate detection:", error);
    return [];
  }

  // Get all mappings
  const productIds = products.map((p) => p.id);

  const { data: meliMappings } = await supabaseAdmin
    .from("mercadolibre_product_map")
    .select("local_product_id, meli_item_id, meli_user_id")
    .in("local_product_id", productIds);

  const { data: tnMappings } = await supabaseAdmin
    .from("tiendanube_product_map")
    .select(
      "local_product_id, tiendanube_product_id, tiendanube_variant_id, store_id",
    )
    .in("local_product_id", productIds);

  // Build mapping lookups
  const meliByProduct = new Map(
    (meliMappings || []).map((m) => [
      m.local_product_id,
      { meli_item_id: m.meli_item_id, meli_user_id: m.meli_user_id },
    ]),
  );

  const tnByProduct = new Map(
    (tnMappings || []).map((m) => [
      m.local_product_id,
      {
        tiendanube_product_id: m.tiendanube_product_id,
        tiendanube_variant_id: m.tiendanube_variant_id,
        store_id: m.store_id,
      },
    ]),
  );

  // Group by normalized SKU
  const skuGroups = new Map<string, DuplicateCandidate[]>();
  const barcodeGroups = new Map<string, DuplicateCandidate[]>();

  for (const product of products) {
    const candidate: DuplicateCandidate = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      image_url: product.image_url,
      price: product.price,
      stock_quantity: product.stock_quantity,
      created_at: product.created_at,
      mappings: {
        mercadolibre: meliByProduct.get(product.id) || null,
        tiendanube: tnByProduct.get(product.id) || null,
      },
    };

    const normalizedSku = normalizeSku(product.sku);
    if (normalizedSku) {
      const group = skuGroups.get(normalizedSku) || [];
      group.push(candidate);
      skuGroups.set(normalizedSku, group);
    }

    const normalizedBarcode = normalizeBarcode(product.barcode);
    if (normalizedBarcode) {
      const group = barcodeGroups.get(normalizedBarcode) || [];
      group.push(candidate);
      barcodeGroups.set(normalizedBarcode, group);
    }
  }

  // Collect groups with more than one product
  const duplicates: DuplicateGroup[] = [];
  const processedProductIds = new Set<string>();

  // SKU duplicates (higher priority)
  for (const [sku, group] of skuGroups) {
    if (group.length > 1) {
      duplicates.push({
        matchKey: sku,
        matchType: "sku",
        products: group,
      });
      group.forEach((p) => processedProductIds.add(p.id));
    }
  }

  // Barcode duplicates (only if not already found via SKU)
  for (const [barcode, group] of barcodeGroups) {
    // Filter out products already in SKU groups
    const uniqueProducts = group.filter((p) => !processedProductIds.has(p.id));
    if (uniqueProducts.length > 1) {
      duplicates.push({
        matchKey: barcode,
        matchType: "barcode",
        products: uniqueProducts,
      });
    }
  }

  return duplicates;
}

// ============================================================================
// DUPLICATE MERGE
// ============================================================================

export interface MergeResult {
  success: boolean;
  survivorId: string;
  mergedIds: string[];
  error?: string;
}

/**
 * Merge duplicate products into a single record.
 * The first product in the array becomes the "survivor" - all mappings
 * from other products are transferred to it, and the duplicates are deleted.
 *
 * @param productIds - Array of product IDs to merge (first one survives)
 * @param organizationId - Organization ID for verification
 */
export async function mergeDuplicateProducts(
  productIds: string[],
  organizationId: string,
): Promise<MergeResult> {
  if (productIds.length < 2) {
    return {
      success: false,
      survivorId: productIds[0] || "",
      mergedIds: [],
      error: "Se necesitan al menos 2 productos para fusionar",
    };
  }

  const [survivorId, ...duplicateIds] = productIds;

  // Verify all products belong to the organization
  const { data: products, error: fetchError } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("organization_id", organizationId)
    .in("id", productIds);

  if (fetchError || !products || products.length !== productIds.length) {
    return {
      success: false,
      survivorId,
      mergedIds: [],
      error: "Algunos productos no existen o no pertenecen a esta organización",
    };
  }

  try {
    // 1. Transfer MercadoLibre mappings to survivor
    const { error: meliError } = await supabaseAdmin
      .from("mercadolibre_product_map")
      .update({ local_product_id: survivorId })
      .in("local_product_id", duplicateIds);

    if (meliError) throw meliError;

    // 2. Transfer Tiendanube mappings to survivor
    const { error: tnError } = await supabaseAdmin
      .from("tiendanube_product_map")
      .update({ local_product_id: survivorId })
      .in("local_product_id", duplicateIds);

    if (tnError) throw tnError;

    // 3. Transfer stock records (sum quantities for same location)
    // First, get survivor's stock
    const { data: survivorStock } = await supabaseAdmin
      .from("stock")
      .select("id, location_id, quantity")
      .eq("product_id", survivorId);

    const survivorStockByLocation = new Map(
      (survivorStock || []).map((s) => [s.location_id, s]),
    );

    // Get duplicate stocks
    const { data: duplicateStocks } = await supabaseAdmin
      .from("stock")
      .select("id, product_id, location_id, quantity")
      .in("product_id", duplicateIds);

    for (const dupStock of duplicateStocks || []) {
      const existing = survivorStockByLocation.get(dupStock.location_id);
      if (existing) {
        // Add quantity to survivor's existing stock
        await supabaseAdmin
          .from("stock")
          .update({ quantity: existing.quantity + dupStock.quantity })
          .eq("id", existing.id);
      } else {
        // Transfer stock record to survivor
        await supabaseAdmin
          .from("stock")
          .update({ product_id: survivorId })
          .eq("id", dupStock.id);
      }
    }

    // 4. Transfer sale_items references
    await supabaseAdmin
      .from("sale_items")
      .update({ product_id: survivorId })
      .in("product_id", duplicateIds);

    // 5. Transfer purchase_order_items references (if table exists)
    try {
      await supabaseAdmin
        .from("purchase_order_items")
        .update({ product_id: survivorId })
        .in("product_id", duplicateIds);
    } catch {
      // Ignore if table doesn't exist
    }

    // 6. Transfer stock_movements references
    await supabaseAdmin
      .from("stock_movements")
      .update({ product_id: survivorId })
      .in("product_id", duplicateIds);

    // 7. Delete duplicate stock records that were transferred
    await supabaseAdmin.from("stock").delete().in("product_id", duplicateIds);

    // 8. Delete duplicate products
    const { error: deleteError } = await supabaseAdmin
      .from("products")
      .delete()
      .in("id", duplicateIds);

    if (deleteError) throw deleteError;

    return {
      success: true,
      survivorId,
      mergedIds: duplicateIds,
    };
  } catch (error) {
    console.error("Error merging products:", error);
    return {
      success: false,
      survivorId,
      mergedIds: [],
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
