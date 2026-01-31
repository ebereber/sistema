"use client";

import { format, subDays, subMonths, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  Eye,
  FileDown,
  MoreVertical,
  Plus,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { Separator } from "@/components/ui/separator";
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

import { Spinner } from "@/components/ui/spinner";
import {
  getSupplierPayments,
  type SupplierPayment,
} from "@/lib/services/supplier-payments";

export default function PagosPage() {
  const router = useRouter();

  // Data
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState({
    value: 30,
    unit: "días" as "días" | "semanas" | "meses",
  });
  const [page, setPage] = useState(1);
  const limit = 20;

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calculate date range
      let dateFrom: string | undefined;
      const now = new Date();

      if (dateFilter.unit === "días") {
        dateFrom = format(subDays(now, dateFilter.value), "yyyy-MM-dd");
      } else if (dateFilter.unit === "semanas") {
        dateFrom = format(subWeeks(now, dateFilter.value), "yyyy-MM-dd");
      } else if (dateFilter.unit === "meses") {
        dateFrom = format(subMonths(now, dateFilter.value), "yyyy-MM-dd");
      }

      const { data, count } = await getSupplierPayments({
        search: searchQuery || undefined,
        dateFrom,
        page,
        limit,
      });

      setPayments(data);
      setTotalCount(count);
    } catch (error) {
      console.error("Error loading payments:", error);
      toast.error("Error al cargar los pagos");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, dateFilter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return "hoy";
    if (diffDays === 1) return "ayer";
    return format(date, "dd/MM/yyyy", { locale: es });
  };

  const getPaymentMethodDisplay = (payment: SupplierPayment) => {
    if (!payment.payment_methods || payment.payment_methods.length === 0) {
      return "-";
    }
    if (payment.payment_methods.length === 1) {
      return payment.payment_methods[0].method_name;
    }
    return `${payment.payment_methods.length} métodos de pago`;
  };

  const getVoucherDisplay = (payment: SupplierPayment) => {
    if (!payment.allocations || payment.allocations.length === 0) {
      return (payment.on_account_amount ?? 0) > 0 ? "Pago a cuenta" : "-";
    }
    if (payment.allocations.length === 1) {
      return payment.allocations[0].purchase?.voucher_number || "-";
    }
    return `${payment.allocations.length} comprobantes`;
  };

  const totalPages = Math.ceil(totalCount / limit);

  const clearFilters = () => {
    setSearchQuery("");
    setDateFilter({ value: 30, unit: "días" });
    setPage(1);
  };

  const hasActiveFilters = searchQuery !== "";

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Pagos</h2>
        <Link href="/pagos/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Pago
            <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center justify-center gap-1 rounded-sm border border-primary-foreground/30 bg-transparent px-1 font-sans text-xs font-medium text-primary-foreground md:inline-flex">
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
            <div className="relative">
              {isLoading ? (
                <Spinner className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              ) : (
                <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              )}

              <Input
                placeholder="Buscar por número o proveedor..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="h-8 w-full pl-8 sm:w-[150px] lg:w-[300px]"
              />
            </div>

            {/* Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-8 justify-start border-dashed"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Fecha
                  <Separator orientation="vertical" className="mx-2 h-4" />
                  <span className="font-normal text-muted-foreground">
                    Últimos {dateFilter.value} {dateFilter.unit}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[17rem]" align="start">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold">Fecha</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={dateFilter.value}
                      onChange={(e) =>
                        setDateFilter({
                          ...dateFilter,
                          value: parseInt(e.target.value) || 30,
                        })
                      }
                      className="h-8"
                    />
                    <Select
                      value={dateFilter.unit}
                      onValueChange={(value: "días" | "semanas" | "meses") =>
                        setDateFilter({ ...dateFilter, unit: value })
                      }
                    >
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="días">días</SelectItem>
                        <SelectItem value="semanas">semanas</SelectItem>
                        <SelectItem value="meses">meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={() => loadData()}>
                    Aplicar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="h-8">
                <X className="mr-1 h-4 w-4" />
                <span className="ml-1">Limpiar filtros</span>
              </Button>
            )}
          </div>

          {/* Export Button */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="h-8" disabled>
                    <FileDown className="h-4 w-4" />
                    <span className="ml-2 hidden sm:inline">Exportar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exportar datos</p>
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
                  <TableHead className="text-left">Proveedor</TableHead>
                  <TableHead className="text-left">Método de pago</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-left">Comprobante</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No se encontraron pagos
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/pagos/${payment.id}`)}
                    >
                      <TableCell className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium font-mono">
                            {payment.payment_number}
                          </span>
                          {payment.status === "cancelled" && (
                            <Badge variant="destructive" className="text-xs">
                              Anulado
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                {formatRelativeDate(payment.payment_date)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {format(
                                  new Date(payment.payment_date),
                                  "dd/MM/yyyy",
                                  { locale: es },
                                )}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-left">
                        <span className="font-medium">
                          {payment.supplier?.name || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-left">
                        {getPaymentMethodDisplay(payment)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(payment.total_amount))}
                      </TableCell>
                      <TableCell className="text-left">
                        {getVoucherDisplay(payment)}
                        {Number(payment.on_account_amount) > 0 && (
                          <div className="text-xs text-muted-foreground">
                            + pago a cuenta
                          </div>
                        )}
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
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/pagos/${payment.id}`);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalle
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2">
            <div className="hidden flex-1 text-sm text-muted-foreground md:block">
              Mostrando {payments.length} de {totalCount} resultados
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                >
                  Anterior
                </Button>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                  Página {page} de {totalPages || 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages || isLoading}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
