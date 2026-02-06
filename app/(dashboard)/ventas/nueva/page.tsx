import { redirect } from "next/navigation"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { NuevaVentaClient } from "@/components/ventas/nueva-venta-client"
import { getOrganizationId } from "@/lib/auth/get-organization"
import { getServerUser } from "@/lib/auth/get-server-user"
import {
  getCachedAllProductsForPOS,
  getCachedCategories,
  getCachedTopSellingProducts,
} from "@/lib/services/products-cached"

export default async function NuevaVentaPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NuevaVentaContent />
    </Suspense>
  )
}

async function NuevaVentaContent() {
  const user = await getServerUser()
  if (!user) redirect("/login")
  if (!user.active) redirect("/acceso-pendiente")
  const organizationId = await getOrganizationId()

  const [allProducts, topSelling, categories] = await Promise.all([
    getCachedAllProductsForPOS(organizationId),
    getCachedTopSellingProducts(organizationId, 20),
    getCachedCategories(organizationId),
  ])

  return (
    <NuevaVentaClient
      initialProducts={allProducts}
      topSellingProducts={topSelling}
      categories={categories}
    />
  )
}

function PageSkeleton() {
  return (
    <div className="flex h-[calc(100vh-5.5rem)] gap-4 lg:flex-row flex-col">
      <div className="flex min-w-0 flex-1 flex-col lg:pl-4 px-0 pb-20">
        <div className="pb-4">
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-9 w-64 mb-2" />
        <div className="flex flex-col gap-2 py-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pr-4 lg:block hidden">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    </div>
  )
}
