"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

export async function saveFiscalConfigAction(data: {
  cuit: string;
  razon_social: string;
  condicion_iva: string;
  personeria?: string | null;
  domicilio_fiscal?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  codigo_postal?: string | null;
  inicio_actividades?: string | null;
  iibb?: string | null;
}) {
  const organizationId = await getOrganizationId();

  const { error } = await supabaseAdmin.from("fiscal_config").upsert(
    {
      organization_id: organizationId,
      cuit: data.cuit,
      razon_social: data.razon_social,
      condicion_iva: data.condicion_iva,
      personeria: data.personeria || null,
      domicilio_fiscal: data.domicilio_fiscal || null,
      localidad: data.localidad || null,
      provincia: data.provincia || null,
      codigo_postal: data.codigo_postal || null,
      inicio_actividades: data.inicio_actividades || null,
      iibb: data.iibb || null,
    },
    { onConflict: "organization_id" },
  );

  if (error) throw error;

  revalidateTag("fiscal-config", "minutes");
}

export async function updateFiscalSettingsAction(data: {
  iibb_exento?: boolean;
  es_agente_percepcion_iva?: boolean;
  es_agente_percepcion_iibb?: boolean;
  es_agente_retencion?: boolean;
  cbu_fce?: string | null;
  fecha_cierre?: string | null;
  delegacion_web_service?: boolean;
  punto_venta_creado_arca?: boolean;
}) {
  const organizationId = await getOrganizationId();

  const { error } = await supabaseAdmin
    .from("fiscal_config")
    .update(data)
    .eq("organization_id", organizationId);

  if (error) throw error;

  revalidateTag("fiscal-config", "minutes");
}

export async function confirmDelegationAction() {
  const organizationId = await getOrganizationId();

  const { error } = await supabaseAdmin
    .from("fiscal_config")
    .update({
      delegacion_confirmada: true,
      delegacion_confirmada_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId);

  if (error) throw error;

  revalidateTag("fiscal-config", "minutes");
}

export async function createFiscalPointOfSaleAction(data: {
  number: number;
  name: string;
  location_id?: string | null;
  voucher_types?: string[];
}) {
  const organizationId = await getOrganizationId();

  const { data: pos, error } = await supabaseAdmin
    .from("fiscal_points_of_sale")
    .insert({
      organization_id: organizationId,
      number: data.number,
      name: data.name,
      location_id: data.location_id || null,
      voucher_types: data.voucher_types || null,
      active: true,
    })
    .select()
    .single();

  if (error) throw error;

  revalidateTag("fiscal-config", "minutes");
  return pos;
}
