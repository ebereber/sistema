import { Suspense } from "react"
import { redirect } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"

import { getOrganizationId } from "@/lib/auth/get-organization"
import { getServerUser } from "@/lib/auth/get-server-user"
import {
  getCachedPurchaseById,
  getCachedLocations,
  getCachedProducts,
} from "@/lib/services/purchases-cached"
import { getCachedSuppliers } from "@/lib/services/suppliers-cached"
import { getPurchaseOrderById } from "@/lib/services/purchase-orders"
import { PurchaseForm } from "@/components/compras/purchase-form"

export default async function NuevaCompraPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicateFrom?: string; purchaseOrderId?: string }>
}) {
  const params = await searchParams
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NuevaCompraContent
        duplicateFromId={params.duplicateFrom}
        purchaseOrderId={params.purchaseOrderId}
      />
    </Suspense>
  )
}

async function NuevaCompraContent({
  duplicateFromId,
  purchaseOrderId,
}: {
  duplicateFromId?: string
  purchaseOrderId?: string
}) {
  const user = await getServerUser()
  if (!user) redirect("/login")
  const organizationId = await getOrganizationId()

  const [suppliers, products, locations] = await Promise.all([
    getCachedSuppliers(organizationId),
    getCachedProducts(organizationId),
    getCachedLocations(organizationId),
  ])

  let duplicateData
  let purchaseOrderData
  if (duplicateFromId) {
    duplicateData = await getCachedPurchaseById(organizationId, duplicateFromId)
  } else if (purchaseOrderId) {
    try {
      purchaseOrderData = await getPurchaseOrderById(purchaseOrderId)
    } catch {
      // Order not found, continue without it
    }
  }

  return (
    <PurchaseForm
      mode="create"
      duplicateFrom={duplicateData ?? undefined}
      fromPurchaseOrder={purchaseOrderData ?? undefined}
      initialSuppliers={suppliers}
      initialProducts={products}
      initialLocations={locations}
    />
  )
}

function FormSkeleton() {
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
