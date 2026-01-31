import { createClient } from "@/lib/supabase/client"
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types"

export type PointOfSale = Tables<"point_of_sale"> & {
  location?: LocationBasic | null
}

export interface LocationBasic {
  id: string
  name: string
}

export type PointOfSaleInsert = TablesInsert<"point_of_sale">
export type PointOfSaleUpdate = TablesUpdate<"point_of_sale">

/**
 * Get all active points of sale with their assigned location
 */
export async function getPointsOfSale(): Promise<PointOfSale[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("point_of_sale")
    .select(`
      *,
      location:locations(id, name)
    `)
    .eq("active", true)
    .order("number")

  if (error) throw error
  return data || []
}

/**
 * Get point of sale by ID with its assigned location
 */
export async function getPOSById(id: string): Promise<PointOfSale> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("point_of_sale")
    .select(`
      *,
      location:locations(id, name)
    `)
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a new point of sale
 * Validates digital/physical + location constraints
 */
export async function createPOS(pos: PointOfSaleInsert): Promise<PointOfSale> {
  const supabase = createClient()

  // Validate constraints
  if (!pos.is_digital && !pos.location_id) {
    throw new Error("Los puntos de venta físicos requieren una ubicación asignada")
  }
  if (pos.is_digital && pos.location_id) {
    throw new Error("Los puntos de venta digitales no pueden tener ubicación asignada")
  }

  // Check if number is unique
  const { data: existing, error: checkError } = await supabase
    .from("point_of_sale")
    .select("id")
    .eq("number", pos.number)
    .limit(1)

  if (checkError) throw checkError

  if (existing && existing.length > 0) {
    throw new Error(`Ya existe un punto de venta con el número ${pos.number}`)
  }

  const { data, error } = await supabase
    .from("point_of_sale")
    .insert(pos)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a point of sale
 * Validates digital/physical + location constraints
 */
export async function updatePOS(id: string, pos: PointOfSaleUpdate): Promise<PointOfSale> {
  const supabase = createClient()

  // Get current POS to check constraints
  const { data: currentPOS, error: fetchError } = await supabase
    .from("point_of_sale")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchError) throw fetchError

  const isDigital = pos.is_digital ?? currentPOS.is_digital
  const locationId = pos.location_id !== undefined ? pos.location_id : currentPOS.location_id

  // Validate constraints
  if (!isDigital && !locationId) {
    throw new Error("Los puntos de venta físicos requieren una ubicación asignada")
  }
  if (isDigital && locationId) {
    throw new Error("Los puntos de venta digitales no pueden tener ubicación asignada")
  }

  // Check if number is unique (if changing number)
  if (pos.number !== undefined && pos.number !== currentPOS.number) {
    const { data: existing, error: checkError } = await supabase
      .from("point_of_sale")
      .select("id")
      .eq("number", pos.number)
      .neq("id", id)
      .limit(1)

    if (checkError) throw checkError

    if (existing && existing.length > 0) {
      throw new Error(`Ya existe un punto de venta con el número ${pos.number}`)
    }
  }

  const { data, error } = await supabase
    .from("point_of_sale")
    .update({ ...pos, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Assign a POS to a location
 * Automatically reassigns if already assigned to another location
 */
export async function assignPOSToLocation(posId: string, locationId: string): Promise<PointOfSale> {
  const supabase = createClient()

  // Check if POS is digital
  const { data: pos, error: checkError } = await supabase
    .from("point_of_sale")
    .select("is_digital")
    .eq("id", posId)
    .single()

  if (checkError) throw checkError

  if (pos.is_digital) {
    throw new Error("Los puntos de venta digitales no pueden asignarse a una ubicación")
  }

  const { data, error } = await supabase
    .from("point_of_sale")
    .update({ location_id: locationId, updated_at: new Date().toISOString() })
    .eq("id", posId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Unassign a POS from its location
 */
export async function unassignPOSFromLocation(posId: string): Promise<PointOfSale> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("point_of_sale")
    .update({ location_id: null, updated_at: new Date().toISOString() })
    .eq("id", posId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get available POS for assignment
 * Returns available (no location) and assigned to other locations
 */
export async function getAvailablePOS(excludeLocationId?: string): Promise<{
  available: PointOfSale[]
  assignedToOther: PointOfSale[]
}> {
  const supabase = createClient()

  // Get all active physical POS
  const { data, error } = await supabase
    .from("point_of_sale")
    .select(`
      *,
      location:locations(id, name)
    `)
    .eq("active", true)
    .eq("is_digital", false)
    .order("number")

  if (error) throw error

  const allPOS = data || []

  // Split into available and assigned to other
  const available = allPOS.filter((pos) => !pos.location_id)
  const assignedToOther = allPOS.filter(
    (pos) => pos.location_id && pos.location_id !== excludeLocationId
  )

  return { available, assignedToOther }
}

/**
 * Delete a point of sale
 */
export async function deletePOS(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from("point_of_sale")
    .delete()
    .eq("id", id)

  if (error) throw error
}
