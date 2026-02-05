"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { PriceListSheet } from "@/components/configuracion/price-list-sheet"
import { PriceListTable } from "@/components/configuracion/price-list-table"
import { deletePriceListAction } from "@/lib/actions/price-lists"
import type { PriceList } from "@/lib/services/price-lists"

interface ListasPreciosPageClientProps {
  initialPriceLists: PriceList[]
}

export function ListasPreciosPageClient({
  initialPriceLists,
}: ListasPreciosPageClientProps) {
  const router = useRouter()

  async function handleDelete(id: string) {
    try {
      await deletePriceListAction(id)
      toast.success("Lista de precios eliminada")
      router.refresh()
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error al eliminar lista de precios", {
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
        <PriceListSheet
          mode="create"
          onSuccess={handleSuccess}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar lista de precios
              <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                N
              </Badge>
            </Button>
          }
        />
      </div>

      {/* Table */}
      <PriceListTable
        priceLists={initialPriceLists}
        isLoading={false}
        onDelete={handleDelete}
        onSuccess={handleSuccess}
      />

      {/* Results count */}
      {initialPriceLists.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {initialPriceLists.length} lista
          {initialPriceLists.length !== 1 ? "s" : ""} de precios
        </div>
      )}
    </div>
  )
}
