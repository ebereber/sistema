"use server"

import { getOrganizationId } from "@/lib/auth/get-organization"
import { syncSaleStockToMercadoLibre } from "@/lib/actions/mercadolibre"
import { syncSaleStockToTiendanube } from "@/lib/actions/tiendanube"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidateTag } from "next/cache"

export async function batchUpsertStockAction(data: {
  changes: Array<{ product_id: string; location_id: string; quantity: number }>
  userId: string
}): Promise<{ updated: number }> {
  await getOrganizationId()

  let updated = 0

  for (const change of data.changes) {
    // Get current stock
    const { data: currentStock } = await supabaseAdmin
      .from("stock")
      .select("quantity")
      .eq("product_id", change.product_id)
      .eq("location_id", change.location_id)
      .single()

    const currentQty = currentStock?.quantity ?? 0

    if (currentQty === change.quantity) continue

    const diff = change.quantity - currentQty

    // Upsert stock record
    await supabaseAdmin.from("stock").upsert(
      {
        product_id: change.product_id,
        location_id: change.location_id,
        quantity: change.quantity,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,location_id" },
    )

    // Record stock movement
    await supabaseAdmin.from("stock_movements").insert({
      product_id: change.product_id,
      [diff > 0 ? "location_to_id" : "location_from_id"]: change.location_id,
      quantity: Math.abs(diff),
      reason: "Ajuste manual desde inventario",
      reference_type: "ADJUSTMENT",
      created_by: data.userId,
    })

    // Recalculate total stock from all locations
    const { data: allStock } = await supabaseAdmin
      .from("stock")
      .select("quantity")
      .eq("product_id", change.product_id)

    const totalStock = allStock?.reduce((sum, s) => sum + s.quantity, 0) ?? 0

    await supabaseAdmin
      .from("products")
      .update({
        stock_quantity: totalStock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", change.product_id)

    updated++
  }

  revalidateTag("products", "minutes")

  // Sync stock to integrations (fire-and-forget)
  const changedProductIds = data.changes.map((c) => c.product_id)
  if (changedProductIds.length > 0) {
    syncSaleStockToTiendanube(changedProductIds).catch(() => {})
    syncSaleStockToMercadoLibre(changedProductIds).catch(() => {})
  }

  return { updated }
}
