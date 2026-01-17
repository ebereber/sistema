"use client";

import { Download, FileUp, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

import { SupplierDialog } from "@/components/proveedores/supplier-dialog";
import { SupplierTable } from "@/components/proveedores/supplier-table";

import {
  archiveSupplier,
  deleteSupplier,
  getSuppliers,
  unarchiveSupplier,
  type Supplier,
} from "@/lib/services/suppliers";

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showActive, setShowActive] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Determine active filter
      let activeFilter: boolean | undefined;
      if (showActive && !showArchived) {
        activeFilter = true;
      } else if (!showActive && showArchived) {
        activeFilter = false;
      } else if (showActive && showArchived) {
        activeFilter = undefined; // Show all
      } else {
        // Neither selected, show active by default
        activeFilter = true;
      }

      const data = await getSuppliers({
        search: debouncedSearch || undefined,
        active: activeFilter,
      });
      setSuppliers(data);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar proveedores", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, showActive, showArchived]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  async function handleArchive(id: string) {
    try {
      await archiveSupplier(id);
      toast.success("Proveedor archivado");
      loadSuppliers();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al archivar proveedor", { description: errorMessage });
    }
  }

  async function handleUnarchive(id: string) {
    try {
      await unarchiveSupplier(id);
      toast.success("Proveedor desarchivado");
      loadSuppliers();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al desarchivar proveedor", {
        description: errorMessage,
      });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSupplier(id);
      toast.success("Proveedor eliminado");
      loadSuppliers();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al eliminar proveedor", { description: errorMessage });
    }
  }

  function handleSupplierCreated() {
    loadSuppliers();
  }

  function clearFilters() {
    setShowActive(true);
    setShowArchived(false);
  }

  const activeFilterCount =
    (showActive ? 1 : 0) +
    (showArchived ? 1 : 0) -
    (showActive && !showArchived ? 1 : 0);

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
                {/* {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                    {activeFilterCount}
                  </Badge>
                )} */}
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
                {/*  <Separator className="" /> */}
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
        suppliers={suppliers}
        isLoading={isLoading}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onDelete={handleDelete}
        onSuccess={handleSupplierCreated}
      />

      {/* Results count */}
      {!isLoading && suppliers.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {suppliers.length} resultado
          {suppliers.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
