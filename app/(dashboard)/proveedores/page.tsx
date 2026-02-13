import { Suspense } from "react"
import { redirect } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"

import { requirePermission } from "@/lib/auth/check-permission"
import { getOrganizationId } from "@/lib/auth/get-organization"
import { getServerUser } from "@/lib/auth/get-server-user"
import { getCachedSuppliers } from "@/lib/services/suppliers-cached"
import { SuppliersPageClient } from "@/components/proveedores/suppliers-page-client"

export default async function ProveedoresPage() {
  await requirePermission("suppliers:read")
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SuppliersContent />
    </Suspense>
  )
}

async function SuppliersContent() {
  const user = await getServerUser()
  if (!user) redirect("/login")
  const organizationId = await getOrganizationId()

  const suppliers = await getCachedSuppliers(organizationId)

  return <SuppliersPageClient initialSuppliers={suppliers} />
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 md:max-w-70" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
