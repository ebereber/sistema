"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { revalidateTag } from "next/cache";
import {
  detectDuplicateProducts,
  mergeDuplicateProducts,
  type DuplicateGroup,
  type MergeResult,
} from "./product-matching";

/**
 * Detect duplicate products in the current organization.
 * Returns groups of products that share the same SKU or barcode.
 */
export async function detectDuplicatesAction(): Promise<{
  duplicates: DuplicateGroup[];
  totalDuplicateProducts: number;
}> {
  const organizationId = await getOrganizationId();

  const duplicates = await detectDuplicateProducts(organizationId);

  const totalDuplicateProducts = duplicates.reduce(
    (sum, group) => sum + group.products.length,
    0,
  );

  return { duplicates, totalDuplicateProducts };
}

/**
 * Merge a group of duplicate products.
 * The product with the given survivorId will be kept, others will be deleted
 * and their mappings transferred.
 */
export async function mergeDuplicatesAction(
  survivorId: string,
  duplicateIds: string[],
): Promise<MergeResult> {
  const organizationId = await getOrganizationId();

  const result = await mergeDuplicateProducts(
    [survivorId, ...duplicateIds],
    organizationId,
  );

  if (result.success) {
    revalidateTag("products", "minutes");
    revalidateTag("mercadolibre", "minutes");
    revalidateTag("tiendanube", "minutes");
  }

  return result;
}

/**
 * Auto-merge all detected duplicates.
 * For each group, keeps the oldest product (first created) as survivor.
 */
export async function autoMergeAllDuplicatesAction(): Promise<{
  merged: number;
  failed: number;
  errors: string[];
}> {
  const organizationId = await getOrganizationId();

  const duplicates = await detectDuplicateProducts(organizationId);

  let merged = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const group of duplicates) {
    // Sort by created_at ascending - oldest product survives
    const sorted = [...group.products].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const survivorId = sorted[0].id;
    const duplicateIds = sorted.slice(1).map((p) => p.id);

    const result = await mergeDuplicateProducts(
      [survivorId, ...duplicateIds],
      organizationId,
    );

    if (result.success) {
      merged += duplicateIds.length;
    } else {
      failed += duplicateIds.length;
      if (result.error) {
        errors.push(`Grupo ${group.matchKey}: ${result.error}`);
      }
    }
  }

  if (merged > 0) {
    revalidateTag("products", "minutes");
    revalidateTag("mercadolibre", "minutes");
    revalidateTag("tiendanube", "minutes");
  }

  return { merged, failed, errors };
}
