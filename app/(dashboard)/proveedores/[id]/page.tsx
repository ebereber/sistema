import { Suspense } from "react"
import { redirect, notFound } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"

import { getServerUser } from "@/lib/auth/get-server-user"
import {
  getCachedSupplierById,
  getCachedSupplierStats,
  getCachedSupplierRecentPurchases,
} from "@/lib/services/suppliers-cached"
import { SupplierDetailClient } from "@/components/proveedores/supplier-detail-client"

export default async function ProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Suspense fallback={<DetailSkeleton />}>
      <SupplierDetailContent id={id} />
    </Suspense>
  )
}

async function SupplierDetailContent({ id }: { id: string }) {
  const user = await getServerUser()
  if (!user) redirect("/login")

  const [supplier, stats, recentPurchases] = await Promise.all([
    getCachedSupplierById(id),
    getCachedSupplierStats(id),
    getCachedSupplierRecentPurchases(id),
  ])

  if (!supplier) notFound()

  return (
    <SupplierDetailClient
      supplier={supplier}
      stats={stats}
      recentPurchases={recentPurchases}
    />
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-48" />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    </div>
  )
}
