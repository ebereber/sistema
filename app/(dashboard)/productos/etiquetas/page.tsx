import { getOrganizationId } from "@/lib/auth/get-organization";
import {
  getCachedCategories,
  getCachedProducts,
} from "@/lib/services/products-cached";
import { getSetting } from "@/lib/services/settings";

import { LabelsPageClient } from "@/components/productos/labels/labels-page-client";
import { LabelSettings } from "@/components/productos/labels/types";

const DEFAULT_LABEL_SETTINGS: LabelSettings = {
  paperSize: "custom",
  labelWidth: 60,
  labelHeight: 30,
  showBarcode: true,
  barcodeSource: "sku",
  lines: [
    { type: "name", fontSize: "medium" },
    { type: "sku", fontSize: "small" },
    { type: "price", fontSize: "small" },
  ],
};

interface SearchParams {
  search?: string;
  category?: string;
  filter?: string;
  page?: string;
}

export default async function EtiquetasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const organizationId = await getOrganizationId();

  const [result, categories, labelSettings] = await Promise.all([
    getCachedProducts(organizationId, {
      page: Number(params.page) || 1,
      pageSize: 50,
      search: params.search,
      active: true,
      categoryId: params.category,
    }),
    getCachedCategories(organizationId),
    getSetting<LabelSettings>("label_settings", DEFAULT_LABEL_SETTINGS),
  ]);

  // Map products to label format
  const products = result.data.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku || "",
    barcode: p.barcode || "",
    price: p.price || 0,
    stock: p.stock_quantity ?? 0,
    categoryId: p.category_id || null,
    printQuantity: p.stock_quantity ?? 0,
  }));

  return (
    <LabelsPageClient
      products={products}
      categories={categories}
      totalPages={result.totalPages}
      count={result.count}
      initialSettings={labelSettings}
      currentFilters={{
        search: params.search || "",
        category: params.category || "",
        filter: params.filter || "",
        page: Number(params.page) || 1,
      }}
    />
  );
}
