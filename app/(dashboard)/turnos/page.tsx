import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { TurnosPageClient } from "@/components/turnos/turnos-page-client";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import {
  getCachedActiveCashRegisters,
  getCachedShifts,
} from "@/lib/services/shifts-cached";

interface SearchParams {
  status?: string;
  cashRegister?: string;
  discrepancy?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TurnosContent searchParams={params} />
    </Suspense>
  );
}

async function TurnosContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const page = Number(searchParams.page) || 1;
  const pageSize = 20;

  const [result, cashRegisters] = await Promise.all([
    getCachedShifts({
      page,
      pageSize,
      status: searchParams.status as "open" | "closed" | undefined,
      cashRegisterId: searchParams.cashRegister,
      discrepancy: searchParams.discrepancy as "with" | "without" | undefined,
      dateFrom: searchParams.dateFrom,
      dateTo: searchParams.dateTo,
    }),
    getCachedActiveCashRegisters(organizationId),
  ]);

  return (
    <TurnosPageClient
      shifts={result.data}
      count={result.count}
      totalPages={result.totalPages}
      cashRegisters={cashRegisters}
      currentFilters={{
        status: searchParams.status || "",
        cashRegister: searchParams.cashRegister || "",
        discrepancy: searchParams.discrepancy || "",
        dateFrom: searchParams.dateFrom || "",
        dateTo: searchParams.dateTo || "",
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
      </div>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-32" />
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
