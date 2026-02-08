import * as XLSX from "xlsx";
import { TEMPLATES, type ImportType } from "./templates";

// ─── Types ────────────────────────────────────────────

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string | number | null>;
  errors: string[];
}

export interface ParseResult {
  success: boolean;
  rows: ParsedRow[];
  totalRows: number;
  validRows: number;
  errorRows: number;
  headers: string[];
}

// ─── Helpers ──────────────────────────────────────────

function parseArgentineNumber(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;

  // Remove thousand separators (.) and replace decimal comma (,) with dot
  const cleaned = String(value)
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseBoolean(
  value: string | number | null | undefined,
): boolean | null {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value).trim().toLowerCase();
  if (["si", "sí", "yes", "true", "1", "activo"].includes(str)) return true;
  if (["no", "false", "0", "inactivo"].includes(str)) return false;
  return null;
}

function parseVisibility(value: string | null | undefined): string | null {
  if (!value) return null;
  const str = String(value).trim().toLowerCase();
  if (str.includes("ambos") || str.includes("both"))
    return "SALES_AND_PURCHASES";
  if (str.includes("venta")) return "SALES";
  if (str.includes("compra")) return "PURCHASES";
  return null;
}

function parseProductType(value: string | null | undefined): string | null {
  if (!value) return null;
  const str = String(value).trim().toLowerCase();
  if (str.includes("servicio") || str === "service") return "SERVICE";
  if (str.includes("combo") || str === "combo") return "COMBO";
  return "PRODUCT";
}

function parseTaxRate(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value).replace("%", "").replace(",", ".").trim();
  const num = parseFloat(str);
  if (isNaN(num)) return null;

  const validRates = [0, 2.5, 5, 10.5, 21, 27];

  // If user entered decimal form (0.21 → 21), convert to percentage
  if (num > 0 && num < 1) {
    const asPercent = num * 100;
    const match = validRates.find((r) => Math.abs(r - asPercent) < 0.1);
    if (match !== undefined) return match;
  }

  // Direct match
  const match = validRates.find((r) => Math.abs(r - num) < 0.1);
  return match ?? null;
}

// ─── Parser ───────────────────────────────────────────

export function parseImportFile(
  buffer: ArrayBuffer,
  importType: ImportType,
): ParseResult {
  const template = TEMPLATES[importType];
  const wb = XLSX.read(buffer, { type: "array" });

  const ws = wb.Sheets[template.sheetName] || wb.Sheets[wb.SheetNames[0]];
  if (!ws) {
    return {
      success: false,
      rows: [],
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      headers: [],
    };
  }

  // Read all data as array of arrays
  const rawData: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
  });

  // Headers are in row 2 (index 1)
  const headers = (rawData[1] || []).map((h) =>
    String(h || "")
      .replace(" *", "")
      .trim(),
  );

  // Data starts at row 4 (index 3)
  const dataRows = rawData
    .slice(3)
    .filter((row) =>
      row.some((cell) => cell !== null && cell !== undefined && cell !== ""),
    );

  const parsedRows: ParsedRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 4; // Excel row number (1-based + 3 header rows)
    const errors: string[] = [];
    const data: Record<string, string | number | null> = {};

    // Map each column
    template.columns.forEach((col, colIndex) => {
      const rawValue = row[colIndex];
      const key = col.header.replace(" *", "").trim();

      // Check required
      if (
        col.required &&
        (rawValue === null ||
          rawValue === undefined ||
          String(rawValue).trim() === "")
      ) {
        errors.push(`${key} es obligatorio`);
        data[key] = null;
        return;
      }

      data[key] =
        rawValue !== null && rawValue !== undefined
          ? String(rawValue).trim()
          : null;
    });

    // Type-specific validation
    if (importType === "products") {
      const price = parseArgentineNumber(data["Precio con IVA"]);
      const cost = parseArgentineNumber(data["Costo sin IVA"]);

      if (data["Precio con IVA"] && price === null) {
        errors.push("Precio con IVA tiene formato inválido");
      }
      if (data["Costo sin IVA"] && cost === null) {
        errors.push("Costo sin IVA tiene formato inválido");
      }
      if (data["Alícuota IVA"] && parseTaxRate(data["Alícuota IVA"]) === null) {
        errors.push(
          "Alícuota IVA inválida. Valores permitidos: 0%, 2.5%, 5%, 10.5%, 21%, 27%",
        );
      }
    }

    if (importType === "stock") {
      const quantity = parseArgentineNumber(data["Cantidad"]);
      if (data["Cantidad"] && quantity === null) {
        errors.push("Cantidad tiene formato inválido");
      }
    }

    if (importType === "prices") {
      const price = parseArgentineNumber(data["Precio con IVA"]);
      const cost = parseArgentineNumber(data["Costo sin IVA"]);
      if (data["Precio con IVA"] && price === null) {
        errors.push("Precio con IVA tiene formato inválido");
      }
      if (data["Costo sin IVA"] && cost === null) {
        errors.push("Costo sin IVA tiene formato inválido");
      }
    }

    parsedRows.push({ rowNumber, data, errors });
  }

  const errorRows = parsedRows.filter((r) => r.errors.length > 0).length;

  return {
    success: errorRows === 0,
    rows: parsedRows,
    totalRows: parsedRows.length,
    validRows: parsedRows.length - errorRows,
    errorRows,
    headers,
  };
}

// ─── Error file generator ─────────────────────────────

export function generateErrorFile(
  rows: ParsedRow[],
  importType: ImportType,
  importErrors?: Array<{ rowNumber: number; error: string }>,
): ArrayBuffer {
  const template = TEMPLATES[importType];

  // Merge import errors into rows
  if (importErrors) {
    for (const err of importErrors) {
      const row = rows.find((r) => r.rowNumber === err.rowNumber);
      if (row && !row.errors.includes(err.error)) {
        row.errors.push(err.error);
      }
    }
  }

  const errorRows = rows.filter((r) => r.errors.length > 0);

  const headers = [
    ...template.columns.map((c) => c.header.replace(" *", "")),
    "Errores",
  ];

  const wsData = [headers];
  for (const row of errorRows) {
    const values = template.columns.map((col) => {
      const key = col.header.replace(" *", "").trim();
      return row.data[key] ?? "";
    });
    values.push(row.errors.join("; "));
    wsData.push(values as string[]);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Errores");

  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

// ─── Re-export helpers for import service ─────────────

export {
  parseArgentineNumber,
  parseBoolean,
  parseProductType,
  parseTaxRate,
  parseVisibility,
};
