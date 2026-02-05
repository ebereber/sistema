"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

export async function deletePriceListAction(id: string): Promise<void> {
  // Check if any customers use this list
  const { data: customers } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("price_list_id", id)
    .limit(1);

  if (customers && customers.length > 0) {
    throw new Error(
      "No se puede eliminar una lista de precios asignada a clientes",
    );
  }

  const { error } = await supabaseAdmin
    .from("price_lists")
    .delete()
    .eq("id", id);

  if (error) throw error;

  revalidateTag("price-lists", "minutes");
}

export async function createPriceListAction(data: {
  name: string;
  description?: string | null;
  is_automatic?: boolean;
  adjustment_type?: string;
  adjustment_percentage?: number;
  includes_tax?: boolean;
}) {
  const { data: priceList, error } = await supabaseAdmin
    .from("price_lists")
    .insert(data)
    .select()
    .single();

  if (error) throw error;

  revalidateTag("price-lists", "minutes");

  return priceList;
}

export async function updatePriceListAction(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    is_automatic?: boolean;
    adjustment_type?: string;
    adjustment_percentage?: number;
    includes_tax?: boolean;
  },
) {
  const { data: priceList, error } = await supabaseAdmin
    .from("price_lists")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  revalidateTag("price-lists", "minutes");

  return priceList;
}
