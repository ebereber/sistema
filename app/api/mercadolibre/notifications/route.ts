import { getMeliAccountByUserId, meliApiFetch } from "@/lib/mercadolibre";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * POST /api/mercadolibre/notifications
 *
 * Receives notifications from MercadoLibre.
 * Topics: items, orders_v2, questions
 *
 * MeLi sends:
 * {
 *   resource: "/items/MLA123456789",
 *   user_id: 123456,
 *   topic: "items",
 *   application_id: 789,
 *   attempts: 1,
 *   sent: "2024-01-01T00:00:00.000Z",
 *   received: "2024-01-01T00:00:00.000Z"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { resource, user_id: meliUserId, topic } = body;

    if (!resource || !meliUserId || !topic) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify this account exists
    const account = await getMeliAccountByUserId(meliUserId);
    if (!account) {
      // Acknowledge but ignore — account not connected
      return NextResponse.json({ ok: true });
    }

    switch (topic) {
      case "items": {
        // resource = "/items/MLA123456789"
        const meliItemId = resource.replace("/items/", "");
        await handleItemUpdated(account, meliItemId);
        revalidateTag("products", "minutes");
        break;
      }

      case "orders_v2": {
        // resource = "/orders/1234567890"
        const meliOrderId = parseInt(resource.replace("/orders/", ""), 10);
        if (!isNaN(meliOrderId)) {
          await handleOrderCreated(account, meliOrderId);
          revalidateTag("sales", "minutes");
        }
        break;
      }

      default:
        // questions, etc — acknowledge but ignore for now
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("MeLi notification error:", error);
    // Always return 200 to avoid MeLi retries on our errors
    return NextResponse.json({ ok: true });
  }
}

/**
 * Handle item update notification — sync product data locally.
 */
async function handleItemUpdated(
  account: import("@/lib/mercadolibre").MeliAccount,
  meliItemId: string,
) {
  // Check if we have a mapping
  const { data: mapping } = await supabaseAdmin
    .from("mercadolibre_product_map")
    .select("local_product_id")
    .eq("meli_user_id", account.meli_user_id)
    .eq("meli_item_id", meliItemId)
    .maybeSingle();

  if (!mapping) return;

  try {
    // Fetch updated item from MeLi
    const response = await meliApiFetch(account, `/items/${meliItemId}`);
    if (!response.ok) return;

    const item = await response.json();

    // Get local product tax_rate
    const { data: localProduct } = await supabaseAdmin
      .from("products")
      .select("tax_rate")
      .eq("id", mapping.local_product_id)
      .single();

    const taxRate = localProduct?.tax_rate ?? 21;
    const price = item.price ?? 0;

    // Update local product
    await supabaseAdmin
      .from("products")
      .update({
        name: item.title,
        price,
        image_url: item.pictures?.[0]?.url || null,
        active: item.status === "active",
        stock_quantity: item.available_quantity ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mapping.local_product_id);

    // Update stock in main location
    const { data: mainLocation } = await supabaseAdmin
      .from("locations")
      .select("id")
      .eq("organization_id", account.organization_id)
      .eq("is_main", true)
      .eq("active", true)
      .maybeSingle();

    if (mainLocation && item.available_quantity != null) {
      const { data: stockRecord } = await supabaseAdmin
        .from("stock")
        .select("id, quantity")
        .eq("product_id", mapping.local_product_id)
        .eq("location_id", mainLocation.id)
        .maybeSingle();

      const newQty = item.available_quantity;
      const oldQty = stockRecord?.quantity ?? 0;
      const diff = newQty - oldQty;

      if (stockRecord) {
        await supabaseAdmin
          .from("stock")
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq("id", stockRecord.id);
      } else {
        await supabaseAdmin.from("stock").insert({
          product_id: mapping.local_product_id,
          location_id: mainLocation.id,
          quantity: newQty,
        });
      }

      if (diff !== 0) {
        await supabaseAdmin.from("stock_movements").insert({
          product_id: mapping.local_product_id,
          ...(diff > 0
            ? { location_to_id: mainLocation.id, quantity: diff }
            : {
                location_from_id: mainLocation.id,
                quantity: Math.abs(diff),
              }),
          reason: "Notificación de MercadoLibre: producto actualizado",
          reference_type: "MERCADOLIBRE_SYNC",
          created_by: account.user_id,
        });
      }
    }

    // Update sync timestamp
    await supabaseAdmin
      .from("mercadolibre_product_map")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("meli_user_id", account.meli_user_id)
      .eq("meli_item_id", meliItemId);
  } catch (error) {
    console.error(`MeLi: Error syncing item ${meliItemId}:`, error);
  }
}

/**
 * Handle order notification — import order or update payment status.
 */
async function handleOrderCreated(
  account: import("@/lib/mercadolibre").MeliAccount,
  meliOrderId: number,
) {
  // Check if order was already imported
  const { data: existingOrder } = await supabaseAdmin
    .from("mercadolibre_order_map")
    .select("id")
    .eq("meli_user_id", account.meli_user_id)
    .eq("meli_order_id", meliOrderId)
    .maybeSingle();

  if (existingOrder) {
    // Order exists — this may be a payment update
    const { handleMeliOrderPaymentUpdate } = await import(
      "@/lib/actions/mercadolibre"
    );
    await handleMeliOrderPaymentUpdate(account, meliOrderId);
  } else {
    // New order — import it
    const { importMeliOrderAction } = await import(
      "@/lib/actions/mercadolibre"
    );
    await importMeliOrderAction(account, meliOrderId);
  }
}
