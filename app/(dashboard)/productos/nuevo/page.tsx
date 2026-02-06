import { redirect } from "next/navigation"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"

import { NuevoProductoClient } from "@/components/productos/nuevo-producto-client"
import { getOrganizationId } from "@/lib/auth/get-organization"
import { getServerUser } from "@/lib/auth/get-server-user"
import {
  getCachedLocationsForProducts,
  getCachedProductById,
} from "@/lib/services/products-cached"
export default async function NuevoProductoPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string }>
}) {
  const params = await searchParams
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NuevoProductoContent duplicateId={params.duplicate} />
    </Suspense>
  )
}

async function NuevoProductoContent({
  duplicateId,
}: {
  duplicateId?: string
}) {
  const user = await getServerUser()
  if (!user) redirect("/login")
  const organizationId = await getOrganizationId()

  const locations = await getCachedLocationsForProducts(organizationId)

  let duplicateProduct = null
  if (duplicateId) {
    duplicateProduct = await getCachedProductById(organizationId, duplicateId)
  }

  return (
    <NuevoProductoClient
      locations={locations}
      duplicateProduct={duplicateProduct}
    />
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-48" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  )
}
