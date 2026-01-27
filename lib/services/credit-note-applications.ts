import { createClient } from "@/lib/supabase/client";

export interface AvailableCreditNote {
  id: string;
  saleNumber: string;
  total: number;
  availableBalance: number;
  createdAt: string;
}

/**
 * Get available credit notes for a customer that can be applied to new sales
 */
export async function getAvailableCreditNotes(
  customerId: string | null
): Promise<AvailableCreditNote[]> {
  if (!customerId) return [];

  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_available_credit_notes", {
    customer_id_param: customerId,
  });

  if (error) throw error;

  return (data || []).map((nc: Record<string, unknown>) => ({
    id: nc.id as string,
    saleNumber: nc.sale_number as string,
    total: nc.total as number,
    availableBalance: nc.available_balance as number,
    createdAt: nc.created_at as string,
  }));
}

/**
 * Apply a credit note to a sale (track the application)
 */
export async function applyCreditNoteToSale(
  creditNoteId: string,
  saleId: string,
  amount: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("credit_note_applications").insert({
    credit_note_id: creditNoteId,
    applied_to_sale_id: saleId,
    amount,
  });

  if (error) throw error;
}
