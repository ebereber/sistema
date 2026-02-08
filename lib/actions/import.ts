"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import {
  generateErrorFile,
  parseImportFile,
  type ParseResult,
} from "@/lib/import/parser";
import { revalidateTag } from "next/cache";

import type { ImportType } from "@/lib/import/templates";
import { executeImport, type ImportResult } from "../services/import";

export interface ImportActionResult {
  result: ImportResult;
  errorFileBase64?: string;
}

export async function importDataAction(
  formData: FormData,
): Promise<ImportActionResult> {
  const organizationId = await getOrganizationId();
  const file = formData.get("file") as File;
  const importType = formData.get("type") as ImportType;

  if (!file || !importType) {
    throw new Error("Archivo y tipo son requeridos");
  }

  const buffer = await file.arrayBuffer();

  // Parse
  const parsed = parseImportFile(buffer, importType);

  if (parsed.rows.length === 0) {
    throw new Error(
      "El archivo no contiene datos. Recordá que los datos empiezan en la fila 4.",
    );
  }

  // Execute import
  const result = await executeImport(importType, parsed.rows, organizationId);

  // Generate error file if there are errors
  let errorFileBase64: string | undefined;
  if (result.errors.length > 0) {
    const errorBuffer = generateErrorFile(
      parsed.rows,
      importType,
      result.errors.map((e) => ({ rowNumber: e.rowNumber, error: e.error })),
    );
    errorFileBase64 = Buffer.from(errorBuffer).toString("base64");
  }

  // Revalidate relevant caches
  if (importType === "products" || importType === "prices") {
    revalidateTag("products", "minutes");
  }
  if (importType === "stock") {
    revalidateTag("products", "minutes");
  }
  if (importType === "customers") {
    revalidateTag("customers", "minutes");
  }
  if (importType === "suppliers") {
    revalidateTag("suppliers", "minutes");
  }

  return { result, errorFileBase64 };
}

export async function parseFileAction(
  formData: FormData,
): Promise<ParseResult> {
  const file = formData.get("file") as File;
  const importType = formData.get("type") as ImportType;

  if (!file || !importType) {
    throw new Error("Archivo y tipo son requeridos");
  }

  const buffer = await file.arrayBuffer();
  return parseImportFile(buffer, importType);
}
