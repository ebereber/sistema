"use client";

import { ChevronDown, History, Info, Loader2, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { PriceHistoryDialog } from "@/components/productos/price-history-dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import {
  exportPricesAction,
  updateProductPricesAction,
} from "@/lib/actions/products";
import type { Product } from "@/lib/services/products";
import { createClient } from "@/lib/supabase/client";
import type { PriceRoundingType } from "@/types/types";

const PAGE_SIZE = 20;

// ─── Argentine number formatting ───────────────────────────────

function formatAR(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseAR(value: string): number {
  if (!value) return 0;
  let cleaned = value.replace(/[$\s]/g, "");
  if (cleaned.includes(".") && cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function applyRounding(price: number, rounding: PriceRoundingType): number {
  const roundTo = parseInt(rounding);
  if (isNaN(roundTo) || roundTo <= 0) return price;
  return Math.round(price / roundTo) * roundTo;
}

// ─── Types ─────────────────────────────────────────────────────

interface PriceChange {
  cost: string;
  price: string;
}

interface PreciosPageClientProps {
  products: Product[];
  count: number;
  totalPages: number;
  currentFilters: { search: string; page: number };
  priceRounding: PriceRoundingType;
}

export function PreciosPageClient({
  products,
  count,
  totalPages,
  currentFilters,
  priceRounding,
}: PreciosPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  const [search, setSearch] = useState(currentFilters.search);
  const debouncedSearch = useDebounce(search, 300);
  const page = currentFilters.page;

  // Edited values: productId -> { cost, price } as display strings
  const [changes, setChanges] = useState<Record<string, PriceChange>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Price history dialog
  const [historyProduct, setHistoryProduct] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const hasChanges = Object.keys(changes).length > 0;

  // ─── URL navigation ────────────────────────────────────────

  const updateURL = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
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

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    updateURL({ search: debouncedSearch || null });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Value getters ─────────────────────────────────────────

  function getDisplayCost(product: Product): string {
    return changes[product.id]?.cost ?? formatAR(product.cost ?? 0);
  }

  function getDisplayPrice(product: Product): string {
    return changes[product.id]?.price ?? formatAR(product.price);
  }

  // ─── Input handlers ────────────────────────────────────────

  function handleCostChange(product: Product, rawValue: string) {
    const existing = changes[product.id];
    setChanges((prev) => ({
      ...prev,
      [product.id]: {
        cost: rawValue,
        price: existing?.price ?? formatAR(product.price),
      },
    }));
  }

  function handleCostBlur(product: Product) {
    const change = changes[product.id];
    if (!change) return;

    const cost = parseAR(change.cost);
    const price = parseAR(change.price);

    // If nothing actually changed, remove from changes
    if (cost === (product.cost ?? 0) && price === product.price) {
      setChanges((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      return;
    }

    // Reformat display
    setChanges((prev) => ({
      ...prev,
      [product.id]: {
        cost: formatAR(cost),
        price: change.price,
      },
    }));
  }

  function handlePriceChange(product: Product, rawValue: string) {
    const existing = changes[product.id];
    setChanges((prev) => ({
      ...prev,
      [product.id]: {
        cost: existing?.cost ?? formatAR(product.cost ?? 0),
        price: rawValue,
      },
    }));
  }

  function handlePriceBlur(product: Product) {
    const change = changes[product.id];
    if (!change) return;

    let price = parseAR(change.price);
    const cost = parseAR(change.cost);

    // Apply rounding to price
    price = applyRounding(price, priceRounding);

    // If nothing actually changed, remove from changes
    if (cost === (product.cost ?? 0) && price === product.price) {
      setChanges((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      return;
    }

    setChanges((prev) => ({
      ...prev,
      [product.id]: {
        cost: change.cost,
        price: formatAR(price),
      },
    }));
  }

  // ─── Export ─────────────────────────────────────────────────

  async function handleExportExcel() {
    setIsExporting(true);
    try {
      const base64 = await exportPricesAction();
      const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `precios-${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Exportación completada");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al exportar", { description: msg });
    } finally {
      setIsExporting(false);
    }
  }

  // ─── Save / Discard ────────────────────────────────────────

  function handleDiscard() {
    setChanges({});
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Error de autenticación");
        return;
      }

      const payload = Object.entries(changes).map(([productId, change]) => {
        const product = products.find((p) => p.id === productId);
        const cost = parseAR(change.cost);
        const price = parseAR(change.price);
        const taxRate = product?.tax_rate ?? 21;
        const precioSinIVA = price / (1 + taxRate / 100);
        const marginPercentage =
          cost > 0
            ? Math.round(((precioSinIVA - cost) / cost) * 100 * 100) / 100
            : 0;

        return { productId, cost, price, marginPercentage };
      });

      const updated = await updateProductPricesAction({
        changes: payload,
        userId: user.id,
      });

      setChanges({});
      toast.success(`${updated} producto(s) actualizado(s)`);
      router.refresh();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al guardar", { description: msg });
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Precios</h2>
      </div>

      {/* Filters and Actions */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto…"
              className="h-8 w-full pl-8 sm:w-[150px] lg:w-[250px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="default" className="h-8 gap-1.5">
                Exportar
                <ChevronDown className="ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleExportExcel}
                disabled={isExporting}
              >
                {isExporting ? "Exportando..." : "Exportar a Excel"}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Exportar a PDF
                <span className="ml-2 text-xs text-muted-foreground">
                  Próximamente
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Table */}
        <div
          className={`overflow-x-auto rounded-lg border ${isPending ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-64 text-left">Producto</TableHead>
                <TableHead className="whitespace-nowrap text-right">
                  Costo
                </TableHead>
                <TableHead className="whitespace-nowrap text-right">
                  Precio
                </TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No se encontraron productos
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="min-w-64 text-left">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {product.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {product.sku}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        className="ml-auto h-8 w-28 text-right font-medium"
                        value={getDisplayCost(product)}
                        onChange={(e) =>
                          handleCostChange(product, e.target.value)
                        }
                        onBlur={() => handleCostBlur(product)}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        className="ml-auto h-8 w-28 text-right font-medium"
                        value={getDisplayPrice(product)}
                        onChange={(e) =>
                          handlePriceChange(product, e.target.value)
                        }
                        onBlur={() => handlePriceBlur(product)}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() =>
                          setHistoryProduct({
                            id: product.id,
                            name: product.name,
                          })
                        }
                      >
                        <History className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
      </div>

      {/* Unsaved Changes Banner */}
      {hasChanges && (
        <div className="fixed inset-x-0 bottom-8 z-50 flex animate-in fade-in slide-in-from-bottom-4 zoom-in-95 justify-center fill-mode-both duration-300">
          <div className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 shadow-[0_16px_36px_-6px_rgba(0,0,0,0.36),0_6px_16px_-2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_0_2px_2px_rgba(255,255,255,0.06)]">
            <Info className="size-4 text-primary-foreground" />
            <span className="text-sm text-primary-foreground">
              {Object.keys(changes).length} cambio(s) sin guardar
            </span>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 gap-1 rounded-[min(var(--radius-md),12px)] bg-destructive/10 px-2.5 text-[0.8rem] text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40"
              onClick={handleDiscard}
              disabled={isSaving}
            >
              Descartar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem]"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Price History Dialog */}
      {historyProduct && (
        <PriceHistoryDialog
          productId={historyProduct.id}
          productName={historyProduct.name}
          open={true}
          onOpenChange={(open) => {
            if (!open) setHistoryProduct(null);
          }}
        />
      )}
    </div>
  );
}
