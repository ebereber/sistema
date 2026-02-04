"use client"

import { Download, FileUp, Plus, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

import { SupplierDialog } from "@/components/proveedores/supplier-dialog"
import { SupplierTable } from "@/components/proveedores/supplier-table"

import {
  archiveSupplierAction,
  unarchiveSupplierAction,
  deleteSupplierAction,
} from "@/lib/actions/suppliers"
import type { Supplier } from "@/lib/services/suppliers"

interface SuppliersPageClientProps {
  initialSuppliers: Supplier[]
}

export function SuppliersPageClient({
  initialSuppliers,
}: SuppliersPageClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [showActive, setShowActive] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Client-side filtering
  const filteredSuppliers = useMemo(() => {
    let result = initialSuppliers

    // Filter by active/archived status
    if (showActive && !showArchived) {
      result = result.filter((s) => s.active)
    } else if (!showActive && showArchived) {
      result = result.filter((s) => !s.active)
    } else if (!showActive && !showArchived) {
      // Neither selected, show active by default
      result = result.filter((s) => s.active)
    }
    // showActive && showArchived → show all

    // Filter by search term
    if (debouncedSearch.trim()) {
      const term = debouncedSearch.trim().toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          (s.tax_id && s.tax_id.toLowerCase().includes(term))
      )
    }

    return result
  }, [initialSuppliers, showActive, showArchived, debouncedSearch])

  async function handleArchive(id: string) {
    try {
      await archiveSupplierAction(id)
      toast.success("Proveedor archivado")
      router.refresh()
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error al archivar proveedor", { description: errorMessage })
    }
  }

  async function handleUnarchive(id: string) {
    try {
      await unarchiveSupplierAction(id)
      toast.success("Proveedor desarchivado")
      router.refresh()
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error al desarchivar proveedor", {
        description: errorMessage,
      })
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSupplierAction(id)
      toast.success("Proveedor eliminado")
      router.refresh()
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error al eliminar proveedor", { description: errorMessage })
    }
  }

  function handleSupplierCreated() {
    router.refresh()
  }

  function clearFilters() {
    setShowActive(true)
    setShowArchived(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proveedores</h1>
          <p className="text-muted-foreground">
            Gestiona tus proveedores y sus datos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => toast.info("Funcionalidad próximamente")}
          >
            <FileUp className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <SupplierDialog
            mode="create"
            onSuccess={handleSupplierCreated}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo proveedor
                <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                  N
                </Badge>
              </Button>
            }
          />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between">
        <div className="relative flex-1 md:max-w-70">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o CUIT/CUIL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 border-dashed">
                Estado
                {showActive == true && (
                  <>
                    <Separator orientation="vertical" />
                    <span className="text-xs">Activo</span>
                  </>
                )}
                {showArchived == true && (
                  <>
                    <Separator orientation="vertical" />
                    <span className="text-xs">Archivado</span>
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-50" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="active"
                      checked={showActive}
                      onCheckedChange={(checked) =>
                        setShowActive(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="active"
                      className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                    >
                      Activo
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="archived"
                      checked={showArchived}
                      onCheckedChange={(checked) =>
                        setShowArchived(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="archived"
                      className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                    >
                      Archivado
                    </label>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={clearFilters}
                >
                  Limpiar filtro
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            onClick={() => toast.info("Funcionalidad próximamente")}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Table */}
      <SupplierTable
        suppliers={filteredSuppliers}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onDelete={handleDelete}
        onSuccess={handleSupplierCreated}
      />

      {/* Results count */}
      {filteredSuppliers.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {filteredSuppliers.length} resultado
          {filteredSuppliers.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  )
}
