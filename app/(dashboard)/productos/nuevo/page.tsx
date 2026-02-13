import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { NuevoProductoClient } from "@/components/productos/nuevo-producto-client";
import { requirePermission } from "@/lib/auth/check-permission";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedCategories } from "@/lib/services/categories-cached";
import { getCachedLocations } from "@/lib/services/locations-cached";
import {
  getCachedProductById,
  getCachedProducts,
} from "@/lib/services/products-cached";
import { getCachedSuppliers } from "@/lib/services/suppliers-cached";

import { type Product } from "@/lib/services/products";
import { getPriceRounding } from "@/lib/services/settings";
import { PriceRoundingType } from "@/types/types";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nuevo Producto",
};

interface SearchParams {
  duplicate?: string;
  type?: string;
}

export default async function NuevoProductoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission("products:write");
  const params = await searchParams;
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NuevoProductoContent
        duplicateId={params.duplicate}
        productType={params.type}
      />
    </Suspense>
  );
}

async function NuevoProductoContent({
  duplicateId,
  productType,
}: {
  duplicateId?: string;
  productType?: string;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const [locations, categories, suppliers, priceRounding] = await Promise.all([
    getCachedLocations(organizationId),
    getCachedCategories(organizationId),
    getCachedSuppliers(organizationId),
    getPriceRounding(),
  ]);

  let duplicateProduct = null;
  if (duplicateId) {
    duplicateProduct = await getCachedProductById(organizationId, duplicateId);
  }

  // For combo mode, fetch available products (non-combo, active)
  let comboProducts: Product[] = [];
  if (productType === "combo") {
    const result = await getCachedProducts(organizationId, {
      page: 1,
      pageSize: 1000,
      active: true,
    });
    comboProducts = result.data.filter((p) => p.product_type !== "COMBO");
  }

  return (
    <NuevoProductoClient
      locations={locations}
      categories={categories}
      suppliers={suppliers}
      duplicateProduct={duplicateProduct}
      productType={productType === "combo" ? "COMBO" : undefined}
      comboProducts={comboProducts}
      priceRounding={priceRounding.type as PriceRoundingType}
    />
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-48" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
