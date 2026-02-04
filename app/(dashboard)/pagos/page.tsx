import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { PagosPageClient } from "@/components/pagos/pagos-page-client";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedSupplierPayments } from "@/lib/services/supplier-payments-cached";
import { getCachedSuppliers } from "@/lib/services/suppliers-cached";

interface SearchParams {
  search?: string;
  supplier?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PagosContent searchParams={params} />
    </Suspense>
  );
}

async function PagosContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const [result, suppliers] = await Promise.all([
    getCachedSupplierPayments({
      page: Number(searchParams.page) || 1,
      limit: 20,
      search: searchParams.search,
      supplierId: searchParams.supplier,
      dateFrom: searchParams.dateFrom,
      dateTo: searchParams.dateTo,
    }),
    getCachedSuppliers(),
  ]);

  return (
    <PagosPageClient
      payments={result.data}
      count={result.count}
      totalPages={result.totalPages}
      suppliers={suppliers}
      currentFilters={{
        search: searchParams.search || "",
        supplier: searchParams.supplier || "",
        dateFrom: searchParams.dateFrom || "",
        dateTo: searchParams.dateTo || "",
        page: Number(searchParams.page) || 1,
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
        <div className="flex gap-2">
          <Skeleton className="h-8 w-[250px]" />
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
