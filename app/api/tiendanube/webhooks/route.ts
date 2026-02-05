import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * POST /api/tiendanube/webhooks
 *
 * Receives webhooks from Tiendanube.
 * Topics: orders/created, orders/paid, products/updated, app/uninstalled
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const storeId = body.store_id ? String(body.store_id) : null
    const event = body.event as string | undefined
    const entityId = body.id as number | undefined

    if (!storeId || !event) {
      return NextResponse.json(
        { error: "Missing store_id or event" },
        { status: 400 },
      )
    }

    // Verify that this store exists in our database
    const { data: store } = await supabaseAdmin
      .from("tiendanube_stores")
      .select("id, user_id")
      .eq("store_id", storeId)
      .maybeSingle()

    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 },
      )
    }

    switch (event) {
      case "orders/created":
      case "orders/paid":
        // Revalidate sales-related caches
        revalidateTag("sales", "minutes")
        break

      case "products/updated":
        if (entityId) {
          await handleProductUpdated(storeId, entityId, store.user_id)
        }
        revalidateTag("products", "minutes")
        break

      case "app/uninstalled":
        await handleAppUninstalled(storeId)
        break

      default:
        // Unknown event, acknowledge but do nothing
        break
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Tiendanube webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

/**
 * Handle product update webhook: fetch the updated product and sync it locally.
 */
async function handleProductUpdated(
  storeId: string,
  tiendanubeProductId: number,
  userId: string,
) {
  const { extractI18n, parsePrice } = await import("@/lib/tiendanube")

  // Check if we have a mapping for this product
  const { data: mapping } = await supabaseAdmin
    .from("tiendanube_product_map")
    .select("local_product_id")
    .eq("store_id", storeId)
    .eq("tiendanube_product_id", tiendanubeProductId)
    .maybeSingle()

  if (!mapping) return // Product not synced, nothing to do

  // Fetch the updated product from Tiendanube
  const { getTiendanubeProduct } = await import("@/lib/services/tiendanube")

  try {
    const tnProduct = await getTiendanubeProduct(storeId, tiendanubeProductId)
    const variant = tnProduct.variants[0]
    if (!variant) return

    // Update local product
    await supabaseAdmin
      .from("products")
      .update({
        name: extractI18n(tnProduct.name),
        description: extractI18n(tnProduct.description) || null,
        sku: variant.sku || `TN-${tnProduct.id}`,
        barcode: variant.barcode || null,
        price: parsePrice(variant.price) ?? 0,
        cost: parsePrice(variant.cost) ?? null,
        image_url: tnProduct.images[0]?.src || null,
        active: tnProduct.published,
        stock_quantity: variant.stock ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mapping.local_product_id)

    // Update stock in main location
    const { data: mainLocation } = await supabaseAdmin
      .from("locations")
      .select("id")
      .eq("is_main", true)
      .eq("active", true)
      .maybeSingle()

    if (mainLocation && variant.stock != null) {
      const { data: stockRecord } = await supabaseAdmin
        .from("stock")
        .select("id, quantity")
        .eq("product_id", mapping.local_product_id)
        .eq("location_id", mainLocation.id)
        .maybeSingle()

      const newQty = variant.stock
      const oldQty = stockRecord?.quantity ?? 0
      const diff = newQty - oldQty

      if (stockRecord) {
        await supabaseAdmin
          .from("stock")
          .update({
            quantity: newQty,
            updated_at: new Date().toISOString(),
          })
          .eq("id", stockRecord.id)
      } else {
        await supabaseAdmin.from("stock").insert({
          product_id: mapping.local_product_id,
          location_id: mainLocation.id,
          quantity: newQty,
        })
      }

      if (diff !== 0) {
        await supabaseAdmin.from("stock_movements").insert({
          product_id: mapping.local_product_id,
          ...(diff > 0
            ? { location_to_id: mainLocation.id, quantity: diff }
            : { location_from_id: mainLocation.id, quantity: Math.abs(diff) }),
          reason: "Webhook de Tiendanube: producto actualizado",
          reference_type: "TIENDANUBE_SYNC",
          created_by: userId,
        })
      }
    }

    // Update sync timestamp
    await supabaseAdmin
      .from("tiendanube_product_map")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("store_id", storeId)
      .eq("tiendanube_product_id", tiendanubeProductId)
  } catch (error) {
    console.error(
      `Webhook: Error syncing product ${tiendanubeProductId}:`,
      error,
    )
  }
}

/**
 * Handle app uninstalled: remove the store connection and all mappings.
 */
async function handleAppUninstalled(storeId: string) {
  // Delete product mappings
  await supabaseAdmin
    .from("tiendanube_product_map")
    .delete()
    .eq("store_id", storeId)

  // Delete store connection
  await supabaseAdmin
    .from("tiendanube_stores")
    .delete()
    .eq("store_id", storeId)

  revalidateTag("tiendanube", "minutes")
}
