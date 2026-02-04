"use client";

import { DeleteQuoteDialog } from "@/components/presupuestos/delete-quote-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDebounce } from "@/hooks/use-debounce";
import { deleteQuoteAction } from "@/lib/actions/quotes";
import { getQuoteItemsCount } from "@/lib/services/quotes";
import type { Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/validations/sale";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  MoreHorizontal,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

type Quote = Tables<"quotes">;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "hoy";
  if (diff === 1) return "ayer";
  return format(date, "d MMM", { locale: es });
}

function formatFullDate(dateStr: string): string {
  return format(new Date(dateStr), "d 'de' MMMM 'de' yyyy, HH:mm", {
    locale: es,
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PresupuestosPageClientProps {
  quotes: Quote[];
  count: number;
  totalPages: number;
  currentFilters: {
    search: string;
    dateFrom: string;
    dateTo: string;
    page: number;
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PresupuestosPageClient({
  quotes,
  count,
  totalPages,
  currentFilters,
}: PresupuestosPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search with debounce
  const [searchInput, setSearchInput] = useState(currentFilters.search);
  const debouncedSearch = useDebounce(searchInput, 300);
  const isFirstRender = useRef(true);

  // Date filter
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [dateFilterType, setDateFilterType] = useState("ultimos");
  const [dateFilterQty, setDateFilterQty] = useState("30");
  const [dateFilterUnit, setDateFilterUnit] = useState("dias");

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync search input when URL changes (back/forward)
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

    if (currentFilters.search) merged.search = currentFilters.search;
    if (currentFilters.dateFrom) merged.dateFrom = currentFilters.dateFrom;
    if (currentFilters.dateTo) merged.dateTo = currentFilters.dateTo;
    if (currentFilters.page > 1) merged.page = String(currentFilters.page);

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
      router.push(qs ? `/presupuestos?${qs}` : "/presupuestos");
    });
  };

  const applyDateFilter = () => {
    const num = parseInt(dateFilterQty);
    if (isNaN(num) || num <= 0) return;
    const now = new Date();

    let dateFrom: string | undefined;
    let dateTo: string | undefined;

    if (dateFilterType === "ultimos" || dateFilterType === "despues") {
      const d = new Date(now);
      if (dateFilterUnit === "dias") d.setDate(d.getDate() - num);
      else if (dateFilterUnit === "semanas") d.setDate(d.getDate() - num * 7);
      else if (dateFilterUnit === "meses") d.setMonth(d.getMonth() - num);
      dateFrom = d.toISOString();
    }

    if (dateFilterType === "antes") {
      const d = new Date(now);
      if (dateFilterUnit === "dias") d.setDate(d.getDate() - num);
      else if (dateFilterUnit === "semanas") d.setDate(d.getDate() - num * 7);
      else if (dateFilterUnit === "meses") d.setMonth(d.getMonth() - num);
      dateTo = d.toISOString();
    }

    updateSearchParams({ dateFrom, dateTo, page: undefined });
    setDateFilterOpen(false);
  };

  const clearDateFilter = () => {
    updateSearchParams({
      dateFrom: undefined,
      dateTo: undefined,
      page: undefined,
    });
    setDateFilterOpen(false);
  };

  const dateFilterApplied =
    currentFilters.dateFrom !== "" || currentFilters.dateTo !== "";

  const hasActiveFilters =
    currentFilters.search !== "" || dateFilterApplied;

  // Handlers
  const handleLoadCart = (quoteId: string) => {
    router.push(`/ventas/nueva?quoteId=${quoteId}`);
  };

  const handleDownloadPDF = (quoteId: string) => {
    toast.info("Próximamente", {
      description: "La descarga de PDF estará disponible pronto.",
    });
  };

  const handleDeleteClick = (e: React.MouseEvent, quote: Quote) => {
    e.stopPropagation();
    setQuoteToDelete(quote);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!quoteToDelete) return;
    setIsDeleting(true);
    try {
      await deleteQuoteAction(quoteToDelete.id);
      toast.success("Presupuesto eliminado");
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
      router.refresh();
    } catch {
      toast.error("Error al eliminar presupuesto");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Presupuestos</h2>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative">
            {isPending ? (
              <Loader2 className="absolute left-2 top-2 h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Buscar por cliente o número…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-8 w-full pl-8 sm:w-[150px] lg:w-[250px]"
            />
          </div>

          {/* Date filter */}
          <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-8 justify-start border-dashed active:scale-100",
                  dateFilterApplied && "border-primary text-primary",
                )}
              >
                <Calendar className="size-4" />
                {dateFilterApplied ? "Filtro activo" : "Fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[17rem]" align="start">
              <div className="space-y-4">
                <Label className="text-sm font-semibold">
                  Fecha de creación
                </Label>
                <div className="space-y-3">
                  <Select
                    value={dateFilterType}
                    onValueChange={setDateFilterType}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ultimos">en los últimos</SelectItem>
                      <SelectItem value="antes">antes de</SelectItem>
                      <SelectItem value="despues">después de</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={dateFilterQty}
                      onChange={(e) => setDateFilterQty(e.target.value)}
                      className="w-full"
                    />
                    <Select
                      value={dateFilterUnit}
                      onValueChange={setDateFilterUnit}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dias">días</SelectItem>
                        <SelectItem value="semanas">semanas</SelectItem>
                        <SelectItem value="meses">meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button className="w-full" onClick={applyDateFilter}>
                      Aplicar
                    </Button>
                    {dateFilterApplied && (
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={clearDateFilter}
                      >
                        Limpiar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Global clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              className="h-8"
              onClick={() => {
                setSearchInput("");
                startTransition(() => {
                  router.push("/presupuestos");
                });
              }}
            >
              Limpiar filtros
              <X className="ml-1 size-4" />
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="space-y-4">
          <div
            className={cn(
              "overflow-hidden rounded-lg border",
              isPending && "opacity-50",
            )}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N.º</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Productos
                  </TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-4 rounded-full bg-muted p-4">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold">
                          Sin presupuestos
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Los presupuestos guardados desde el punto de venta
                          aparecerán aquí.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((quote) => {
                    const itemsCount = getQuoteItemsCount(quote.items);
                    return (
                      <TableRow
                        key={quote.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          router.push(`/presupuestos/${quote.id}`)
                        }
                      >
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">
                            {quote.quote_number}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {quote.customer_name || "Consumidor Final"}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {itemsCount}{" "}
                            {itemsCount === 1 ? "producto" : "productos"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {formatPrice(Number(quote.total))}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm text-muted-foreground">
                                {formatRelativeDate(quote.created_at)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {formatFullDate(quote.created_at)}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoadCart(quote.id);
                                }}
                              >
                                <ShoppingCart className="mr-2 size-4" />
                                Cargar carrito
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPDF(quote.id);
                                }}
                              >
                                <Download className="mr-2 size-4" />
                                Descargar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => handleDeleteClick(e, quote)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 size-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {count > 0 && (
            <div className="flex items-center justify-between px-2">
              <div className="hidden flex-1 text-sm text-muted-foreground md:block">
                Mostrando {quotes.length} de {count} resultados
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateSearchParams({
                      page:
                        currentFilters.page > 2
                          ? String(currentFilters.page - 1)
                          : undefined,
                    })
                  }
                  disabled={currentFilters.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex w-[120px] items-center justify-center text-sm font-medium">
                  Página {currentFilters.page} de {totalPages || 1}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateSearchParams({
                      page: String(currentFilters.page + 1),
                    })
                  }
                  disabled={currentFilters.page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete dialog */}
      <DeleteQuoteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        quoteNumber={quoteToDelete?.quote_number || undefined}
      />
    </div>
  );
}
