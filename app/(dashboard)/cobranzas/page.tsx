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
import { Skeleton } from "@/components/ui/skeleton";
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
import { useCurrentUser } from "@/lib/auth/user-provider";
import {
  getCustomerPayments,
  type CustomerPaymentListItem,
  type GetCustomerPaymentsParams,
} from "@/lib/services/customer-payments";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileX,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function CobranzasPage() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useCurrentUser();

  // Data states
  const [payments, setPayments] = useState<CustomerPaymentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Filter states
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  // Date filter popover states
  const [datePeriod, setDatePeriod] = useState<"last" | "before" | "after">(
    "last",
  );
  const [dateValue, setDateValue] = useState("30");
  const [dateUnit, setDateUnit] = useState<"days" | "weeks" | "months">("days");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // Load payments

  const loadPayments = useCallback(async () => {
    if (isUserLoading) return;
    setIsLoading(true);
    try {
      const params: GetCustomerPaymentsParams = {
        page: currentPage,
        pageSize,
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const result = await getCustomerPayments(
        params,
        user
          ? {
              visibility: user.dataVisibilityScope,
              userId: user.id,
              locationIds: user.locationIds,
            }
          : undefined,
      );

      setPayments(result.data);
      setTotalCount(result.count);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("Error loading payments:", error);
      toast.error("Error al cargar cobranzas");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, dateFrom, dateTo, user, isUserLoading]);

  useEffect(() => {
    if (isUserLoading) return;
    loadPayments();
  }, [loadPayments, isUserLoading]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, dateFrom, dateTo]);

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

    if (from) setDateFrom(from.toISOString().split("T")[0]);
    else setDateFrom(null);
    if (to) setDateTo(to.toISOString().split("T")[0]);
    else setDateTo(null);

    setDatePopoverOpen(false);
  };

  // Clear date filter
  const clearDateFilter = () => {
    setDateFrom(null);
    setDateTo(null);
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

  const hasDateFilter = dateFrom || dateTo;

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
              <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
          <div className="overflow-hidden rounded-lg border">
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
              {isLoading ? (
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              ) : payments.length === 0 ? (
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
              Mostrando {payments.length} de {totalCount} resultados
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex w-[150px] items-center justify-center text-sm font-medium">
                Página {currentPage} de {totalPages || 1}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="hidden h-8 w-8 lg:flex"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
              >
                <span className="sr-only">Ir a la primera página</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <span className="sr-only">Ir a la página anterior</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <span className="sr-only">Ir a la página siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden h-8 w-8 lg:flex"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
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
