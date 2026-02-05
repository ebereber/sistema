"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

export async function archiveLocationAction(id: string): Promise<void> {
  // Unassign all POS from this location
  const { error: unassignError } = await supabaseAdmin
    .from("point_of_sale")
    .update({ location_id: null })
    .eq("location_id", id);

  if (unassignError) throw unassignError;

  const { error } = await supabaseAdmin
    .from("locations")
    .update({
      active: false,
      is_main: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("locations", "minutes");
  revalidateTag("points-of-sale", "minutes");
}

export async function restoreLocationAction(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("locations")
    .update({
      active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("locations", "minutes");
}

export async function deleteLocationAction(id: string): Promise<void> {
  // Check if any POS are assigned
  const { data: posData } = await supabaseAdmin
    .from("point_of_sale")
    .select("id")
    .eq("location_id", id)
    .limit(1);

  if (posData && posData.length > 0) {
    throw new Error(
      "No se puede eliminar una ubicación con puntos de venta asignados",
    );
  }

  const { error } = await supabaseAdmin.from("locations").delete().eq("id", id);

  if (error) throw error;

  revalidateTag("locations", "minutes");
}
export async function createLocationAction(data: {
  name: string;
  address?: string | null;
  is_main?: boolean;
  active?: boolean;
}) {
  // If setting as main, unmark others
  if (data.is_main) {
    const { error: updateError } = await supabaseAdmin
      .from("locations")
      .update({ is_main: false })
      .eq("is_main", true);

    if (updateError) throw updateError;
  }

  const { data: location, error } = await supabaseAdmin
    .from("locations")
    .insert(data)
    .select()
    .single();

  if (error) throw error;

  revalidateTag("locations", "minutes");

  return location;
}

export async function updateLocationAction(
  id: string,
  data: {
    name?: string;
    address?: string | null;
    is_main?: boolean;
    active?: boolean;
  },
) {
  // If setting as main, unmark others
  if (data.is_main) {
    const { error: updateError } = await supabaseAdmin
      .from("locations")
      .update({ is_main: false })
      .eq("is_main", true)
      .neq("id", id);

    if (updateError) throw updateError;
  }

  const { data: location, error } = await supabaseAdmin
    .from("locations")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  revalidateTag("locations", "minutes");

  return location;
}
