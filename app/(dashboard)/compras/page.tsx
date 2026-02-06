import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { ComprasPageClient } from "@/components/compras/compras-page-client";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedPurchases } from "@/lib/services/purchases-cached";
import { getCachedSuppliers } from "@/lib/services/suppliers-cached";

interface SearchParams {
  search?: string;
  status?: string;
  supplier?: string;
  dateFrom?: string;
  page?: string;
}

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ComprasContent searchParams={params} />
    </Suspense>
  );
}

async function ComprasContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const page = Number(searchParams.page) || 1;
  const pageSize = 20;

  const [purchasesResult, suppliers] = await Promise.all([
    getCachedPurchases(organizationId, {
      page,
      pageSize,
      status: searchParams.status as
        | "draft"
        | "completed"
        | "cancelled"
        | undefined,
      supplierId: searchParams.supplier,
      dateFrom: searchParams.dateFrom,
      search: searchParams.search,
    }),
    getCachedSuppliers(organizationId),
  ]);

  return (
    <ComprasPageClient
      purchases={purchasesResult.data}
      count={purchasesResult.count}
      totalPages={purchasesResult.totalPages}
      suppliers={suppliers}
      currentFilters={{
        search: searchParams.search || "",
        status: searchParams.status || "",
        supplier: searchParams.supplier || "",
        dateFrom: searchParams.dateFrom || "",
        page,
      }}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-[350px]" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="rounded-lg border">
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
