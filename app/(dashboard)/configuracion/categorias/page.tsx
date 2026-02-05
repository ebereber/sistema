import { Suspense } from "react"
import { redirect } from "next/navigation"

import { Loader2 } from "lucide-react"

import { getServerUser } from "@/lib/auth/get-server-user"
import { getCachedCategoriesHierarchy } from "@/lib/services/categories-cached"
import { CategoriasPageClient } from "@/components/configuracion/categorias-page-client"

export default async function CategoriasPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CategoriasContent />
    </Suspense>
  )
}

async function CategoriasContent() {
  const user = await getServerUser()
  if (!user) redirect("/login")

  const categories = await getCachedCategoriesHierarchy()

  return <CategoriasPageClient initialCategories={categories} />
}

function PageSkeleton() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
