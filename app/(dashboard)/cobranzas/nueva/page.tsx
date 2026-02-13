import { Suspense } from "react"

import { Loader2 } from "lucide-react"

import { requirePermission } from "@/lib/auth/check-permission"

import { NuevaCobranzaContent } from "./nueva-cobranza-content"

export default async function NuevaCobranzaPage() {
  await requirePermission("sales:read")
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <NuevaCobranzaContent />
    </Suspense>
  )
}
