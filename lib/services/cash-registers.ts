import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

export type CashRegister = Omit<Tables<"cash_registers">, "status"> & {
  status: "active" | "archived";
  location?: {
    id: string;
    name: string;
  };
  point_of_sale?: {
    id: string;
    name: string;
    number: number;
  } | null;
};

export interface CreateCashRegisterData {
  name: string;
  location_id: string;
  point_of_sale_id?: string | null;
}

export interface UpdateCashRegisterData {
  name?: string;
  location_id?: string;
  point_of_sale_id?: string | null;
  status?: "active" | "archived";
}

// Obtener todas las cajas
export async function getCashRegisters(): Promise<CashRegister[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cash_registers")
    .select(
      `
      *,
      location:locations(id, name),
      point_of_sale:point_of_sale(id, name, number)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []) as unknown as CashRegister[];
}

// Obtener cajas por ubicación
export async function getCashRegistersByLocation(
  locationId: string,
): Promise<CashRegister[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cash_registers")
    .select(
      `
      *,
      location:locations(id, name),
      point_of_sale:point_of_sale(id, name, number)
    `,
    )
    .eq("location_id", locationId)
    .eq("status", "active")
    .order("name");

  if (error) throw error;

  return (data || []) as unknown as CashRegister[];
}

// Obtener una caja por ID
export async function getCashRegisterById(
  id: string,
): Promise<CashRegister | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cash_registers")
    .select(
      `
      *,
      location:locations(id, name),
      point_of_sale:point_of_sale(id, name, number)
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as unknown as CashRegister;
}

// Crear caja
export async function createCashRegister(
  data: CreateCashRegisterData,
): Promise<CashRegister> {
  const supabase = createClient();

  const { data: created, error } = await supabase
    .from("cash_registers")
    .insert({
      name: data.name,
      location_id: data.location_id,
      point_of_sale_id: data.point_of_sale_id || null,
    })
    .select(
      `
      *,
      location:locations(id, name),
      point_of_sale:point_of_sale(id, name, number)
    `,
    )
    .single();

  if (error) throw error;

  return created as unknown as CashRegister;
}

// Actualizar caja
export async function updateCashRegister(
  id: string,
  data: UpdateCashRegisterData,
): Promise<CashRegister> {
  const supabase = createClient();

  const { data: updated, error } = await supabase
    .from("cash_registers")
    .update(data)
    .eq("id", id)
    .select(
      `
      *,
      location:locations(id, name),
      point_of_sale:point_of_sale(id, name, number)
    `,
    )
    .single();

  if (error) throw error;

  return updated as unknown as CashRegister;
}

// Archivar/Desarchivar caja
export async function toggleCashRegisterStatus(
  id: string,
): Promise<CashRegister> {
  const supabase = createClient();

  // Primero obtener el estado actual
  const { data: current, error: fetchError } = await supabase
    .from("cash_registers")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const newStatus = current.status === "active" ? "archived" : "active";

  const { data: updated, error } = await supabase
    .from("cash_registers")
    .update({ status: newStatus })
    .eq("id", id)
    .select(
      `
      *,
      location:locations(id, name),
      point_of_sale:point_of_sale(id, name, number)
    `,
    )
    .single();

  if (error) throw error;

  return updated as unknown as CashRegister;
}

// Eliminar caja
export async function deleteCashRegister(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("cash_registers").delete().eq("id", id);

  if (error) throw error;
}

// Get all active cash registers
export async function getActiveCashRegisters(): Promise<CashRegister[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cash_registers")
    .select(
      `
      *,
      location:locations(id, name),
      point_of_sale:point_of_sale(id, name, number)
    `,
    )
    .eq("status", "active")
    .order("name");

  if (error) throw error;

  return (data || []) as unknown as CashRegister[];
}
