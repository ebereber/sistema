"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

export async function createCustomerAction(data: {
  name: string;
  tax_id?: string | null;
  tax_id_type?: string | null;
  legal_entity_type?: string | null;
  tax_category?: string | null;
  email?: string | null;
  phone?: string | null;
  street_address?: string | null;
  apartment?: string | null;
  postal_code?: string | null;
  province?: string | null;
  city?: string | null;
  trade_name?: string | null;
  notes?: string | null;
  assigned_seller_id?: string | null;
  price_list_id?: string | null;
  payment_terms?: string | null;
  active?: boolean;
}) {
  const organizationId = await getOrganizationId();

  const { data: customer, error } = await supabaseAdmin
    .from("customers")
    .insert({
      name: data.name,
      organization_id: organizationId,
      tax_id: data.tax_id || null,
      tax_id_type: data.tax_id_type || null,
      legal_entity_type: data.legal_entity_type || null,
      tax_category: data.tax_category || null,
      email: data.email || null,
      phone: data.phone || null,
      street_address: data.street_address || null,
      apartment: data.apartment || null,
      postal_code: data.postal_code || null,
      province: data.province || null,
      city: data.city || null,
      trade_name: data.trade_name || null,
      notes: data.notes || null,
      assigned_seller_id: data.assigned_seller_id || null,
      price_list_id: data.price_list_id || null,
      payment_terms: data.payment_terms || null,
      active: data.active ?? true,
    })
    .select()
    .single();

  if (error) throw error;

  revalidateTag("customers", "minutes");

  return customer;
}

export async function updateCustomerAction(
  id: string,
  data: {
    name: string;
    tax_id?: string | null;
    tax_id_type?: string | null;
    legal_entity_type?: string | null;
    tax_category?: string | null;
    email?: string | null;
    phone?: string | null;
    street_address?: string | null;
    apartment?: string | null;
    postal_code?: string | null;
    province?: string | null;
    city?: string | null;
    trade_name?: string | null;
    notes?: string | null;
    assigned_seller_id?: string | null;
    price_list_id?: string | null;
    payment_terms?: string | null;
    active?: boolean;
  },
) {
  const { data: customer, error } = await supabaseAdmin
    .from("customers")
    .update({
      name: data.name,
      tax_id: data.tax_id || null,
      tax_id_type: data.tax_id_type || null,
      legal_entity_type: data.legal_entity_type || null,
      tax_category: data.tax_category || null,
      email: data.email || null,
      phone: data.phone || null,
      street_address: data.street_address || null,
      apartment: data.apartment || null,
      postal_code: data.postal_code || null,
      province: data.province || null,
      city: data.city || null,
      trade_name: data.trade_name || null,
      notes: data.notes || null,
      assigned_seller_id: data.assigned_seller_id || null,
      price_list_id: data.price_list_id || null,
      payment_terms: data.payment_terms || null,
      active: data.active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  revalidateTag("customers", "minutes");

  return customer;
}

export async function archiveCustomerAction(id: string) {
  const { error } = await supabaseAdmin
    .from("customers")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("customers", "minutes");
}

export async function unarchiveCustomerAction(id: string) {
  const { error } = await supabaseAdmin
    .from("customers")
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("customers", "minutes");
}

export async function deleteCustomerAction(id: string) {
  const { error } = await supabaseAdmin.from("customers").delete().eq("id", id);

  if (error) throw error;

  revalidateTag("customers", "minutes");
}
