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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  deleteQuote,
  getQuoteItemsCount,
  getQuotes,
  type GetQuotesFilters,
} from "@/lib/services/quotes";
import type { Database } from "@/lib/supabase/database.types";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Quote = Database["public"]["Tables"]["quotes"]["Row"];

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "hoy";
  if (diffDays === 1) return "ayer";
  return format(date, "d MMM", { locale: es });
}

function formatFullDate(dateStr: string): string {
  return format(new Date(dateStr), "d 'de' MMMM 'de' yyyy, HH:mm", {
    locale: es,
  });
}

function computeDateFrom(
  tipo: string,
  cantidad: string,
  unidad: string,
): string | undefined {
  const num = parseInt(cantidad);
  if (isNaN(num) || num <= 0) return undefined;

  const now = new Date();
  let ms = 0;

  switch (unidad) {
    case "dias":
      ms = num * 24 * 60 * 60 * 1000;
      break;
    case "semanas":
      ms = num * 7 * 24 * 60 * 60 * 1000;
      break;
    case "meses": {
      const past = new Date(now);
      past.setMonth(past.getMonth() - num);
      return past.toISOString();
    }
  }

  if (tipo === "ultimos" || tipo === "despues") {
    return new Date(now.getTime() - ms).toISOString();
  }
  return undefined;
}

function computeDateTo(
  tipo: string,
  cantidad: string,
  unidad: string,
): string | undefined {
  if (tipo !== "antes") return undefined;

  const num = parseInt(cantidad);
  if (isNaN(num) || num <= 0) return undefined;

  const now = new Date();

  switch (unidad) {
    case "dias":
      return new Date(now.getTime() - num * 24 * 60 * 60 * 1000).toISOString();
    case "semanas":
      return new Date(
        now.getTime() - num * 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
    case "meses": {
      const past = new Date(now);
      past.setMonth(past.getMonth() - num);
      return past.toISOString();
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export default function PresupuestosPage() {
  const router = useRouter();

  // Data
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Date filter
  const [filtroFechaOpen, setFiltroFechaOpen] = useState(false);
  const [filtroFechaTipo, setFiltroFechaTipo] = useState("ultimos");
  const [filtroFechaCantidad, setFiltroFechaCantidad] = useState("30");
  const [filtroFechaUnidad, setFiltroFechaUnidad] = useState("dias");
  const [dateFilterApplied, setDateFilterApplied] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch quotes
  const fetchQuotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: GetQuotesFilters = {
        search: debouncedSearch || undefined,
        page: currentPage,
        pageSize: PAGE_SIZE,
      };

      if (dateFilterApplied) {
        filters.dateFrom = computeDateFrom(
          filtroFechaTipo,
          filtroFechaCantidad,
          filtroFechaUnidad,
        );
        filters.dateTo = computeDateTo(
          filtroFechaTipo,
          filtroFechaCantidad,
          filtroFechaUnidad,
        );
      }

      const result = await getQuotes(filters);
      setQuotes(result.data);
      setTotalCount(result.count);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast.error("Error al cargar presupuestos");
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedSearch,
    currentPage,
    dateFilterApplied,
    filtroFechaTipo,
    filtroFechaCantidad,
    filtroFechaUnidad,
  ]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Pagination
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Handlers
  const handleLoadCart = (quoteId: string) => {
    router.push(`/ventas/nueva?quoteId=${quoteId}`);
  };

  const handleDownloadPDF = (quoteId: string) => {
    // TODO: implementar generación de PDF
    toast.info("Próximamente", {
      description: "La descarga de PDF estará disponible pronto.",
    });
  };

  const handleDeleteClick = (quote: Quote) => {
    setQuoteToDelete(quote);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!quoteToDelete) return;
    setIsDeleting(true);
    try {
      await deleteQuote(quoteToDelete.id);
      toast.success("Presupuesto eliminado");
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
      fetchQuotes();
    } catch (error) {
      console.error("Error deleting quote:", error);
      toast.error("Error al eliminar presupuesto");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApplyDateFilter = () => {
    setDateFilterApplied(true);
    setCurrentPage(1);
    setFiltroFechaOpen(false);
  };

  const handleClearDateFilter = () => {
    setDateFilterApplied(false);
    setFiltroFechaTipo("ultimos");
    setFiltroFechaCantidad("30");
    setFiltroFechaUnidad("dias");
    setCurrentPage(1);
    setFiltroFechaOpen(false);
  };

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Presupuestos</h2>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative w-full sm:w-[150px] lg:w-[250px]">
              <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente o número…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Date filter */}
            <Popover open={filtroFechaOpen} onOpenChange={setFiltroFechaOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`h-8 justify-start border-dashed active:scale-100 ${
                    dateFilterApplied ? "border-primary text-primary" : ""
                  }`}
                >
                  <Calendar className="size-4" />
                  {dateFilterApplied ? "Filtro activo" : "Fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[17rem]" align="start">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">
                      Fecha de creación
                    </Label>
                  </div>
                  <div className="space-y-3">
                    <Select
                      value={filtroFechaTipo}
                      onValueChange={setFiltroFechaTipo}
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
                        placeholder="30"
                        value={filtroFechaCantidad}
                        onChange={(e) => setFiltroFechaCantidad(e.target.value)}
                        className="w-full"
                      />
                      <Select
                        value={filtroFechaUnidad}
                        onValueChange={setFiltroFechaUnidad}
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

                    <div className="flex gap-2">
                      {dateFilterApplied && (
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={handleClearDateFilter}
                        >
                          Limpiar
                        </Button>
                      )}
                      <Button
                        className="w-full"
                        onClick={handleApplyDateFilter}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Table */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : quotes.length === 0 ? (
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
                        onClick={() => router.push(`/presupuestos/${quote.id}`)}
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
                          <TooltipProvider>
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
                          </TooltipProvider>
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(quote);
                                }}
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
          {totalCount > 0 && (
            <div className="flex items-center justify-between px-2">
              <div className="hidden flex-1 text-sm text-muted-foreground md:block">
                Mostrando {quotes.length} de {totalCount} resultados
              </div>
              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex w-[120px] items-center justify-center text-sm font-medium">
                    Página {currentPage} de {totalPages || 1}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
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
