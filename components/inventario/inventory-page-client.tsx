"use client";

import {
  Download,
  Loader2,
  MoreVertical,
  Package,
  Search,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { StockManagementDialog } from "@/components/productos/stock-management-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useDebounce } from "@/hooks/use-debounce";
import { batchUpsertStockAction } from "@/lib/actions/inventory";
import type { Location } from "@/lib/services/locations";
import type {
  InventoryProduct,
  TransitData,
} from "@/lib/services/products-cached";

const PAGE_SIZE = 20;

interface InventoryPageClientProps {
  products: InventoryProduct[];
  count: number;
  totalPages: number;
  locations: Location[];
  transitData: TransitData;
  currentFilters: {
    search: string;
    location: string;
    page: number;
  };
  userId: string;
}

export function InventoryPageClient({
  products,
  count,
  totalPages,
  locations,
  transitData,
  currentFilters,
  userId,
}: InventoryPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  // Local search state with debounce
  const [search, setSearch] = useState(currentFilters.search);
  const debouncedSearch = useDebounce(search, 300);

  const page = currentFilters.page;
  const selectedLocation = currentFilters.location || "";

  // Inline editing state
  const [editedQuantities, setEditedQuantities] = useState<
    Record<string, number>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  // StockManagementDialog state
  const [stockManagementProduct, setStockManagementProduct] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const hasUnsavedChanges = Object.keys(editedQuantities).length > 0;

  // URL update helper
  const updateURL = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === undefined) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      // Remove page when filters change (unless page is being set explicitly)
      if (!("page" in updates)) {
        params.delete("page");
      }

      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname);
      });
    },
    [searchParams, pathname, router],
  );

  // Debounced search -> URL
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    updateURL({ search: debouncedSearch || null });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear edited quantities when URL changes (new data arrives)
  useEffect(() => {
    setEditedQuantities({});
  }, [searchParams]);

  function handleLocationChange(value: string) {
    updateURL({ location: value === "all" ? null : value });
  }

  function handleQuantityChange(productId: string, value: string) {
    const numValue = value === "" ? 0 : parseInt(value) || 0;
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const originalValue =
      selectedLocation && product.location_stock !== null
        ? product.location_stock
        : product.stock_quantity;

    if (numValue === originalValue) {
      // Remove from edited if same as original
      setEditedQuantities((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    } else {
      setEditedQuantities((prev) => ({ ...prev, [productId]: numValue }));
    }
  }

  function getDisplayQuantity(product: InventoryProduct): number {
    if (product.id in editedQuantities) {
      return editedQuantities[product.id];
    }
    return selectedLocation && product.location_stock !== null
      ? product.location_stock
      : product.stock_quantity;
  }

  function discardChanges() {
    setEditedQuantities({});
  }

  async function saveChanges() {
    if (!selectedLocation) {
      toast.error("Seleccioná una ubicación para guardar cambios");
      return;
    }

    setIsSaving(true);
    try {
      const changes = Object.entries(editedQuantities).map(
        ([product_id, quantity]) => ({
          product_id,
          location_id: selectedLocation,
          quantity,
        }),
      );

      const result = await batchUpsertStockAction({ changes, userId });
      toast.success(`Se actualizaron ${result.updated} productos`);
      setEditedQuantities({});
      router.refresh();
    } catch (error) {
      console.error("Error saving inventory:", error);
      toast.error("Error al guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventario</h1>
        <Button
          variant="outline"
          onClick={() => toast.info("Exportación próximamente")}
        >
          <Download className="sm:mr-2 h-4 w-4" />
          <span className="hidden sm:block">Exportar</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={selectedLocation || "all"}
          onValueChange={handleLocationChange}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Todas las ubicaciones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ubicaciones</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Empty State */}
      {products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Sin productos</h3>
          <p className="text-muted-foreground text-sm mb-4 text-center">
            {currentFilters.search
              ? "No se encontraron productos con esa búsqueda"
              : "No hay productos activos en el inventario"}
          </p>
        </div>
      )}

      {/* Table */}
      {products.length > 0 && (
        <>
          <div
            className={`rounded-md border ${isPending ? "opacity-50 pointer-events-none" : ""}`}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help underline decoration-dotted underline-offset-4">
                            En mano
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cantidad física en ubicación</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help underline decoration-dotted underline-offset-4">
                            Entrante
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cantidad en tránsito hacia esta ubicación</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help underline decoration-dotted underline-offset-4">
                            Disponible
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>En mano menos saliente en tránsito</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const onHand = getDisplayQuantity(product);
                  const incoming = transitData.incoming[product.id] ?? 0;
                  const outgoing = transitData.outgoing[product.id] ?? 0;
                  const available = onHand - outgoing;
                  const isEdited = product.id in editedQuantities;

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <span className="font-medium">{product.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {product.sku || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {selectedLocation ? (
                          <div className="ml-auto w-24">
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              value={getDisplayQuantity(product)}
                              onChange={(e) =>
                                handleQuantityChange(product.id, e.target.value)
                              }
                              className={`h-8 text-right font-medium ${isEdited ? "border-blue-500 ring-1 ring-blue-500" : ""}`}
                            />
                          </div>
                        ) : (
                          <span className="tabular-nums font-medium">
                            {onHand}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="tabular-nums">
                          {incoming > 0 ? incoming : 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="tabular-nums">{available}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                setStockManagementProduct({
                                  id: product.id,
                                  name: product.name,
                                })
                              }
                            >
                              <Package className="mr-2 h-4 w-4" />
                              Gestionar Stock
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * PAGE_SIZE + 1}-
                {Math.min(page * PAGE_SIZE, count)} de {count} resultados
              </div>

              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </div>

                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          updateURL({
                            page: page > 1 ? String(page - 1) : null,
                          })
                        }
                        className={
                          page === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      if (pageNum < 1 || pageNum > totalPages) return null;

                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() =>
                              updateURL({
                                page: pageNum > 1 ? String(pageNum) : null,
                              })
                            }
                            isActive={page === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          updateURL({
                            page:
                              page < totalPages
                                ? String(page + 1)
                                : String(totalPages),
                          })
                        }
                        className={
                          page === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </>
      )}

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-4 shadow-lg">
          <div className="mx-auto flex max-w-screen-xl items-center justify-between">
            <p className="text-sm font-medium">
              {Object.keys(editedQuantities).length} producto
              {Object.keys(editedQuantities).length !== 1 ? "s" : ""} modificado
              {Object.keys(editedQuantities).length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={discardChanges}
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                Descartar
              </Button>
              <Button size="sm" onClick={saveChanges} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Management Dialog */}
      {stockManagementProduct && (
        <StockManagementDialog
          product={stockManagementProduct}
          onClose={() => setStockManagementProduct(null)}
          onSuccess={() => {
            setStockManagementProduct(null);
            router.refresh();
          }}
          locations={locations}
        />
      )}
    </div>
  );
}
