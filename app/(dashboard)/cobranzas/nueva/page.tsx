import { Suspense } from "react"

import { Loader2 } from "lucide-react"

import { NuevaCobranzaContent } from "./nueva-cobranza-content"

export default function NuevaCobranzaPage() {
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
