import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"

import { EditarProductoClient } from "@/components/productos/editar-producto-client"
import { getOrganizationId } from "@/lib/auth/get-organization"
import { getServerUser } from "@/lib/auth/get-server-user"
import { getCachedProductById } from "@/lib/services/products-cached"

export default async function ProductoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ProductoDetailContent id={id} />
    </Suspense>
  )
}

async function ProductoDetailContent({ id }: { id: string }) {
  const user = await getServerUser()
  if (!user) redirect("/login")
  const organizationId = await getOrganizationId()

  const product = await getCachedProductById(organizationId, id)
  if (!product) notFound()

  // Map stock data
  const stockData = (product.stock || []).map((s) => ({
    location_id: s.location_id,
    location_name: s.location.name,
    is_main: s.location.is_main ?? false,
    quantity: s.quantity,
  }))

  return <EditarProductoClient product={product} stockData={stockData} />
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-48" />
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  )
}
