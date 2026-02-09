import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { ProductosPageClient } from "@/components/productos/productos-page-client";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedLocations } from "@/lib/services/locations-cached";
import {
  getCachedCategories,
  getCachedProducts,
} from "@/lib/services/products-cached";

interface SearchParams {
  search?: string;
  status?: string;
  category?: string;
  visibility?: string;
  stock?: string;
  page?: string;
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProductosContent searchParams={params} />
    </Suspense>
  );
}

async function ProductosContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  // Parse filters from URL
  const statusParam = searchParams.status || "active";
  const active =
    statusParam === "active"
      ? true
      : statusParam === "archived"
        ? false
        : undefined;
  const visibility = searchParams.visibility?.split(",").filter(Boolean);

  const [result, categories, locations] = await Promise.all([
    getCachedProducts(organizationId, {
      page: Number(searchParams.page) || 1,
      pageSize: 20,
      search: searchParams.search,
      active,
      categoryId: searchParams.category,
      visibility,
      stockFilter: searchParams.stock as
        | "WITH_STOCK"
        | "WITHOUT_STOCK"
        | "NEGATIVE_STOCK"
        | undefined,
    }),
    getCachedCategories(organizationId),
    getCachedLocations(organizationId),
  ]);

  return (
    <ProductosPageClient
      products={result.data}
      count={result.count}
      totalPages={result.totalPages}
      categories={categories}
      locations={locations}
      currentFilters={{
        search: searchParams.search || "",
        status: searchParams.status || "",
        category: searchParams.category || "",
        visibility: searchParams.visibility || "",
        stock: searchParams.stock || "",
        page: Number(searchParams.page) || 1,
      }}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-[300px]" />
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-12 w-12 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[100px]" />
            </div>
            <Skeleton className="h-4 w-[60px]" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-6 w-[70px] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
