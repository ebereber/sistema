"use client";

import { Download, FileUp, Loader2, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
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
import { cn } from "@/lib/utils";

import { CustomerDialog } from "@/components/clientes/customer-dialog";
import { CustomerTable } from "@/components/clientes/customer-table";

import { useDebounce } from "@/hooks/use-debounce";
import {
  archiveCustomerAction,
  deleteCustomerAction,
  unarchiveCustomerAction,
} from "@/lib/actions/customers";
import type { Customer } from "@/lib/services/customers";

interface CustomersPageClientProps {
  customers: Customer[];
  count: number;
  totalPages: number;
  currentFilters: {
    search: string;
    status: string;
    page: number;
  };
}

export function CustomersPageClient({
  customers,
  count,
  totalPages,
  currentFilters,
}: CustomersPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search with debounce
  const [searchInput, setSearchInput] = useState(currentFilters.search);
  const debouncedSearch = useDebounce(searchInput, 300);
  const isFirstRender = useRef(true);

  // Filter popover state
  const [filterOpen, setFilterOpen] = useState(false);

  // Sync search input when URL changes externally (e.g. back/forward)
  useEffect(() => {
    setSearchInput(currentFilters.search);
  }, [currentFilters.search]);

  // Push debounced search to URL
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    updateSearchParams({
      search: debouncedSearch || undefined,
      page: undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Helper: build URL from filter updates and navigate
  const updateSearchParams = (updates: Record<string, string | undefined>) => {
    const merged: Record<string, string> = {};

    // Start from current filters
    if (currentFilters.search) merged.search = currentFilters.search;
    if (currentFilters.status) merged.status = currentFilters.status;
    if (currentFilters.page > 1) merged.page = String(currentFilters.page);

    // Apply updates (undefined = remove)
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        merged[key] = value;
      } else {
        delete merged[key];
      }
    }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      params.set(key, value);
    }

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/clientes?${qs}` : "/clientes");
    });
  };

  // Derive active/archived state from status filter
  /*   const showActive =
    currentFilters.status === "" || currentFilters.status === "active" || currentFilters.status === "all";
  const showArchived =
    currentFilters.status === "archived" || currentFilters.status === "all"; */
  const showActive = currentFilters.status === "active";
  const showArchived = currentFilters.status === "archived";

  const handleStatusChange = (active: boolean, archived: boolean) => {
    let status: string | undefined;
    if (active && !archived) {
      status = "active";
    } else if (!active && archived) {
      status = "archived";
    } else {
      status = undefined; // ninguno o ambos = todos
    }
    updateSearchParams({ status, page: undefined });
  };

  const clearFilters = () => {
    updateSearchParams({ status: undefined, page: undefined });
  };

  async function handleArchive(id: string) {
    try {
      await archiveCustomerAction(id);
      toast.success("Cliente archivado");
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al archivar cliente", { description: errorMessage });
    }
  }

  async function handleUnarchive(id: string) {
    try {
      await unarchiveCustomerAction(id);
      toast.success("Cliente desarchivado");
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al desarchivar cliente", {
        description: errorMessage,
      });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCustomerAction(id);
      toast.success("Cliente eliminado");
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al eliminar cliente", { description: errorMessage });
    }
  }

  function handleCustomerCreated() {
    router.refresh();
  }

  const hasActiveFilters =
    currentFilters.search !== "" || currentFilters.status !== "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona tus clientes y sus datos
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
          <CustomerDialog
            mode="create"
            onSuccess={handleCustomerCreated}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo cliente
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
          {isPending ? (
            <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            placeholder="Buscar por nombre o CUIT/CUIL..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "gap-2 border-dashed",
                  currentFilters.status && "border-solid bg-accent",
                )}
              >
                Estado
                {currentFilters.status === "active" && (
                  <>
                    <Separator orientation="vertical" />
                    <span className="text-xs">Activo</span>
                  </>
                )}
                {currentFilters.status === "archived" && (
                  <>
                    <Separator orientation="vertical" />
                    <span className="text-xs">Archivado</span>
                  </>
                )}
                {currentFilters.status && (
                  <X
                    className="ml-1 h-3 w-3 hover:opacity-70"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFilters();
                    }}
                  />
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
                        handleStatusChange(checked as boolean, showArchived)
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
                        handleStatusChange(showActive, checked as boolean)
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
      <div className={cn(isPending && "opacity-50")}>
        <CustomerTable
          customers={customers}
          isLoading={false}
          onArchive={handleArchive}
          onUnarchive={handleUnarchive}
          onDelete={handleDelete}
          onSuccess={handleCustomerCreated}
        />
      </div>

      {/* Results count */}
      {customers.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {customers.length} de {count} resultado
          {count !== 1 ? "s" : ""}
        </div>
      )}

      {totalPages > 0 && (
        <div className="flex items-center justify-between px-2 py-4">
          <p className="text-sm text-muted-foreground">
            Página {currentFilters.page} de {totalPages} ({count} clientes)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentFilters.page <= 1 || isPending}
              onClick={() =>
                updateSearchParams({ page: String(currentFilters.page - 1) })
              }
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentFilters.page >= totalPages || isPending}
              onClick={() =>
                updateSearchParams({ page: String(currentFilters.page + 1) })
              }
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
