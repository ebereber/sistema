import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { PreciosPageClient } from "@/components/precios/precios-page-client";
import { requirePermission } from "@/lib/auth/check-permission";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedProducts } from "@/lib/services/products-cached";
import { getPriceRounding } from "@/lib/services/settings";
import type { PriceRoundingType } from "@/types/types";

export default async function PreciosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  await requirePermission("products:read");
  const params = await searchParams;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PreciosContent searchParams={params} />
    </Suspense>
  );
}

async function PreciosContent({
  searchParams,
}: {
  searchParams: { search?: string; page?: string };
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const search = searchParams.search || "";

  const [{ data: products, count, totalPages }, priceRounding] =
    await Promise.all([
      getCachedProducts(organizationId, {
        search: search || undefined,
        active: true,
        page,
        pageSize: 20,
      }),
      getPriceRounding(),
    ]);

  return (
    <PreciosPageClient
      products={products}
      count={count}
      totalPages={totalPages}
      currentFilters={{ search, page }}
      priceRounding={priceRounding.type as PriceRoundingType}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      <Skeleton className="h-8 w-32" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
