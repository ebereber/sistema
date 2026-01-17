"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { PriceListDialog } from "@/components/configuracion/price-list-dialog"
import { PriceListTable } from "@/components/configuracion/price-list-table"

import {
  getPriceLists,
  deletePriceList,
  type PriceList,
} from "@/lib/services/price-lists"

export default function ListasPreciosPage() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadPriceLists = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getPriceLists()
      setPriceLists(data)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error al cargar listas de precios", { description: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPriceLists()
  }, [loadPriceLists])

  async function handleDelete(id: string) {
    try {
      await deletePriceList(id)
      toast.success("Lista de precios eliminada")
      loadPriceLists()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error al eliminar lista de precios", { description: errorMessage })
    }
  }

  function handleSuccess() {
    loadPriceLists()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Listas de Precios</h1>
          <p className="text-muted-foreground">
            Creá listas de precios con descuentos o aumentos automáticos
          </p>
        </div>
        <PriceListDialog
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
        priceLists={priceLists}
        isLoading={isLoading}
        onDelete={handleDelete}
        onSuccess={handleSuccess}
      />

      {/* Results count */}
      {!isLoading && priceLists.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {priceLists.length} lista{priceLists.length !== 1 ? "s" : ""} de precios
        </div>
      )}
    </div>
  )
}
