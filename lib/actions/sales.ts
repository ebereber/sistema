"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidateTag } from "next/cache"

export async function updateSaleNotesAction(
  id: string,
  notes: string | null,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("sales")
    .update({ notes })
    .eq("id", id)

  if (error) throw error

  revalidateTag(`sale-${id}`, "minutes")
}

export async function cancelCreditNoteAction(
  creditNoteId: string,
  revertStock: boolean,
): Promise<void> {
  // Get the credit note with its items
  const { data: creditNote, error: ncError } = await supabaseAdmin
    .from("sales")
    .select(
      `
      *,
      items:sale_items(*)
    `,
    )
    .eq("id", creditNoteId)
    .single()

  if (ncError) throw ncError
  if (!creditNote) throw new Error("Nota de credito no encontrada")

  // Verify it's a credit note
  if (!creditNote.voucher_type.startsWith("NOTA_CREDITO")) {
    throw new Error("El comprobante no es una nota de credito")
  }

  // Check if NC has been applied to any sale
  const { data: applications } = await supabaseAdmin
    .from("credit_note_applications")
    .select("id, amount")
    .eq("credit_note_id", creditNoteId)

  if (applications && applications.length > 0) {
    throw new Error(
      "No se puede anular una nota de credito que ya fue aplicada a una venta",
    )
  }

  // Revert stock if requested
  if (revertStock && creditNote.items) {
    for (const item of creditNote.items) {
      if (item.product_id) {
        const { error: stockError } = await supabaseAdmin.rpc(
          "decrease_stock",
          {
            p_product_id: item.product_id,
            p_location_id: creditNote.location_id!,
            p_quantity: item.quantity,
          },
        )

        if (stockError) {
          console.error("Error revirtiendo stock:", stockError)
        }
      }
    }
  }

  // Update the credit note status to CANCELLED
  const { error: updateError } = await supabaseAdmin
    .from("sales")
    .update({
      status: "CANCELLED",
      notes: creditNote.notes
        ? `${creditNote.notes} | ANULADA el ${new Date().toLocaleDateString("es-AR")}`
        : `ANULADA el ${new Date().toLocaleDateString("es-AR")}`,
    })
    .eq("id", creditNoteId)

  if (updateError) throw updateError

  revalidateTag("sales", "minutes")
  revalidateTag(`sale-${creditNoteId}`, "minutes")
  revalidateTag("products", "minutes")
}
