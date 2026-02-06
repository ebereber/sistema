import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { OrdenesPageClient } from "@/components/ordenes/ordenes-page-client";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedPurchaseOrders } from "@/lib/services/purchase-orders-cached";
import { getCachedSuppliers } from "@/lib/services/suppliers-cached";

interface SearchParams {
  search?: string;
  status?: string;
  supplier?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}

export default async function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrdenesContent searchParams={params} />
    </Suspense>
  );
}

async function OrdenesContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const statuses = searchParams.status
    ? searchParams.status.split(",").filter(Boolean)
    : [];

  const [result, suppliers] = await Promise.all([
    getCachedPurchaseOrders(organizationId, {
      page: Number(searchParams.page) || 1,
      pageSize: 20,
      search: searchParams.search,
      statuses,
      supplierId: searchParams.supplier,
      dateFrom: searchParams.dateFrom,
      dateTo: searchParams.dateTo,
    }),
    getCachedSuppliers(organizationId),
  ]);

  return (
    <OrdenesPageClient
      orders={result.data}
      count={result.count}
      totalPages={result.totalPages}
      suppliers={suppliers}
      currentFilters={{
        search: searchParams.search || "",
        supplier: searchParams.supplier || "",
        statuses,
        dateFrom: searchParams.dateFrom || "",
        dateTo: searchParams.dateTo || "",
        page: Number(searchParams.page) || 1,
      }}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-1 flex-col space-y-8 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-[250px]" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="rounded-lg border">
          <div className="space-y-4 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
