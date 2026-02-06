"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import type { PointOfSale } from "@/lib/services/point-of-sale";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

export async function deletePOSAction(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("point_of_sale")
    .delete()
    .eq("id", id);

  if (error) throw error;

  revalidateTag("points-of-sale", "minutes");
  revalidateTag("locations", "minutes");
}
export async function createPOSAction(data: {
  number: number;
  name: string;
  is_digital?: boolean;
  location_id?: string | null;
  enabled_for_arca?: boolean;
}) {
  // Validate digital POS should not have location
  if (data.is_digital && data.location_id) {
    throw new Error("Un punto de venta digital no puede tener ubicación");
  }

  // Check number uniqueness
  const { data: existing } = await supabaseAdmin
    .from("point_of_sale")
    .select("id")
    .eq("number", data.number)
    .eq("active", true)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error("Ya existe un punto de venta con ese número");
  }

  const organizationId = await getOrganizationId();

  const { data: pos, error } = await supabaseAdmin
    .from("point_of_sale")
    .insert({ ...data, organization_id: organizationId })
    .select()
    .single();

  if (error) throw error;

  revalidateTag("points-of-sale", "minutes");
  revalidateTag("locations", "minutes");

  return pos;
}

export async function updatePOSAction(
  id: string,
  data: {
    number?: number;
    name?: string;
    is_digital?: boolean;
    location_id?: string | null;
    enabled_for_arca?: boolean;
  },
) {
  if (data.is_digital && data.location_id) {
    throw new Error("Un punto de venta digital no puede tener ubicación");
  }

  // Check number uniqueness if changing
  if (data.number !== undefined) {
    const { data: existing } = await supabaseAdmin
      .from("point_of_sale")
      .select("id")
      .eq("number", data.number)
      .eq("active", true)
      .neq("id", id)
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error("Ya existe un punto de venta con ese número");
    }
  }

  const { data: pos, error } = await supabaseAdmin
    .from("point_of_sale")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  revalidateTag("points-of-sale", "minutes");
  revalidateTag("locations", "minutes");

  return pos;
}

export async function assignPOSToLocationAction(
  posId: string,
  locationId: string,
) {
  // Check if POS is digital
  const { data: pos } = await supabaseAdmin
    .from("point_of_sale")
    .select("is_digital")
    .eq("id", posId)
    .single();

  if (pos?.is_digital) {
    throw new Error(
      "No se puede asignar ubicación a un punto de venta digital",
    );
  }

  const { data: updatedPos, error } = await supabaseAdmin
    .from("point_of_sale")
    .update({ location_id: locationId, updated_at: new Date().toISOString() })
    .eq("id", posId)
    .select()
    .single();

  if (error) throw error;

  revalidateTag("points-of-sale", "minutes");
  revalidateTag("locations", "minutes");

  return updatedPos;
}

export async function getAvailablePOSAction(excludeLocationId?: string) {
  const organizationId = await getOrganizationId();

  const { data, error } = await supabaseAdmin
    .from("point_of_sale")
    .select("*, location:locations(id, name)")
    .eq("active", true)
    .eq("is_digital", false)
    .eq("organization_id", organizationId); // ← agregar esto

  if (error) throw error;

  const all = (data || []) as unknown as PointOfSale[];

  const available = all.filter((pos) => !pos.location_id);
  const assignedToOther = excludeLocationId
    ? all.filter(
        (pos) => pos.location_id && pos.location_id !== excludeLocationId,
      )
    : all.filter((pos) => pos.location_id);

  return { available, assignedToOther };
}

export async function unassignPOSFromLocationAction(posId: string) {
  const { data: pos, error } = await supabaseAdmin
    .from("point_of_sale")
    .update({ location_id: null, updated_at: new Date().toISOString() })
    .eq("id", posId)
    .select()
    .single();

  if (error) throw error;

  revalidateTag("points-of-sale", "minutes");
  revalidateTag("locations", "minutes");

  return pos;
}
