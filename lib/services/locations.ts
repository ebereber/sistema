import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";

export type Location = Tables<"locations"> & {
  points_of_sale?: {
    id: string;
    number: number;
    name: string;
    enabled_for_arca: boolean | null;
    is_digital?: boolean | null;
  }[];
  cash_registers?: {
    id: string;
    name: string;
    status: string;
    point_of_sale?: {
      id: string;
      number: number;
      name: string;
    } | null;
  }[];
};

export interface PointOfSaleBasic {
  id: string;
  number: number;
  name: string;
  is_digital: boolean | null;
  enabled_for_arca: boolean | null;
}

export type LocationInsert = TablesInsert<"locations">;
export type LocationUpdate = TablesUpdate<"locations">;

/**
 * Get all active locations with their assigned POS
 */
export async function getLocations(): Promise<Location[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("locations")
    .select(
      `
      *,
      points_of_sale:point_of_sale(id, number, name, enabled_for_arca),
      cash_registers(id, name, status, point_of_sale:point_of_sale(id, number, name))
    `,
    )
    .order("is_main", { ascending: false })
    .order("name");

  if (error) throw error;

  return data || [];
}

/**
 * Get location by ID with its assigned POS
 */
export async function getLocationById(id: string): Promise<Location> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("locations")
    .select(
      `
      *,
      points_of_sale:point_of_sale(id, number, name, is_digital, enabled_for_arca)
    `,
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new location
 * If is_main is true, unmarks other locations as main
 */
export async function createLocation(
  location: LocationInsert,
): Promise<Location> {
  const supabase = createClient();

  // If setting as main, unmark other main locations
  if (location.is_main) {
    const { error: updateError } = await supabase
      .from("locations")
      .update({ is_main: false })
      .eq("is_main", true);

    if (updateError) throw updateError;
  }

  const { data, error } = await supabase
    .from("locations")
    .insert(location)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a location
 * If is_main is true, unmarks other locations as main
 */
export async function updateLocation(
  id: string,
  location: LocationUpdate,
): Promise<Location> {
  const supabase = createClient();

  // If setting as main, unmark other main locations
  if (location.is_main) {
    const { error: updateError } = await supabase
      .from("locations")
      .update({ is_main: false })
      .eq("is_main", true)
      .neq("id", id);

    if (updateError) throw updateError;
  }

  const { data, error } = await supabase
    .from("locations")
    .update({ ...location, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Archive a location (soft delete)
 */
export async function archiveLocation(id: string): Promise<void> {
  const supabase = createClient();

  // First, unassign all POS from this location
  const { error: unassignError } = await supabase
    .from("point_of_sale")
    .update({ location_id: null })
    .eq("location_id", id);

  if (unassignError) throw unassignError;

  const { error } = await supabase
    .from("locations")
    .update({
      active: false,
      is_main: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Delete a location (only if no POS are assigned)
 */
export async function deleteLocation(id: string): Promise<void> {
  const supabase = createClient();

  // Check if any POS are assigned to this location
  const { data: posData, error: checkError } = await supabase
    .from("point_of_sale")
    .select("id")
    .eq("location_id", id)
    .limit(1);

  if (checkError) throw checkError;

  if (posData && posData.length > 0) {
    throw new Error(
      "No se puede eliminar una ubicación con puntos de venta asignados",
    );
  }

  // If no POS are assigned, delete the location
  const { error } = await supabase.from("locations").delete().eq("id", id);

  if (error) throw error;
}

/**
 * Get the main location
 */
export async function getMainLocation(): Promise<Location | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("is_main", true)
    .eq("active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // No encontrado
    throw error;
  }

  return data;
}
