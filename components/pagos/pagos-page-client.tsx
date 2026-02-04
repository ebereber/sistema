"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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
import type { SupplierPayment } from "@/lib/services/supplier-payments";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Eye,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

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
  return format(date, "dd/MM/yyyy", { locale: es });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value);
}

function getPaymentMethodDisplay(payment: SupplierPayment): string {
  if (!payment.payment_methods || payment.payment_methods.length === 0)
    return "-";
  if (payment.payment_methods.length === 1)
    return payment.payment_methods[0].method_name;
  return `${payment.payment_methods.length} métodos de pago`;
}

function getVoucherDisplay(payment: SupplierPayment): string {
  if (!payment.allocations || payment.allocations.length === 0) {
    return (payment.on_account_amount ?? 0) > 0 ? "Pago a cuenta" : "-";
  }
  if (payment.allocations.length === 1)
    return payment.allocations[0].purchase?.voucher_number || "-";
  return `${payment.allocations.length} comprobantes`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PagosPageClientProps {
  payments: SupplierPayment[];
  count: number;
  totalPages: number;
  suppliers: { id: string; name: string }[];
  currentFilters: {
    search: string;
    supplier: string;
    dateFrom: string;
    dateTo: string;
    page: number;
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PagosPageClient({
  payments,
  count,
  totalPages,
  suppliers,
  currentFilters,
}: PagosPageClientProps) {
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
    if (currentFilters.supplier) merged.supplier = currentFilters.supplier;
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
      router.push(qs ? `/pagos?${qs}` : "/pagos");
    });
  };

  const toggleSupplier = (id: string) => {
    updateSearchParams({
      supplier: currentFilters.supplier === id ? undefined : id,
      page: undefined,
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
    currentFilters.search !== "" ||
    currentFilters.supplier !== "" ||
    dateFilterApplied;

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Pagos</h2>
        <Button asChild>
          <Link href="/pagos/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Pago
          </Link>
        </Button>
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
              placeholder="Buscar por número..."
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
                  Filtrar por fecha
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
                      <SelectItem value="ultimos">en los ultimos</SelectItem>
                      <SelectItem value="antes">antes de</SelectItem>
                      <SelectItem value="despues">despues de</SelectItem>
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
                        <SelectItem value="dias">dias</SelectItem>
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

          {/* Supplier filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 justify-start border-dashed",
                  currentFilters.supplier && "border-solid bg-accent",
                )}
              >
                <CirclePlus className="mr-2 h-4 w-4" />
                Proveedor
                {currentFilters.supplier && (
                  <>
                    <div className="ml-2 flex h-4 w-4 items-center justify-center rounded-sm bg-primary text-[10px] font-medium text-primary-foreground">
                      1
                    </div>
                    <X
                      className="ml-2 h-3 w-3 hover:opacity-70"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSearchParams({
                          supplier: undefined,
                          page: undefined,
                        });
                      }}
                    />
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar proveedor" />
                <CommandList>
                  <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                  <CommandGroup>
                    {suppliers.map((supplier) => (
                      <CommandItem
                        key={supplier.id}
                        onSelect={() => toggleSupplier(supplier.id)}
                        className="cursor-pointer"
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            currentFilters.supplier === supplier.id
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible",
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span>{supplier.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {currentFilters.supplier && (
                    <>
                      <CommandSeparator />
                      <CommandGroup>
                        <CommandItem
                          onSelect={() =>
                            updateSearchParams({
                              supplier: undefined,
                              page: undefined,
                            })
                          }
                          className="cursor-pointer justify-center text-center"
                        >
                          Limpiar filtro
                        </CommandItem>
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
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
                  router.push("/pagos");
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
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-4 rounded-full bg-muted p-4">
                          <Wallet className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold">
                          Sin pagos registrados
                        </h3>
                        <p className="mb-4 text-sm text-muted-foreground">
                          Registra tu primer pago a proveedor.
                        </p>
                        <Button asChild>
                          <Link href="/pagos/nuevo">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Pago
                          </Link>
                        </Button>
                      </div>
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
          {count > 0 && (
            <div className="flex items-center justify-between px-2">
              <div className="hidden flex-1 text-sm text-muted-foreground md:block">
                Mostrando {payments.length} de {count} resultados
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
                  Pagina {currentFilters.page} de {totalPages || 1}
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
    </div>
  );
}
