import { Suspense } from "react"
import { redirect, notFound } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"

import { requirePermission } from "@/lib/auth/check-permission"
import { getOrganizationId } from "@/lib/auth/get-organization"
import { getServerUser } from "@/lib/auth/get-server-user"
import {
  getCachedPurchaseById,
  getCachedLocations,
  getCachedProducts,
} from "@/lib/services/purchases-cached"
import { getCachedSuppliers } from "@/lib/services/suppliers-cached"
import { PurchaseForm } from "@/components/compras/purchase-form"

export default async function EditarCompraPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission("purchases:read")
  const { id } = await params
  return (
    <Suspense fallback={<EditSkeleton />}>
      <EditarCompraContent id={id} />
    </Suspense>
  )
}

async function EditarCompraContent({ id }: { id: string }) {
  const user = await getServerUser()
  if (!user) redirect("/login")
  const organizationId = await getOrganizationId()

  const [purchase, suppliers, products, locations] = await Promise.all([
    getCachedPurchaseById(organizationId, id),
    getCachedSuppliers(organizationId),
    getCachedProducts(organizationId),
    getCachedLocations(organizationId),
  ])

  if (!purchase) notFound()

  return (
    <PurchaseForm
      mode="edit"
      initialData={purchase}
      initialSuppliers={suppliers}
      initialProducts={products}
      initialLocations={locations}
    />
  )
}

function EditSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  )
}
