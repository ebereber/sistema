"use client";

import { Button } from "@/components/ui/button";
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
import { useDebounce } from "@/hooks/use-debounce";
import type { CustomerPaymentListItem } from "@/lib/services/customer-payments";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileX,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

interface CobranzasPageClientProps {
  payments: CustomerPaymentListItem[];
  count: number;
  totalPages: number;
  currentFilters: {
    search: string;
    dateFrom: string;
    dateTo: string;
    page: number;
  };
}

export function CobranzasPageClient({
  payments,
  count,
  totalPages,
  currentFilters,
}: CobranzasPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search with debounce
  const [searchInput, setSearchInput] = useState(currentFilters.search);
  const debouncedSearch = useDebounce(searchInput, 300);
  const isFirstRender = useRef(true);

  // Date filter popover states
  const [datePeriod, setDatePeriod] = useState<"last" | "before" | "after">(
    "last",
  );
  const [dateValue, setDateValue] = useState("30");
  const [dateUnit, setDateUnit] = useState<"days" | "weeks" | "months">("days");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

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
    if (currentFilters.dateFrom) merged.dateFrom = currentFilters.dateFrom;
    if (currentFilters.dateTo) merged.dateTo = currentFilters.dateTo;
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
      router.push(qs ? `/cobranzas?${qs}` : "/cobranzas");
    });
  };

  // Navigation
  const handleRowClick = (paymentId: string) => {
    router.push(`/cobranzas/${paymentId}`);
  };

  // Apply date filter
  const applyDateFilter = () => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;

    const value = parseInt(dateValue) || 30;

    if (datePeriod === "last") {
      from = new Date(now);
      if (dateUnit === "days") from.setDate(from.getDate() - value);
      if (dateUnit === "weeks") from.setDate(from.getDate() - value * 7);
      if (dateUnit === "months") from.setMonth(from.getMonth() - value);
      to = now;
    } else if (datePeriod === "before") {
      to = new Date(now);
      if (dateUnit === "days") to.setDate(to.getDate() - value);
      if (dateUnit === "weeks") to.setDate(to.getDate() - value * 7);
      if (dateUnit === "months") to.setMonth(to.getMonth() - value);
    } else if (datePeriod === "after") {
      from = new Date(now);
      if (dateUnit === "days") from.setDate(from.getDate() + value);
      if (dateUnit === "weeks") from.setDate(from.getDate() + value * 7);
      if (dateUnit === "months") from.setMonth(from.getMonth() + value);
    }

    updateSearchParams({
      dateFrom: from ? from.toISOString().split("T")[0] : undefined,
      dateTo: to ? to.toISOString().split("T")[0] : undefined,
      page: undefined,
    });

    setDatePopoverOpen(false);
  };

  // Clear date filter
  const clearDateFilter = () => {
    updateSearchParams({
      dateFrom: undefined,
      dateTo: undefined,
      page: undefined,
    });
    setDatePeriod("last");
    setDateValue("30");
    setDateUnit("days");
    setDatePopoverOpen(false);
  };

  // Formatting
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "hoy";
    if (isYesterday) return "ayer";
    return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  };

  const hasDateFilter = currentFilters.dateFrom || currentFilters.dateTo;

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Cobranzas</h2>
        <Link href="/cobranzas/nueva">
          <Button>
            <Plus className="mr-2 size-4" />
            Nueva cobranza
            <kbd className="pointer-events-none ml-2 hidden h-5 min-w-5 select-none items-center justify-center rounded-sm border border-primary-foreground/30 px-1 font-sans text-xs font-medium text-primary-foreground md:inline-flex">
              N
            </kbd>
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative w-full sm:w-[150px] lg:w-[300px]">
              {isPending ? (
                <Loader2 className="absolute left-2 top-2 size-4 animate-spin text-muted-foreground" />
              ) : (
                <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
              )}
              <Input
                placeholder="Buscar por número..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Date filter */}
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={hasDateFilter ? "secondary" : "outline"}
                  className="h-8 justify-start border-dashed active:scale-100"
                >
                  <Calendar className="size-4" />
                  Fecha
                  {hasDateFilter && (
                    <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                      1
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[17rem]" align="start">
                <div className="space-y-4 bg-card">
                  <div>
                    <Label className="text-sm font-semibold">Fecha</Label>
                  </div>
                  <div className="space-y-3">
                    <Select
                      value={datePeriod}
                      onValueChange={(v) =>
                        setDatePeriod(v as "last" | "before" | "after")
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last">en los últimos</SelectItem>
                        <SelectItem value="before">antes de</SelectItem>
                        <SelectItem value="after">después de</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-3.5 w-12 text-muted-foreground"
                      >
                        <path d="m15 10 5 5-5 5" />
                        <path d="M4 4v7a4 4 0 0 0 4 4h12" />
                      </svg>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          placeholder="30"
                          value={dateValue}
                          onChange={(e) => setDateValue(e.target.value)}
                          className="w-full"
                        />
                        <Select
                          value={dateUnit}
                          onValueChange={(v) =>
                            setDateUnit(v as "days" | "weeks" | "months")
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="days">días</SelectItem>
                            <SelectItem value="weeks">semanas</SelectItem>
                            <SelectItem value="months">meses</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {hasDateFilter && (
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={clearDateFilter}
                        >
                          Limpiar
                        </Button>
                      )}
                      <Button className="flex-1" onClick={applyDateFilter}>
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Export button */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="h-8" disabled>
                    <Download className="size-4" />
                    <span className="hidden sm:inline">Exportar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exportar cobranzas</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
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
                  <TableHead className="text-left">Número</TableHead>
                  <TableHead className="text-left">Fecha</TableHead>
                  <TableHead className="text-left">Cliente</TableHead>
                  <TableHead className="text-left">Método de pago</TableHead>
                  <TableHead className="text-left">Monto</TableHead>
                  <TableHead className="text-left">Venta</TableHead>
                </TableRow>
              </TableHeader>
              {payments.length === 0 ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileX className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No se encontraron cobranzas
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : (
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        payment.status === "cancelled" && "opacity-60",
                      )}
                      onClick={() => handleRowClick(payment.id)}
                    >
                      <TableCell className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {payment.payment_number}
                          </span>
                          {payment.status === "cancelled" && (
                            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
                              Anulado
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {formatDate(payment.payment_date)}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {new Date(
                                  payment.payment_date,
                                ).toLocaleDateString("es-AR")}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="font-medium">
                          {payment.customer?.name || "Sin cliente"}
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        <div>{payment.methods_summary || "-"}</div>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="font-medium">
                          {formatCurrency(payment.total_amount)}
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="font-medium">
                          {payment.sales_summary || "-"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2">
            <div className="hidden flex-1 text-sm text-muted-foreground md:block">
              Mostrando {payments.length} de {count} resultados
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex w-[150px] items-center justify-center text-sm font-medium">
                Página {currentFilters.page} de {totalPages || 1}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="hidden h-8 w-8 lg:flex"
                disabled={currentFilters.page <= 1 || isPending}
                onClick={() => updateSearchParams({ page: "1" })}
              >
                <span className="sr-only">Ir a la primera página</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentFilters.page <= 1 || isPending}
                onClick={() =>
                  updateSearchParams({
                    page: String(currentFilters.page - 1),
                  })
                }
              >
                <span className="sr-only">Ir a la página anterior</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentFilters.page >= totalPages || isPending}
                onClick={() =>
                  updateSearchParams({
                    page: String(currentFilters.page + 1),
                  })
                }
              >
                <span className="sr-only">Ir a la página siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden h-8 w-8 lg:flex"
                disabled={currentFilters.page >= totalPages || isPending}
                onClick={() =>
                  updateSearchParams({ page: String(totalPages) })
                }
              >
                <span className="sr-only">Ir a la última página</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
