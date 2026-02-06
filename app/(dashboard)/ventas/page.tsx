import { redirect } from "next/navigation"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { VentasPageClient } from "@/components/ventas/ventas-page-client"
import { getOrganizationId } from "@/lib/auth/get-organization"
import { getServerUser } from "@/lib/auth/get-server-user"
import { getCachedSales } from "@/lib/services/sales-cached"

interface SearchParams {
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  minAmount?: string
  maxAmount?: string
  page?: string
}

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  return (
    <Suspense fallback={<PageSkeleton />}>
      <VentasContent searchParams={params} />
    </Suspense>
  )
}

async function VentasContent({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const user = await getServerUser()
  if (!user) redirect("/login")

  const page = Number(searchParams.page) || 1
  const pageSize = 20

  // Build scope from user data
  const role = Array.isArray(user.role) ? user.role[0] : user.role
  const permissions = (role?.permissions || {}) as Record<string, unknown>
  const dataVisibilityScope =
    (permissions.data_visibility_scope as string) || "all"

  // Get user location IDs if needed
  let locationIds: string[] = []
  if (dataVisibilityScope === "assigned_locations") {
    // For assigned_locations scope, we'd need to fetch user locations
    // For now, pass empty array which will show nothing (safe default)
    locationIds = []
  }

  const scope =
    dataVisibilityScope !== "all"
      ? {
          visibility: dataVisibilityScope as "own" | "assigned_locations" | "all",
          userId: user.id,
          locationIds,
        }
      : undefined

  const organizationId = await getOrganizationId()

  const result = await getCachedSales(
    organizationId,
    {
      page,
      pageSize,
      search: searchParams.search,
      status: searchParams.status as
        | "COMPLETED"
        | "PENDING"
        | "CANCELLED"
        | undefined,
      dateFrom: searchParams.dateFrom,
      dateTo: searchParams.dateTo,
      minAmount: searchParams.minAmount
        ? parseFloat(searchParams.minAmount)
        : undefined,
      maxAmount: searchParams.maxAmount
        ? parseFloat(searchParams.maxAmount)
        : undefined,
    },
    scope,
  )

  return (
    <VentasPageClient
      sales={result.data}
      count={result.count}
      totalPages={result.totalPages}
      currentFilters={{
        search: searchParams.search || "",
        status: searchParams.status || "",
        dateFrom: searchParams.dateFrom || "",
        dateTo: searchParams.dateTo || "",
        minAmount: searchParams.minAmount || "",
        maxAmount: searchParams.maxAmount || "",
        page,
      }}
    />
  )
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
          <Skeleton className="h-8 w-28" />
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
  )
}
