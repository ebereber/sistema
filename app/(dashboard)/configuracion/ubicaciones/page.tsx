import { Suspense } from "react"
import { redirect } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"

import { requirePermission } from "@/lib/auth/check-permission"
import { getOrganizationId } from "@/lib/auth/get-organization"
import { getServerUser } from "@/lib/auth/get-server-user"
import { getCachedLocations, getCachedCashRegisters } from "@/lib/services/locations-cached"
import { getCachedPointsOfSale } from "@/lib/services/point-of-sale-cached"
import { getCachedSafeBoxes } from "@/lib/services/safe-boxes-cached"
import { UbicacionesPageClient } from "@/components/configuracion/ubicaciones-page-client"

export default async function UbicacionesPage() {
  await requirePermission("settings:write")
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UbicacionesContent />
    </Suspense>
  )
}

async function UbicacionesContent() {
  const user = await getServerUser()
  if (!user) redirect("/login")
  const organizationId = await getOrganizationId()

  const [locations, cashRegisters, pointsOfSale, safeBoxes] = await Promise.all([
    getCachedLocations(organizationId),
    getCachedCashRegisters(organizationId),
    getCachedPointsOfSale(organizationId),
    getCachedSafeBoxes(organizationId),
  ])

  return (
    <UbicacionesPageClient
      initialLocations={locations}
      initialCashRegisters={cashRegisters}
      initialPointsOfSale={pointsOfSale}
      initialSafeBoxes={safeBoxes}
    />
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  )
}
