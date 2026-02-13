import { Suspense } from "react"

import { Loader2 } from "lucide-react"

import { requirePermission } from "@/lib/auth/check-permission"

import { NuevaNcContent } from "./nueva-nc-content"

export default async function NuevaNcPage() {
  await requirePermission("sales:write")
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <NuevaNcContent />
    </Suspense>
  )
}
