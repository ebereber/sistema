import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { EditarProductoClient } from "@/components/productos/editar-producto-client";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedCategories } from "@/lib/services/categories-cached";
import { getCachedLocations } from "@/lib/services/locations-cached";
import {
  getCachedProductById,
  getCachedProducts,
} from "@/lib/services/products-cached";
import { getCachedSuppliers } from "@/lib/services/suppliers-cached";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function ProductoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ProductoDetailContent id={id} />
    </Suspense>
  );
}

async function ProductoDetailContent({ id }: { id: string }) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const [product, locations, categories, suppliers] = await Promise.all([
    getCachedProductById(organizationId, id),
    getCachedLocations(organizationId),
    getCachedCategories(organizationId),
    getCachedSuppliers(organizationId),
  ]);

  if (!product) notFound();

  const stockData = (product.stock || []).map((s) => ({
    location_id: s.location_id,
    location_name: s.location.name,
    is_main: s.location.is_main ?? false,
    quantity: s.quantity,
  }));

  const isCombo = product.product_type === "COMBO";

  let comboItems: {
    product_id: string;
    quantity: number;
    product: { id: string; name: string; sku: string; price: number };
  }[] = [];
  let comboProducts: typeof product[] = [];

  if (isCombo) {
    const [comboItemsResult, productsResult] = await Promise.all([
      supabaseAdmin
        .from("combo_items")
        .select(
          "product_id, quantity, product:products!combo_items_product_id_fkey(id, name, sku, price)",
        )
        .eq("combo_product_id", id),
      getCachedProducts(organizationId, {
        page: 1,
        pageSize: 1000,
        active: true,
      }),
    ]);

    if (comboItemsResult.error) throw comboItemsResult.error;
    comboItems = (comboItemsResult.data || []) as typeof comboItems;
    comboProducts = productsResult.data.filter(
      (p) => p.product_type !== "COMBO",
    );
  }

  return (
    <EditarProductoClient
      product={product}
      stockData={stockData}
      locations={locations}
      categories={categories}
      suppliers={suppliers}
      comboItems={
        isCombo
          ? comboItems.map((ci) => ({
              product_id: ci.product_id,
              name: ci.product.name,
              sku: ci.product.sku,
              price: ci.product.price,
              quantity: ci.quantity,
            }))
          : undefined
      }
      comboProducts={isCombo ? comboProducts : undefined}
    />
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-48" />
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
