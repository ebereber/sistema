import { Suspense } from "react"

import { Loader2 } from "lucide-react"

import { NuevaNcContent } from "./nueva-nc-content"

export default function NuevaNcPage() {
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
