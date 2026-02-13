import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { InventoryPageClient } from "@/components/inventario/inventory-page-client";
import { requirePermission } from "@/lib/auth/check-permission";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import {
  getCachedInventory,
  getCachedTransitData,
} from "@/lib/services/products-cached";

import { getCachedLocations } from "@/lib/services/locations-cached";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventario",
  description: "Gestión de inventario y stock de productos",
};

interface SearchParams {
  search?: string;
  location?: string;
  page?: string;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission("inventory:read");
  const params = await searchParams;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InventoryContent searchParams={params} />
    </Suspense>
  );
}

async function InventoryContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const locationId = searchParams.location || undefined;
  const page = Number(searchParams.page) || 1;

  const [result, locations, transitData] = await Promise.all([
    getCachedInventory(organizationId, {
      search: searchParams.search,
      locationId,
      page,
      pageSize: 20,
    }),
    getCachedLocations(organizationId),
    getCachedTransitData(organizationId, locationId),
  ]);

  return (
    <InventoryPageClient
      products={result.data}
      count={result.count}
      totalPages={result.totalPages}
      locations={locations}
      transitData={transitData}
      currentFilters={{
        search: searchParams.search || "",
        location: searchParams.location || "",
        page,
      }}
      userId={user.id}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-[200px]" />
        <Skeleton className="h-9 w-[250px]" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-8 w-[80px]" />
            <Skeleton className="h-4 w-[60px]" />
            <Skeleton className="h-4 w-[60px]" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
