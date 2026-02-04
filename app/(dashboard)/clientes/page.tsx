import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { CustomersPageClient } from "@/components/clientes/customers-page-client";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedCustomers } from "@/lib/services/customers-cached";

interface SearchParams {
  search?: string;
  status?: string;
  page?: string;
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ClientesContent searchParams={params} />
    </Suspense>
  );
}

async function ClientesContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const page = Number(searchParams.page) || 1;
  const pageSize = 50;

  // Derive active filter from status param
  let active: boolean | undefined;
  if (searchParams.status === "archived") {
    active = false;
  } else if (searchParams.status === "all") {
    active = undefined;
  } else {
    // default: show active only
    active = undefined;
  }

  const result = await getCachedCustomers({
    page,
    pageSize,
    search: searchParams.search,
    active,
  });

  return (
    <CustomersPageClient
      customers={result.data}
      count={result.count}
      totalPages={result.totalPages}
      currentFilters={{
        search: searchParams.search || "",
        status: searchParams.status || "",
        page,
      }}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-[280px]" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
