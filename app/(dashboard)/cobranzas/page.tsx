import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { CobranzasPageClient } from "@/components/cobranzas/cobranzas-page-client";
import { requirePermission } from "@/lib/auth/check-permission";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getServerUserScope } from "@/lib/auth/get-server-user-scope";
import { getCachedCustomerPayments } from "@/lib/services/customer-payments-cached";

interface SearchParams {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}

export default async function CobranzasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission("sales:read");
  const params = await searchParams;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CobranzasContent searchParams={params} />
    </Suspense>
  );
}

async function CobranzasContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const scope = await getServerUserScope(user.id);

  const result = await getCachedCustomerPayments(organizationId, {
    page: Number(searchParams.page) || 1,
    pageSize: 20,
    search: searchParams.search,
    dateFrom: searchParams.dateFrom,
    dateTo: searchParams.dateTo,
    visibility: scope.visibility,
    userId: scope.userId,
    locationIds: scope.locationIds,
  });

  return (
    <CobranzasPageClient
      payments={result.data}
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
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-[300px]" />
          <Skeleton className="h-8 w-20" />
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
