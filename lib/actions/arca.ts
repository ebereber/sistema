"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { createArcaVoucher, getTaxpayerDetails } from "@/lib/services/arca";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";

// --- createArcaInvoiceAction ---

interface ArcaInvoiceResult {
  success: boolean;
  cae?: string;
  voucherNumber?: number;
  error?: string;
}

export async function createArcaInvoiceAction(
  saleId: string,
): Promise<ArcaInvoiceResult> {
  const organizationId = await getOrganizationId();

  try {
    const result = await createArcaVoucher(organizationId, saleId);

    // Actualizar la venta con los datos de ARCA
    const { error: updateError } = await supabaseAdmin
      .from("sales")
      .update({
        cae: result.cae,
        cae_expiration: result.caeExpiration,
        voucher_number: result.voucherNumber,
        arca_response: result.fullResponse as never,
      })
      .eq("id", saleId)
      .eq("organization_id", organizationId);

    if (updateError) {
      console.error("Error actualizando venta con datos ARCA:", updateError);
      return {
        success: false,
        cae: result.cae,
        voucherNumber: result.voucherNumber,
        error: `CAE obtenido pero error al guardar: ${updateError.message}`,
      };
    }

    revalidateTag("sales", "minutes");

    return {
      success: true,
      cae: result.cae,
      voucherNumber: result.voucherNumber,
    };
  } catch (error) {
    console.error("Error creando comprobante ARCA:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

// --- getArcaReadinessAction ---

interface ArcaReadiness {
  ready: boolean;
  missingSteps: string[];
  emisorCondicionIva: string | null;
  fiscalPointOfSaleNumber: number | null;
}

export async function getArcaReadinessAction(): Promise<ArcaReadiness> {
  const organizationId = await getOrganizationId();

  const missingSteps: string[] = [];
  let emisorCondicionIva: string | null = null;
  let fiscalPointOfSaleNumber: number | null = null;

  // Verificar fiscal_config
  const { data: fiscalConfig } = await supabaseAdmin
    .from("fiscal_config")
    .select("condicion_iva, delegacion_confirmada, cuit")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!fiscalConfig?.cuit || !fiscalConfig?.condicion_iva) {
    missingSteps.push("Completar datos fiscales");
  } else {
    emisorCondicionIva = fiscalConfig.condicion_iva;
  }

  if (!fiscalConfig?.delegacion_confirmada) {
    missingSteps.push("Confirmar delegación ARCA");
  }

  // Verificar credenciales
  const { data: creds } = await supabaseAdmin
    .from("arca_credentials")
    .select("certificate, private_key")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!creds?.certificate || !creds?.private_key) {
    missingSteps.push("Cargar certificados ARCA");
  }

  // Verificar punto de venta fiscal activo
  const { data: fiscalPOS } = await supabaseAdmin
    .from("fiscal_points_of_sale")
    .select("number")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!fiscalPOS) {
    missingSteps.push("Crear punto de venta fiscal");
  } else {
    fiscalPointOfSaleNumber = fiscalPOS.number;
  }

  return {
    ready: missingSteps.length === 0,
    missingSteps,
    emisorCondicionIva,
    fiscalPointOfSaleNumber,
  };
}

// --- saveArcaCredentialsAction ---

export async function saveArcaCredentialsAction(
  certificate: string,
  privateKey: string,
): Promise<void> {
  const organizationId = await getOrganizationId();

  const { error } = await supabaseAdmin
    .from("arca_credentials")
    .upsert(
      {
        organization_id: organizationId,
        certificate,
        private_key: privateKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    );

  if (error) throw new Error(`Error guardando certificados: ${error.message}`);
}

// --- getTaxpayerDataAction ---

export async function getTaxpayerDataAction(cuit: string) {
  const organizationId = await getOrganizationId();
  return getTaxpayerDetails(organizationId, cuit);
}
