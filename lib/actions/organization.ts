"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

export async function updateOrganizationAction(data: {
  name: string;
  email: string | null;
  phone: string | null;
}) {
  const organizationId = await getOrganizationId();

  const { error } = await supabaseAdmin
    .from("organizations")
    .update({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
    })
    .eq("id", organizationId);

  if (error) throw error;

  revalidateTag("organization", "minutes");
}

export async function uploadOrganizationLogoAction(formData: FormData) {
  const organizationId = await getOrganizationId();
  const file = formData.get("file") as File;

  if (!file) throw new Error("No se proporcionó un archivo");
  if (file.size > 512 * 1024) throw new Error("El archivo excede 512KB");

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `${organizationId}/logo.${ext}`;

  // Upload to storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from("organizations")
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  // Get public URL
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("organizations").getPublicUrl(filePath);

  // Update organization record
  const { error: updateError } = await supabaseAdmin
    .from("organizations")
    .update({ logo_url: publicUrl })
    .eq("id", organizationId);

  if (updateError) throw updateError;

  revalidateTag("organization", "minutes");
  return publicUrl;
}

export async function completeOnboardingAction(data: {
  name: string;
  cuit: string;
  phone?: string;
}) {
  const user = await getServerUser();
  if (!user) throw new Error("Usuario no autenticado");

  // Create organization
  const { data: org, error: orgError } = await supabaseAdmin
    .from("organizations")
    .insert({
      name: data.name,
      cuit: data.cuit,
      phone: data.phone || null,
      onboarding_completed: true,
    })
    .select("id")
    .single();

  if (orgError) throw orgError;

  // Assign user to organization
  const { error: userError } = await supabaseAdmin
    .from("users")
    .update({ organization_id: org.id })
    .eq("id", user.id);

  if (userError) throw userError;

  // Create default location
  const { data: location, error: locationError } = await supabaseAdmin
    .from("locations")
    .insert({
      name: "Principal",
      is_main: true,
      active: true,
      organization_id: org.id,
    })
    .select("id")
    .single();

  if (locationError) throw locationError;

  // Create default point of sale (digital)
  const { data: pos, error: posError } = await supabaseAdmin
    .from("point_of_sale")
    .insert({
      number: 1,
      name: "Ejemplo",
      is_digital: true,
      location_id: null,
      enabled_for_arca: false,
      active: true,
      organization_id: org.id,
    })
    .select("id")
    .single();

  if (posError) throw posError;

  // Create default cash register
  const { error: cashRegisterError } = await supabaseAdmin
    .from("cash_registers")
    .insert({
      name: "Caja chica",
      location_id: location.id,
      point_of_sale_id: pos.id,
      status: "active",
      organization_id: org.id,
    });

  if (cashRegisterError) throw cashRegisterError;

  // Create default payment methods
  const { error: paymentMethodsError } = await supabaseAdmin
    .from("payment_methods")
    .insert([
      {
        name: "Efectivo",
        type: "EFECTIVO",
        icon: "Banknote",
        fee_percentage: 0,
        fee_fixed: 0,
        requires_reference: false,
        availability: "VENTAS_Y_COMPRAS",
        is_active: true,
        is_system: true,
        organization_id: org.id,
      },
      {
        name: "Tarjeta",
        type: "TARJETA",
        icon: "CreditCard",
        fee_percentage: 1.8,
        fee_fixed: 0,
        requires_reference: false,
        availability: "VENTAS_Y_COMPRAS",
        is_active: true,
        is_system: true,
        organization_id: org.id,
      },
      {
        name: "Transferencia",
        type: "TRANSFERENCIA",
        icon: "Landmark",
        fee_percentage: 0,
        fee_fixed: 0,
        requires_reference: false,
        availability: "VENTAS_Y_COMPRAS",
        is_active: true,
        is_system: true,
        organization_id: org.id,
      },
    ]);

  if (paymentMethodsError) throw paymentMethodsError;

  // Create default category
  const { error: categoryError } = await supabaseAdmin
    .from("categories")
    .insert({
      name: "General",
      description: null,
      parent_id: null,
      active: true,
      organization_id: org.id,
    });

  if (categoryError) throw categoryError;

  // Create default "Vendedor" role
  const { error: roleError } = await supabaseAdmin.from("roles").insert({
    name: "Vendedor",
    permissions: [
      "sales:read",
      "sales:write",
      "products:read",
      "customers:read",
      "customers:write",
    ],
    special_actions: [],
    is_system: false,
    active: true,
    organization_id: org.id,
  });

  if (roleError) throw roleError;

  revalidateTag("organization", "minutes");
  return org.id;
}
