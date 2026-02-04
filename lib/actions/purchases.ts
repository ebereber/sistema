"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

export async function deletePurchaseAction(id: string) {
  // Check for payment allocations first
  const { count } = await supabaseAdmin
    .from("supplier_payment_allocations")
    .select("id", { count: "exact", head: true })
    .eq("purchase_id", id);

  if (count && count > 0) {
    throw new Error(
      "No se puede eliminar esta compra porque tiene pagos asociados",
    );
  }
  // Get purchase with items
  const { data: purchase, error: fetchError } = await supabaseAdmin
    .from("purchases")
    .select(
      `
      *,
      items:purchase_items(*)
    `,
    )
    .eq("id", id)
    .single();

  if (fetchError) throw new Error("Compra no encontrada");
  if (!purchase) throw new Error("Compra no encontrada");

  // If products were received, revert stock
  if (purchase.products_received && purchase.location_id && purchase.items) {
    for (const item of purchase.items) {
      if (item.product_id && item.type === "product") {
        const { error: stockError } = await supabaseAdmin.rpc(
          "decrease_stock",
          {
            p_product_id: item.product_id,
            p_location_id: purchase.location_id,
            p_quantity: item.quantity,
          },
        );

        if (stockError) {
          console.error("Error decreasing stock:", stockError);
        }
      }
    }
  }

  // Delete purchase (items will cascade)
  const { error } = await supabaseAdmin.from("purchases").delete().eq("id", id);

  if (error) throw error;

  revalidateTag("purchases", "minutes");
  revalidateTag("products", "minutes");
}

export async function updatePurchaseNoteAction(
  id: string,
  notes: string | null,
) {
  const { error } = await supabaseAdmin
    .from("purchases")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidateTag(`purchase-${id}`, "minutes");
}
