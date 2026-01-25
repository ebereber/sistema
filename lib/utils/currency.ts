/**
 * Parsea un string de monto en formato argentino a número
 * Ejemplos válidos:
 * - "4220,40" → 4220.40
 * - "4.220,40" → 4220.40
 * - "4220" → 4220
 * - "$4.220,40" → 4220.40
 */
export function parseArgentineCurrency(value: string): number {
  if (!value) return 0;

  // Remover símbolos de moneda y espacios
  let cleaned = value.replace(/[$\s]/g, "");

  // Si tiene punto Y coma, asumir formato argentino (punto = miles, coma = decimal)
  if (cleaned.includes(".") && cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }
  // Si solo tiene coma, asumir que es decimal
  else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  // Si solo tiene punto, puede ser miles o decimal
  else if (cleaned.includes(".")) {
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      // Múltiples puntos = separadores de miles
      cleaned = cleaned.replace(/\./g, "");
    } else if (parts.length === 2) {
      // Un solo punto - verificar si es decimal o miles
      if (parts[1].length <= 2) {
        // Asumir decimal (ej: "4220.40")
      } else {
        // Asumir miles (ej: "4.220")
        cleaned = cleaned.replace(".", "");
      }
    }
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formatea un número a formato de moneda argentina
 * 4220.40 → "$4.220,40"
 */
export function formatArgentineCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// lib/utils/currency.ts

export type PriceRoundingType = "none" | "multiples_10" | "multiples_100";

export function applyPriceRounding(
  price: number,
  type: PriceRoundingType,
): number {
  switch (type) {
    case "none":
      return price;
    case "multiples_10":
      return Math.round(price / 10) * 10;
    case "multiples_100":
      return Math.round(price / 100) * 100;
    default:
      return price;
  }
}
