import { createClient } from "@supabase/supabase-js";
import {
  type ParsedRow,
  parseArgentineNumber,
  parseBoolean,
  parseProductType,
  parseTaxRate,
  parseVisibility,
} from "../import/parser";
import { ImportType } from "../import/templates";

// ─── Types ────────────────────────────────────────────

export interface ImportResult {
  created: number;
  updated: number;
  failed: number;
  errors: ImportRowError[];
}

export interface ImportRowError {
  rowNumber: number;
  data: Record<string, string | number | null>;
  error: string;
}

// ─── Helpers ──────────────────────────────────────────

/** Remove accents/diacritics for fuzzy matching */
function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ─── Lookup Helpers ───────────────────────────────────

async function getOrCreateCategory(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  organizationId: string,
  categoryName: string,
  parentId: string | null = null,
): Promise<string | null> {
  if (!categoryName) return null;

  let query = supabase
    .from("categories")
    .select("id, name")
    .eq("organization_id", organizationId)
    .ilike("name", categoryName.trim());

  if (parentId) {
    query = query.eq("parent_id", parentId);
  } else {
    query = query.is("parent_id", null);
  }

  const { data: existing } = await query.maybeSingle();
  if (existing) return existing.id;

  // Fallback: accent-insensitive search across all categories
  const { data: allCats } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .eq("organization_id", organizationId);

  if (allCats) {
    const normalizedInput = normalizeText(categoryName.trim().toLowerCase());
    const match = allCats.find(
      (c) =>
        normalizeText(c.name.toLowerCase()) === normalizedInput &&
        (parentId ? c.parent_id === parentId : c.parent_id === null),
    );
    if (match) return match.id;
  }

  // Create new category
  const { data: created, error } = await supabase
    .from("categories")
    .insert({
      name: categoryName.trim(),
      organization_id: organizationId,
      parent_id: parentId,
    })
    .select("id")
    .single();

  if (error) return null;
  return created.id;
}

async function findSupplierByName(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  organizationId: string,
  name: string,
): Promise<string | null> {
  if (!name) return null;

  const { data } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("organization_id", organizationId)
    .ilike("name", name.trim())
    .maybeSingle();

  if (data) return data.id;

  // Fallback: accent-insensitive
  const { data: all } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("organization_id", organizationId);

  if (!all) return null;

  const normalizedInput = normalizeText(name.trim().toLowerCase());
  const match = all.find(
    (s) => normalizeText(s.name.toLowerCase()) === normalizedInput,
  );

  return match?.id || null;
}

async function findLocationByName(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  organizationId: string,
  name: string,
): Promise<string | null> {
  if (!name) return null;

  // First try exact ilike match
  const { data } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", organizationId)
    .ilike("name", name.trim())
    .maybeSingle();

  if (data) return data.id;

  // Fallback: accent-insensitive match
  const { data: allLocations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", organizationId);

  if (!allLocations) return null;

  const normalizedInput = normalizeText(name.trim().toLowerCase());
  const match = allLocations.find(
    (loc) => normalizeText(loc.name.toLowerCase()) === normalizedInput,
  );

  return match?.id || null;
}

async function findProductBySku(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  organizationId: string,
  sku: string,
): Promise<{ id: string; price: number; cost: number | null } | null> {
  const { data } = await supabase
    .from("products")
    .select("id, price, cost")
    .eq("organization_id", organizationId)
    .eq("sku", sku.trim())
    .maybeSingle();

  return data || null;
}

// ─── Import Functions ─────────────────────────────────

async function importProducts(
  rows: ParsedRow[],
  organizationId: string,
): Promise<ImportResult> {
  const supabase = getSupabaseAdmin();
  const result: ImportResult = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  // Cache for lookups
  const categoryCache = new Map<string, string>();
  const supplierCache = new Map<string, string | null>();

  for (const row of rows) {
    if (row.errors.length > 0) {
      result.failed++;
      result.errors.push({
        rowNumber: row.rowNumber,
        data: row.data,
        error: row.errors.join("; "),
      });
      continue;
    }

    try {
      const d = row.data;

      // Resolve category
      let categoryId: string | null = null;
      const catName = d["Categoría"] as string;
      const subCatName = d["Subcategoría"] as string | null;

      if (catName) {
        const catKey = catName.toLowerCase();
        if (categoryCache.has(catKey)) {
          categoryId = categoryCache.get(catKey)!;
        } else {
          categoryId = await getOrCreateCategory(
            supabase,
            organizationId,
            catName,
          );
          if (categoryId) categoryCache.set(catKey, categoryId);
        }

        // Subcategory as child
        if (subCatName && categoryId) {
          const subKey = `${catKey}/${subCatName.toLowerCase()}`;
          if (categoryCache.has(subKey)) {
            categoryId = categoryCache.get(subKey)!;
          } else {
            const parentId = categoryId;
            const subId = await getOrCreateCategory(
              supabase,
              organizationId,
              subCatName,
              parentId,
            );
            if (subId) {
              categoryCache.set(subKey, subId);
              categoryId = subId;
            }
          }
        }
      }

      // Resolve supplier
      let supplierId: string | null = null;
      const supplierName = d["Proveedor"] as string | null;
      if (supplierName) {
        const supKey = supplierName.toLowerCase();
        if (supplierCache.has(supKey)) {
          supplierId = supplierCache.get(supKey)!;
        } else {
          supplierId = await findSupplierByName(
            supabase,
            organizationId,
            supplierName,
          );
          supplierCache.set(supKey, supplierId);
        }
      }

      const sku = (d["Código SKU"] as string).trim();
      const price = parseArgentineNumber(d["Precio con IVA"]);
      const cost = parseArgentineNumber(d["Costo sin IVA"]);
      const margin = parseArgentineNumber(d["Margen de ganancia %"]);
      const taxRate = parseTaxRate(d["Alícuota IVA"]);
      const active = parseBoolean(d["Activo"]);
      const visibility = parseVisibility(d["Visibilidad"] as string | null);
      const productType = parseProductType(
        d["Tipo de producto"] as string | null,
      );

      const productData: Record<string, unknown> = {
        name: (d["Nombre"] as string).trim(),
        sku,
        organization_id: organizationId,
      };

      if (d["Descripción"]) productData.description = d["Descripción"];
      if (categoryId) productData.category_id = categoryId;
      if (d["Código de barras"])
        productData.barcode = (d["Código de barras"] as string).trim();
      if (cost !== null) productData.cost = cost;
      if (price !== null) productData.price = price;
      if (margin !== null) productData.margin_percentage = margin;
      if (taxRate !== null) productData.tax_rate = taxRate;
      if (supplierId) productData.default_supplier_id = supplierId;
      if (active !== null) productData.active = active;
      if (visibility) productData.visibility = visibility;
      if (productType) productData.product_type = productType;
      if (d["Imagen URL"]) productData.image_url = d["Imagen URL"];

      // Check if product exists
      const existing = await findProductBySku(supabase, organizationId, sku);

      if (existing) {
        // Update
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", existing.id);

        if (error) throw error;
        result.updated++;
      } else {
        // Ensure required price
        if (!productData.price) productData.price = 0;

        const { error } = await supabase.from("products").insert(productData);

        if (error) throw error;
        result.created++;
      }
    } catch (err: unknown) {
      result.failed++;
      result.errors.push({
        rowNumber: row.rowNumber,
        data: row.data,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return result;
}

async function importStock(
  rows: ParsedRow[],
  organizationId: string,
): Promise<ImportResult> {
  const supabase = getSupabaseAdmin();
  const result: ImportResult = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  // Get default location
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", organizationId)
    .limit(50);

  const defaultLocation = locations?.[0];

  for (const row of rows) {
    if (row.errors.length > 0) {
      result.failed++;
      result.errors.push({
        rowNumber: row.rowNumber,
        data: row.data,
        error: row.errors.join("; "),
      });
      continue;
    }

    try {
      const d = row.data;
      const sku = (d["Código SKU"] as string).trim();
      const quantity = parseArgentineNumber(d["Cantidad"]);
      const locationName = d["Depósito/ubicación"] as string | null;

      if (quantity === null) {
        throw new Error("Cantidad inválida");
      }

      // Find product
      const product = await findProductBySku(supabase, organizationId, sku);
      if (!product) {
        throw new Error(`Producto con SKU "${sku}" no encontrado`);
      }

      // Find location
      let locationId: string | null = null;
      if (locationName) {
        locationId = await findLocationByName(
          supabase,
          organizationId,
          locationName,
        );
        if (!locationId) {
          throw new Error(`Ubicación "${locationName}" no encontrada`);
        }
      } else if (defaultLocation) {
        locationId = defaultLocation.id;
      }

      if (!locationId) {
        throw new Error("No hay ubicaciones configuradas");
      }

      // Upsert stock
      const { data: existingStock } = await supabase
        .from("stock")
        .select("id")
        .eq("product_id", product.id)
        .eq("location_id", locationId)
        .maybeSingle();

      if (existingStock) {
        const { error } = await supabase
          .from("stock")
          .update({ quantity })
          .eq("id", existingStock.id);

        if (error) throw error;
        result.updated++;
      } else {
        const { error } = await supabase.from("stock").insert({
          product_id: product.id,
          location_id: locationId,
          quantity,
        });

        if (error) throw error;
        result.created++;
      }
    } catch (err: unknown) {
      result.failed++;
      result.errors.push({
        rowNumber: row.rowNumber,
        data: row.data,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return result;
}

async function importPrices(
  rows: ParsedRow[],
  organizationId: string,
): Promise<ImportResult> {
  const supabase = getSupabaseAdmin();
  const result: ImportResult = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  for (const row of rows) {
    if (row.errors.length > 0) {
      result.failed++;
      result.errors.push({
        rowNumber: row.rowNumber,
        data: row.data,
        error: row.errors.join("; "),
      });
      continue;
    }

    try {
      const d = row.data;
      const sku = (d["Código SKU"] as string).trim();
      const price = parseArgentineNumber(d["Precio con IVA"]);
      const cost = parseArgentineNumber(d["Costo sin IVA"]);
      const margin = parseArgentineNumber(d["Margen %"]);

      const product = await findProductBySku(supabase, organizationId, sku);
      if (!product) {
        throw new Error(`Producto con SKU "${sku}" no encontrado`);
      }

      // Build update
      const updates: Record<string, unknown> = {};
      if (price !== null) updates.price = price;
      if (cost !== null) updates.cost = cost;
      if (margin !== null) updates.margin_percentage = margin;

      if (Object.keys(updates).length === 0) {
        throw new Error("No hay datos de precio para actualizar");
      }

      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", product.id);

      if (error) throw error;
      result.updated++;
    } catch (err: unknown) {
      result.failed++;
      result.errors.push({
        rowNumber: row.rowNumber,
        data: row.data,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return result;
}

async function importCustomers(
  rows: ParsedRow[],
  organizationId: string,
): Promise<ImportResult> {
  const supabase = getSupabaseAdmin();
  const result: ImportResult = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  for (const row of rows) {
    if (row.errors.length > 0) {
      result.failed++;
      result.errors.push({
        rowNumber: row.rowNumber,
        data: row.data,
        error: row.errors.join("; "),
      });
      continue;
    }

    try {
      const d = row.data;
      const name = (d["Nombre"] as string).trim();
      const taxId = d["Nº documento"] as string | null;

      const customerData: Record<string, unknown> = {
        name,
        organization_id: organizationId,
      };

      if (d["Nombre comercial"])
        customerData.trade_name = d["Nombre comercial"];
      if (d["Tipo documento"]) customerData.tax_id_type = d["Tipo documento"];
      if (taxId) customerData.tax_id = taxId.toString().trim();
      if (d["Condición IVA"]) customerData.tax_category = d["Condición IVA"];
      if (d["Email"]) customerData.email = d["Email"];
      if (d["Teléfono"]) customerData.phone = d["Teléfono"];
      if (d["Dirección"]) customerData.street_address = d["Dirección"];
      if (d["Localidad"]) customerData.city = d["Localidad"];
      if (d["Provincia"]) customerData.province = d["Provincia"];
      if (d["Código postal"]) customerData.postal_code = d["Código postal"];

      // Check existing by tax_id or name
      let existingId: string | null = null;

      if (taxId) {
        const { data } = await supabase
          .from("customers")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("tax_id", taxId.toString().trim())
          .maybeSingle();
        existingId = data?.id || null;
      }

      if (!existingId) {
        const { data } = await supabase
          .from("customers")
          .select("id")
          .eq("organization_id", organizationId)
          .ilike("name", name)
          .maybeSingle();
        existingId = data?.id || null;
      }

      if (existingId) {
        delete customerData.organization_id;
        const { error } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", existingId);
        if (error) throw error;
        result.updated++;
      } else {
        const { error } = await supabase.from("customers").insert(customerData);
        if (error) throw error;
        result.created++;
      }
    } catch (err: unknown) {
      result.failed++;
      result.errors.push({
        rowNumber: row.rowNumber,
        data: row.data,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return result;
}

async function importSuppliers(
  rows: ParsedRow[],
  organizationId: string,
): Promise<ImportResult> {
  const supabase = getSupabaseAdmin();
  const result: ImportResult = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  for (const row of rows) {
    if (row.errors.length > 0) {
      result.failed++;
      result.errors.push({
        rowNumber: row.rowNumber,
        data: row.data,
        error: row.errors.join("; "),
      });
      continue;
    }

    try {
      const d = row.data;
      const name = (d["Nombre"] as string).trim();
      const taxId = d["CUIT"] as string | null;

      const supplierData: Record<string, unknown> = {
        name,
        organization_id: organizationId,
      };

      if (d["Nombre comercial"])
        supplierData.trade_name = d["Nombre comercial"];
      if (taxId) {
        supplierData.tax_id = taxId.toString().trim();
        supplierData.tax_id_type = "CUIT";
      }
      if (d["Contacto"]) supplierData.contact_person = d["Contacto"];
      if (d["Email"]) supplierData.email = d["Email"];
      if (d["Teléfono"]) supplierData.phone = d["Teléfono"];
      if (d["Dirección"]) supplierData.street_address = d["Dirección"];
      if (d["Localidad"]) supplierData.city = d["Localidad"];
      if (d["Provincia"]) supplierData.province = d["Provincia"];
      if (d["Notas"]) supplierData.notes = d["Notas"];

      // Check existing by CUIT or name
      let existingId: string | null = null;

      if (taxId) {
        const { data } = await supabase
          .from("suppliers")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("tax_id", taxId.toString().trim())
          .maybeSingle();
        existingId = data?.id || null;
      }

      if (!existingId) {
        const { data } = await supabase
          .from("suppliers")
          .select("id")
          .eq("organization_id", organizationId)
          .ilike("name", name)
          .maybeSingle();
        existingId = data?.id || null;
      }

      if (existingId) {
        delete supplierData.organization_id;
        const { error } = await supabase
          .from("suppliers")
          .update(supplierData)
          .eq("id", existingId);
        if (error) throw error;
        result.updated++;
      } else {
        const { error } = await supabase.from("suppliers").insert(supplierData);
        if (error) throw error;
        result.created++;
      }
    } catch (err: unknown) {
      result.failed++;
      result.errors.push({
        rowNumber: row.rowNumber,
        data: row.data,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return result;
}

// ─── Main dispatcher ──────────────────────────────────

export async function executeImport(
  importType: ImportType,
  rows: ParsedRow[],
  organizationId: string,
): Promise<ImportResult> {
  switch (importType) {
    case "products":
      return importProducts(rows, organizationId);
    case "stock":
      return importStock(rows, organizationId);
    case "prices":
      return importPrices(rows, organizationId);
    case "customers":
      return importCustomers(rows, organizationId);
    case "suppliers":
      return importSuppliers(rows, organizationId);
    default:
      throw new Error(`Tipo de importación "${importType}" no soportado`);
  }
}
