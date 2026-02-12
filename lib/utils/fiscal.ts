// Utilidades puras de facturación fiscal (client + server)

export const VOUCHER_DISPLAY_NAMES: Record<string, string> = {
  COMPROBANTE_X: "Comprobante X",
  FACTURA_A: "Factura A",
  FACTURA_B: "Factura B",
  FACTURA_C: "Factura C",
  NC_A: "Nota de Crédito A",
  NC_B: "Nota de Crédito B",
  NC_C: "Nota de Crédito C",
};

/**
 * Determina el tipo de comprobante fiscal según la condición IVA del emisor y del receptor.
 *
 * Reglas ARCA:
 * - Emisor RI → Receptor RI = Factura A
 * - Emisor RI → Receptor otro = Factura B
 * - Emisor Monotributista o Exento → siempre Factura C
 */
export function determineVoucherType(
  emisorCondicionIva: string,
  receptorTaxCategory?: string | null,
): string {
  const emisorNorm = emisorCondicionIva.toLowerCase();

  // Monotributo o Exento siempre emite C
  if (emisorNorm.includes("monotribut") || emisorNorm.includes("exento")) {
    return "FACTURA_C";
  }

  // Responsable Inscripto
  if (emisorNorm.includes("responsable inscripto") || emisorNorm === "ri") {
    const receptorNorm = (receptorTaxCategory ?? "").toLowerCase();
    if (
      receptorNorm.includes("responsable inscripto") ||
      receptorNorm === "ri"
    ) {
      return "FACTURA_A";
    }
    return "FACTURA_B";
  }

  // Fallback: Factura C
  return "FACTURA_C";
}

/**
 * Retorna los tipos de comprobante disponibles para una combinación emisor/receptor.
 * Siempre incluye COMPROBANTE_X como opción.
 */
export function getAvailableFiscalVoucherTypes(
  emisorCondicionIva: string,
  receptorTaxCategory?: string | null,
): string[] {
  const fiscalType = determineVoucherType(
    emisorCondicionIva,
    receptorTaxCategory,
  );
  return ["COMPROBANTE_X", fiscalType];
}

/**
 * Determina si un tipo de comprobante es fiscal (requiere CAE de ARCA).
 */
export function isFiscalVoucher(voucherType: string): boolean {
  return (
    voucherType.startsWith("FACTURA_") || voucherType.startsWith("NC_")
  );
}

/**
 * Retorna el nombre legible de un tipo de comprobante.
 */
export function getVoucherDisplayName(voucherType: string): string {
  return VOUCHER_DISPLAY_NAMES[voucherType] ?? voucherType;
}
