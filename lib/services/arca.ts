// Servicio ARCA (server-only) — SDK wrapper para facturación electrónica
import { Arca } from "@arcasdk/core";
import type { IIva, INextVoucher } from "@arcasdk/core/lib/domain/types/voucher.types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

// --- Constantes de mapeo ---

export const VOUCHER_TYPE_TO_ARCA: Record<string, number> = {
  FACTURA_A: 1,
  FACTURA_B: 6,
  FACTURA_C: 11,
  NC_A: 3,
  NC_B: 8,
  NC_C: 13,
};

const DOC_TIPO: Record<string, number> = {
  CUIT: 80,
  CUIL: 86,
  DNI: 96,
  CF: 99,
};

const IVA_ALICUOTA: Record<number, number> = {
  0: 3,
  10.5: 4,
  21: 5,
  27: 6,
  5: 8,
  2.5: 9,
};

// Mapeo condición IVA receptor a código ARCA
const CONDICION_IVA_RECEPTOR: Record<string, number> = {
  "responsable inscripto": 1,
  "ri": 1,
  "monotributista": 6,
  "monotributo": 6,
  "exento": 4,
  "consumidor final": 5,
  "no responsable": 5,
};

// --- getArcaInstance ---

export async function getArcaInstance(organizationId: string): Promise<Arca> {
  // Leer credenciales
  const { data: creds, error: credsError } = await supabaseAdmin
    .from("arca_credentials")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (credsError) throw new Error(`Error leyendo credenciales ARCA: ${credsError.message}`);
  if (!creds?.certificate || !creds?.private_key) {
    throw new Error("No se encontraron certificados ARCA para esta organización");
  }

  // Leer config fiscal para obtener CUIT
  const { data: fiscalConfig, error: fcError } = await supabaseAdmin
    .from("fiscal_config")
    .select("cuit")
    .eq("organization_id", organizationId)
    .single();

  if (fcError || !fiscalConfig) throw new Error("No se encontró configuración fiscal");

  // Verificar si hay ticket WSFE válido
  const wsfeTicket = creds.wsfe_ticket as Record<string, unknown> | null;
  const wsfeExpiration = creds.wsfe_ticket_expiration
    ? new Date(creds.wsfe_ticket_expiration)
    : null;
  const isTicketValid = wsfeTicket && wsfeExpiration && wsfeExpiration > new Date();

  const arca = new Arca({
    cert: creds.certificate,
    key: creds.private_key,
    cuit: Number(fiscalConfig.cuit),
    production: process.env.NODE_ENV === "production",
    handleTicket: true,
    credentials: isTicketValid ? (wsfeTicket as never) : undefined,
  });

  return arca;
}

/**
 * Guarda los tickets actualizados después de una operación exitosa.
 * Se llama internamente después de createArcaVoucher.
 */
async function saveTickets(
  organizationId: string,
  _arca: Arca,
): Promise<void> {
  // El SDK maneja tickets internamente con handleTicket: true
  // Si en el futuro necesitamos persistir, se implementa aquí
}

// --- createArcaVoucher ---

interface ArcaVoucherResult {
  cae: string;
  caeExpiration: string;
  voucherNumber: number;
  fullResponse: unknown;
}

export async function createArcaVoucher(
  organizationId: string,
  saleId: string,
): Promise<ArcaVoucherResult> {
  // Leer venta completa con items y customer
  const { data: sale, error: saleError } = await supabaseAdmin
    .from("sales")
    .select(`
      *,
      sale_items (*),
      customers (*)
    `)
    .eq("id", saleId)
    .single();

  if (saleError || !sale) throw new Error(`Error leyendo venta: ${saleError?.message}`);

  const voucherType = sale.voucher_type;
  const cbteTipo = VOUCHER_TYPE_TO_ARCA[voucherType];
  if (!cbteTipo) throw new Error(`Tipo de comprobante no soportado: ${voucherType}`);

  // Leer PV fiscal activo
  const { data: fiscalPOS, error: posError } = await supabaseAdmin
    .from("fiscal_points_of_sale")
    .select("number")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("number", { ascending: true })
    .limit(1)
    .single();

  if (posError || !fiscalPOS) throw new Error("No se encontró punto de venta fiscal activo");

  // Leer fiscal config
  const { data: fiscalConfig, error: fcError } = await supabaseAdmin
    .from("fiscal_config")
    .select("condicion_iva")
    .eq("organization_id", organizationId)
    .single();

  if (fcError || !fiscalConfig) throw new Error("No se encontró configuración fiscal");

  const arca = await getArcaInstance(organizationId);
  const ptoVta = fiscalPOS.number;

  // Determinar DocTipo y DocNro
  const customer = sale.customers as { tax_id?: string | null; tax_id_type?: string | null; tax_category?: string | null } | null;
  let docTipo = DOC_TIPO.CF; // 99 = Consumidor Final
  let docNro = 0;

  if (customer?.tax_id && customer.tax_id !== "0") {
    const taxIdType = (customer.tax_id_type ?? "").toUpperCase();
    docTipo = DOC_TIPO[taxIdType] ?? DOC_TIPO.CF;
    docNro = Number(customer.tax_id.replace(/\D/g, ""));
  }

  // Condición IVA del receptor
  const receptorCategory = (customer?.tax_category ?? "consumidor final").toLowerCase();
  const condicionIVAReceptorId = CONDICION_IVA_RECEPTOR[receptorCategory] ?? 5;

  // Fecha formato YYYYMMDD
  const saleDate = new Date(sale.sale_date);
  const cbteFch = saleDate.toISOString().slice(0, 10).replace(/-/g, "");

  // Calcular montos según tipo de factura
  const isFacturaC = voucherType === "FACTURA_C" || voucherType === "NC_C";
  const items = sale.sale_items as Array<{
    unit_price: number;
    quantity: number;
    discount: number;
    tax_rate: number;
    total: number;
  }>;

  let impNeto: number;
  let impIVA: number;
  let ivaArray: IIva[] | undefined;

  if (isFacturaC) {
    // Factura C: ImpTotal = total, ImpNeto = total, ImpIVA = 0, sin desglose IVA
    impNeto = sale.total;
    impIVA = 0;
    ivaArray = undefined;
  } else {
    // Factura A/B: desglose de IVA por alícuota
    const ivaByRate = new Map<number, { baseImp: number; importe: number }>();

    for (const item of items) {
      const rate = item.tax_rate;
      const lineNeto = item.unit_price * item.quantity - item.discount;
      const lineIva = lineNeto * (rate / 100);

      const existing = ivaByRate.get(rate) ?? { baseImp: 0, importe: 0 };
      existing.baseImp += lineNeto;
      existing.importe += lineIva;
      ivaByRate.set(rate, existing);
    }

    impNeto = sale.subtotal;
    impIVA = sale.tax;
    ivaArray = Array.from(ivaByRate.entries()).map(([rate, vals]) => ({
      Id: IVA_ALICUOTA[rate] ?? 5, // default 21%
      BaseImp: Math.round(vals.baseImp * 100) / 100,
      Importe: Math.round(vals.importe * 100) / 100,
    }));
  }

  // Construir request
  const voucherReq: INextVoucher = {
    CantReg: 1,
    PtoVta: ptoVta,
    CbteTipo: cbteTipo,
    Concepto: 1, // Productos
    DocTipo: docTipo,
    DocNro: docNro,
    CbteFch: cbteFch,
    ImpTotal: Math.round(sale.total * 100) / 100,
    ImpTotConc: 0,
    ImpNeto: Math.round(impNeto * 100) / 100,
    ImpOpEx: 0,
    ImpIVA: Math.round(impIVA * 100) / 100,
    ImpTrib: 0,
    MonId: "PES",
    MonCotiz: 1,
    CondicionIVAReceptorId: condicionIVAReceptorId,
    ...(ivaArray && ivaArray.length > 0 ? { Iva: ivaArray } : {}),
  };

  const result = await arca.electronicBillingService.createNextVoucher(voucherReq);

  // Guardar tickets si es necesario
  await saveTickets(organizationId, arca);

  // Obtener número de comprobante del response
  const feDetResp = (result.response as { FEDetResp?: { FEDetResponse?: Array<{ CbteDesde?: number }> } })
    ?.FEDetResp?.FEDetResponse?.[0];
  const voucherNumber = feDetResp?.CbteDesde ?? 0;

  return {
    cae: result.cae,
    caeExpiration: result.caeFchVto,
    voucherNumber,
    fullResponse: result.response,
  };
}

// --- getTaxpayerDetails ---

export async function getTaxpayerDetails(
  organizationId: string,
  cuit: string,
) {
  const arca = await getArcaInstance(organizationId);
  return arca.registerInscriptionProofService.getTaxpayerDetails(Number(cuit));
}
