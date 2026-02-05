"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { POSSheet } from "@/components/configuracion/pos-sheet"
import { POSTable } from "@/components/configuracion/pos-table"
import { deletePOSAction } from "@/lib/actions/point-of-sale"
import type { Location } from "@/lib/services/locations"
import type { PointOfSale } from "@/lib/services/point-of-sale"

interface PuntosDeVentaPageClientProps {
  initialPointsOfSale: PointOfSale[]
  locations?: Location[]
}

export function PuntosDeVentaPageClient({
  initialPointsOfSale,
  locations,
}: PuntosDeVentaPageClientProps) {
  const router = useRouter()

  async function handleDelete(id: string) {
    try {
      await deletePOSAction(id)
      toast.success("Punto de venta eliminado")
      router.refresh()
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error al eliminar punto de venta", {
        description: errorMessage,
      })
    }
  }

  function handleSuccess() {
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <POSSheet
          mode="create"
          locations={locations}
          onSuccess={handleSuccess}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar punto de venta
              <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                N
              </Badge>
            </Button>
          }
        />
      </div>

      {/* Table */}
      <POSTable
        pointsOfSale={initialPointsOfSale}
        locations={locations}
        isLoading={false}
        onDelete={handleDelete}
        onSuccess={handleSuccess}
      />

      {/* Results count */}
      {initialPointsOfSale.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {initialPointsOfSale.length} punto
          {initialPointsOfSale.length !== 1 ? "s" : ""} de venta
        </div>
      )}
    </div>
  )
}
