import { Suspense } from "react"
import { redirect, notFound } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"

import { getServerUser } from "@/lib/auth/get-server-user"
import {
  getCachedPurchaseById,
  getCachedPaymentsByPurchaseId,
} from "@/lib/services/purchases-cached"
import { CompraDetalleClient } from "@/components/compras/compra-detalle-client"

export default async function CompraDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <CompraDetalleContent id={id} />
    </Suspense>
  )
}

async function CompraDetalleContent({ id }: { id: string }) {
  const user = await getServerUser()
  if (!user) redirect("/login")

  const [purchase, payments] = await Promise.all([
    getCachedPurchaseById(id),
    getCachedPaymentsByPurchaseId(id),
  ])

  if (!purchase) notFound()

  return <CompraDetalleClient purchase={purchase} payments={payments} />
}

function DetailSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
        <div className="col-span-2 space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </div>
  )
}
