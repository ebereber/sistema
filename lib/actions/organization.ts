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
  const { error: locationError } = await supabaseAdmin
    .from("locations")
    .insert({
      name: "Local principal",
      is_main: true,
      active: true,
      organization_id: org.id,
    });

  if (locationError) throw locationError;

  revalidateTag("organization", "minutes");
  return org.id;
}
