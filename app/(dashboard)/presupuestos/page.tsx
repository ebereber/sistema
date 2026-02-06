import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { PresupuestosPageClient } from "@/components/presupuestos/presupuestos-page-client";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedQuotes } from "@/lib/services/quotes-cached";

interface SearchParams {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}

export default async function PresupuestosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PresupuestosContent searchParams={params} />
    </Suspense>
  );
}

async function PresupuestosContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const result = await getCachedQuotes(organizationId, {
    page: Number(searchParams.page) || 1,
    pageSize: 20,
    search: searchParams.search,
    dateFrom: searchParams.dateFrom,
    dateTo: searchParams.dateTo,
  });

  return (
    <PresupuestosPageClient
      quotes={result.data}
      count={result.count}
      totalPages={result.totalPages}
      currentFilters={{
        search: searchParams.search || "",
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
      </div>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-[250px]" />
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
