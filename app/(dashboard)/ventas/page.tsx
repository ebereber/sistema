"use client";

import {
  ArrowLeftRight,
  Ban,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  DollarSign,
  Download,
  FileText,
  FileX,
  Funnel,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  Settings2,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CancelNCDialog } from "@/components/ventas/cancel-nc-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import {
  getSales,
  type GetSalesParams,
  type SaleListItem,
} from "@/lib/services/sales";
import { cn } from "@/lib/utils";

export default function VentasPage() {
  const router = useRouter();

  // Data states
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");

  // Date filter popover states
  const [datePeriod, setDatePeriod] = useState<
    "last" | "next" | "before" | "after"
  >("last");
  const [dateValue, setDateValue] = useState("30");
  const [dateUnit, setDateUnit] = useState<
    "days" | "weeks" | "months" | "years"
  >("days");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Amount filter popover states
  const [amountOperator, setAmountOperator] = useState<
    "greaterThan" | "lessThan" | "equals"
  >("greaterThan");
  const [amountValue, setAmountValue] = useState("");
  const [amountPopoverOpen, setAmountPopoverOpen] = useState(false);

  // Cancel NC dialog states
  const [cancelNCDialogOpen, setCancelNCDialogOpen] = useState(false);
  const [selectedNCToCancel, setSelectedNCToCancel] =
    useState<SaleListItem | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Load sales
  const loadSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: GetSalesParams = {
        page: currentPage,
        pageSize,
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter)
        params.status = statusFilter as "COMPLETED" | "PENDING" | "CANCELLED";
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (minAmount) params.minAmount = parseFloat(minAmount);
      if (maxAmount) params.maxAmount = parseFloat(maxAmount);

      const result = await getSales(params);

      setSales(result.data);
      setTotalCount(result.count);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("Error loading sales:", error);
      toast.error("Error al cargar ventas");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    debouncedSearch,
    statusFilter,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
  ]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, dateFrom, dateTo, minAmount, maxAmount]);

  // Navigation
  const handleRowClick = (saleId: string) => {
    router.push(`/ventas/${saleId}`);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
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
      if (dateUnit === "years") from.setFullYear(from.getFullYear() - value);
      to = now;
    } else if (datePeriod === "next") {
      from = now;
      to = new Date(now);
      if (dateUnit === "days") to.setDate(to.getDate() + value);
      if (dateUnit === "weeks") to.setDate(to.getDate() + value * 7);
      if (dateUnit === "months") to.setMonth(to.getMonth() + value);
      if (dateUnit === "years") to.setFullYear(to.getFullYear() + value);
    } else if (datePeriod === "before") {
      to = new Date(now);
      if (dateUnit === "days") to.setDate(to.getDate() - value);
      if (dateUnit === "weeks") to.setDate(to.getDate() - value * 7);
      if (dateUnit === "months") to.setMonth(to.getMonth() - value);
      if (dateUnit === "years") to.setFullYear(to.getFullYear() - value);
    } else if (datePeriod === "after") {
      from = new Date(now);
      if (dateUnit === "days") from.setDate(from.getDate() + value);
      if (dateUnit === "weeks") from.setDate(from.getDate() + value * 7);
      if (dateUnit === "months") from.setMonth(from.getMonth() + value);
      if (dateUnit === "years") from.setFullYear(from.getFullYear() + value);
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

  // Apply amount filter
  const applyAmountFilter = () => {
    const value = parseFloat(amountValue.replace(",", ".")) || 0;

    if (amountOperator === "greaterThan") {
      setMinAmount(value.toString());
      setMaxAmount("");
    } else if (amountOperator === "lessThan") {
      setMinAmount("");
      setMaxAmount(value.toString());
    } else {
      // equals - use a small range
      setMinAmount((value - 0.01).toString());
      setMaxAmount((value + 0.01).toString());
    }

    setAmountPopoverOpen(false);
  };

  // Clear amount filter
  const clearAmountFilter = () => {
    setMinAmount("");
    setMaxAmount("");
    setAmountValue("");
    setAmountOperator("greaterThan");
    setAmountPopoverOpen(false);
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
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    return isToday ? "hoy" : date.toLocaleDateString("es-AR");
  };

  const hasDateFilter = dateFrom || dateTo;
  const hasAmountFilter = minAmount || maxAmount;

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Ventas</h2>
        <div className="flex w-fit items-stretch">
          <Button asChild>
            <Link href="/ventas/nueva">
              <Plus className="size-4" />
              Nueva Venta
              <kbd className="pointer-events-none hidden h-5 select-none items-center justify-center rounded-sm border border-primary-foreground/30 px-1 font-sans text-xs font-medium text-primary-foreground md:inline-flex">
                V
              </kbd>
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" className="rounded-l-none border-l-0">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/ventas/nueva">Nueva venta</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/ventas/nueva-nc">Nueva nota de crédito</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex w-full min-w-0 flex-1 flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-full sm:w-[150px] lg:w-[250px]">
              <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por factura…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Date Filter */}
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={hasDateFilter ? "secondary" : "outline"}
                  size="default"
                  className="h-8 justify-start border-dashed"
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
                <div className="space-y-4">
                  <Label className="text-sm font-semibold">Fecha</Label>

                  <Tabs defaultValue="invoiceDate">
                    <TabsList className="w-full">
                      <TabsTrigger value="invoiceDate" className="flex-1">
                        Factura
                      </TabsTrigger>
                      <TabsTrigger value="dueDate" className="flex-1" disabled>
                        Vencimiento
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="space-y-3">
                    <Select
                      value={datePeriod}
                      onValueChange={(v) =>
                        setDatePeriod(v as "last" | "next" | "before" | "after")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last">en los últimos</SelectItem>
                        <SelectItem value="next">en los próximos</SelectItem>
                        <SelectItem value="before">antes de</SelectItem>
                        <SelectItem value="after">después de</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                      <svg
                        className="size-3.5 w-12 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="m15 10 5 5-5 5M4 4v7a4 4 0 0 0 4 4h12"
                        />
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
                            setDateUnit(
                              v as "days" | "weeks" | "months" | "years",
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="days">días</SelectItem>
                            <SelectItem value="weeks">semanas</SelectItem>
                            <SelectItem value="months">meses</SelectItem>
                            <SelectItem value="years">años</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
              </PopoverContent>
            </Popover>

            {/* Amount Filter */}
            <Popover
              open={amountPopoverOpen}
              onOpenChange={setAmountPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant={hasAmountFilter ? "secondary" : "outline"}
                  size="default"
                  className="h-8 justify-start border-dashed"
                >
                  <DollarSign className="size-4" />
                  Monto
                  {hasAmountFilter && (
                    <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                      1
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[17rem]" align="start">
                <div className="space-y-4">
                  <Label className="text-sm font-semibold">Monto</Label>

                  <Tabs defaultValue="total">
                    <TabsList className="w-full">
                      <TabsTrigger value="total" className="flex-1">
                        Total
                      </TabsTrigger>
                      <TabsTrigger value="balance" className="flex-1" disabled>
                        Saldo
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="space-y-3">
                    <Select
                      value={amountOperator}
                      onValueChange={(v) =>
                        setAmountOperator(
                          v as "greaterThan" | "lessThan" | "equals",
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="greaterThan">es mayor a</SelectItem>
                        <SelectItem value="lessThan">es menor a</SelectItem>
                        <SelectItem value="equals">es igual a</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                      <svg
                        className="size-3.5 w-12 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="m15 10 5 5-5 5M4 4v7a4 4 0 0 0 4 4h12"
                        />
                      </svg>
                      <div className="relative w-full">
                        <span className="absolute left-2 top-2 text-sm text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="text"
                          placeholder="0,00"
                          value={amountValue}
                          onChange={(e) => setAmountValue(e.target.value)}
                          className="w-full pl-6"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {hasAmountFilter && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={clearAmountFilter}
                      >
                        Limpiar
                      </Button>
                    )}
                    <Button className="flex-1" onClick={applyAmountFilter}>
                      Aplicar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Other Filters */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={statusFilter ? "secondary" : "outline"}
                  size="default"
                  className="h-8 justify-start border-dashed"
                >
                  <Funnel className="size-4" />
                  Otros filtros
                  {statusFilter && (
                    <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                      1
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <DollarSign className="size-4 text-muted-foreground" />
                    Estado del pago
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                      Todos
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("COMPLETED")}
                    >
                      Pagado
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("PENDING")}
                    >
                      Pendiente
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("CANCELLED")}
                    >
                      Cancelado
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Vendedor</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Todos</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    Tipo de comprobante
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>COM - Comprobante</DropdownMenuItem>
                    <DropdownMenuItem>NCX - Nota de crédito</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="hidden md:flex">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="default" className="h-8">
                    <FileX className="size-4" />
                    <span className="hidden sm:inline">Exportar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar a Excel</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">Factura</TableHead>
                  <TableHead className="text-left">Fecha</TableHead>
                  <TableHead className="text-left">Cliente</TableHead>
                  <TableHead className="text-left">Total</TableHead>
                  <TableHead className="text-right">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <Settings2 className="size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>Configurar columnas</PopoverContent>
                    </Popover>
                  </TableHead>
                </TableRow>
              </TableHeader>
              {isLoading ? (
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              ) : sales.length === 0 ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileX className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No se encontraron ventas
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : (
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow
                      key={sale.id}
                      className={cn(
                        "cursor-pointer",
                        sale.voucher_type.startsWith("NOTA_CREDITO") &&
                          "bg-red-50 dark:bg-red-950/20",
                      )}
                      onClick={() => handleRowClick(sale.id)}
                    >
                      <TableCell className="text-left">
                        <div className="flex flex-col">
                          <span
                            className={cn(
                              "font-mono text-sm",
                              sale.voucher_type.startsWith("NOTA_CREDITO")
                                ? "text-red-500"
                                : "text-blue-500",
                            )}
                          >
                            {sale.sale_number}
                          </span>

                          {/* Mostrar si tiene NC asociada */}
                          {sale.credit_notes &&
                            sale.credit_notes.length > 0 && (
                              <span className="text-xs text-red-500">
                                Anulada:{" "}
                                {sale.credit_notes
                                  .map((nc) => nc.sale_number)
                                  .join(", ")}
                              </span>
                            )}

                          {/* Si ES una NC, mostrar link a la original */}
                          {sale.related_sale_id && (
                            <Link
                              href={`/ventas/${sale.related_sale_id}`}
                              className="text-xs text-muted-foreground hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              NC de venta original
                            </Link>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {formatDate(sale.sale_date)}
                            </TooltipTrigger>
                            <TooltipContent>
                              {new Date(sale.sale_date).toLocaleString("es-AR")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="font-medium">
                          {sale.customer?.name || "Consumidor Final"}
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="font-medium">
                          {formatCurrency(sale.total)}
                        </div>
                        {sale.availableBalance !== null &&
                          sale.availableBalance > 0 && (
                            <div className="text-xs text-red-500">
                              Saldo: {formatCurrency(sale.availableBalance)}
                            </div>
                          )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {sale.voucher_type.startsWith("NOTA_CREDITO") ? (
                              <>
                                {/* Menú para Notas de Crédito */}
                                {sale.related_sale_id && (
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href={`/ventas/${sale.related_sale_id}`}
                                    >
                                      <FileText className="size-4" />
                                      Ver venta original
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNCToCancel(sale);
                                    setCancelNCDialogOpen(true);
                                  }}
                                  className=""
                                >
                                  <Ban className="size-4" />
                                  Anular nota de crédito
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                {/* Menú para Ventas normales */}
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/ventas/nueva-nc?saleId=${sale.id}`}
                                  >
                                    <Undo2 className="size-4" />
                                    Crear nota de crédito
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                      `/ventas/nueva?exchangeId=${sale.id}`,
                                    );
                                  }}
                                >
                                  <ArrowLeftRight className="size-4" />
                                  Crear cambio
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                      `/ventas/nueva?duplicateId=${sale.id}`,
                                    );
                                  }}
                                >
                                  <Copy className="size-4" />
                                  Duplicar venta
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Printer className="size-4" />
                              Imprimir
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="size-4" />
                              Descargar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden">
          <div className="overflow-hidden rounded-lg border bg-background">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="border-b p-4">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </div>
              ))
            ) : sales.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8">
                <FileX className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No se encontraron ventas
                </p>
              </div>
            ) : (
              sales.map((sale) => (
                <div
                  key={sale.id}
                  className="w-full cursor-pointer border-b border-border bg-background p-4 text-left hover:bg-muted/50"
                  onClick={() => handleRowClick(sale.id)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-sm text-blue-500">
                          {sale.sale_number}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/ventas/nueva-nc?saleId=${sale.id}`}>
                              <Undo2 className="size-4" />
                              Crear nota de crédito
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/ventas/nueva?exchangeId=${sale.id}`,
                              );
                            }}
                          >
                            <ArrowLeftRight className="size-4" />
                            Crear cambio
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/ventas/nueva?duplicateId=${sale.id}`,
                              );
                            }}
                          >
                            <Copy className="size-4" />
                            Duplicar venta
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Printer className="size-4" />
                            Imprimir
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="size-4" />
                            Descargar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="font-medium text-foreground">
                      {sale.customer?.name || "Consumidor Final"}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex flex-col gap-1 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span>Fecha:</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                {formatDate(sale.sale_date)}
                              </TooltipTrigger>
                              <TooltipContent>
                                {new Date(sale.sale_date).toLocaleString(
                                  "es-AR",
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {formatCurrency(sale.total)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-2">
          <div className="hidden flex-1 text-sm text-muted-foreground md:block">
            Mostrando {sales.length} de {totalCount} resultados
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
              className="size-8"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(1)}
            >
              <span className="sr-only">Primera página</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <span className="sr-only">Página anterior</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              <span className="sr-only">Página siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden size-8 lg:flex"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(totalPages)}
            >
              <span className="sr-only">Última página</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {/* Cancel NC Dialog */}
      <CancelNCDialog
        open={cancelNCDialogOpen}
        onOpenChange={setCancelNCDialogOpen}
        creditNote={selectedNCToCancel}
        onSuccess={() => {
          setCancelNCDialogOpen(false);
          setSelectedNCToCancel(null);
          loadSales(); // Recargar la lista
        }}
      />
    </div>
  );
}
