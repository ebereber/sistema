import { Suspense } from "react"
import { redirect } from "next/navigation"

import { Loader2 } from "lucide-react"

import { getOrganizationId } from "@/lib/auth/get-organization"
import { getServerUser } from "@/lib/auth/get-server-user"
import { getCachedPointsOfSale } from "@/lib/services/point-of-sale-cached"
import { getCachedLocations } from "@/lib/services/locations-cached"
import { PuntosDeVentaPageClient } from "@/components/configuracion/puntos-de-venta-page-client"

export default async function PuntosDeVentaPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PuntosDeVentaContent />
    </Suspense>
  )
}

async function PuntosDeVentaContent() {
  const user = await getServerUser()
  if (!user) redirect("/login")
  const organizationId = await getOrganizationId()

  const [pointsOfSale, locations] = await Promise.all([
    getCachedPointsOfSale(organizationId),
    getCachedLocations(organizationId),
  ])

  return <PuntosDeVentaPageClient initialPointsOfSale={pointsOfSale} locations={locations} />
}

function PageSkeleton() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
