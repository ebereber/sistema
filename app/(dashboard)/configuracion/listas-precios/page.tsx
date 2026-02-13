import { Suspense } from "react"
import { redirect } from "next/navigation"

import { Loader2 } from "lucide-react"

import { requirePermission } from "@/lib/auth/check-permission"
import { getOrganizationId } from "@/lib/auth/get-organization"
import { getServerUser } from "@/lib/auth/get-server-user"
import { getCachedPriceLists } from "@/lib/services/price-lists-cached"
import { ListasPreciosPageClient } from "@/components/configuracion/listas-precios-page-client"

export default async function ListasPreciosPage() {
  await requirePermission("settings:write")
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ListasPreciosContent />
    </Suspense>
  )
}

async function ListasPreciosContent() {
  const user = await getServerUser()
  if (!user) redirect("/login")
  const organizationId = await getOrganizationId()

  const priceLists = await getCachedPriceLists(organizationId)

  return <ListasPreciosPageClient initialPriceLists={priceLists} />
}

function PageSkeleton() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
