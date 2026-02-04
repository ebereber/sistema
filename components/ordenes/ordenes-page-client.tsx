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
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleEllipsis,
  CircleOff,
  CirclePlus,
  Loader2,
  Package,
  Plus,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof CircleDashed; className: string }
> = {
  draft: {
    label: "Borrador",
    icon: CircleDashed,
    className: "text-muted-foreground",
  },
  confirmed: {
    label: "Confirmada",
    icon: Circle,
    className: "text-muted-foreground fill-muted",
  },
  partial: {
    label: "Parcial",
    icon: CircleEllipsis,
    className: "text-muted-foreground",
  },
  received: {
    label: "Recibida",
    icon: CircleCheck,
    className: "text-green-500",
  },
  invoiced: {
    label: "Facturada",
    icon: Circle,
    className: "text-muted-foreground fill-muted",
  },
  cancelled: {
    label: "Cancelada",
    icon: CircleOff,
    className: "text-muted-foreground",
  },
};

const FILTER_STATUSES = [
  { value: "draft", label: "Borrador", icon: CircleDashed },
  { value: "confirmed", label: "Confirmada", icon: Circle },
  { value: "partial", label: "Parcial", icon: CircleEllipsis },
  { value: "received", label: "Recibida", icon: CircleCheck },
  { value: "invoiced", label: "Facturada", icon: Circle },
  { value: "cancelled", label: "Cancelada", icon: CircleOff },
];

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;
  return (
    <Badge variant="outline">
      <Icon className={config.className} />
      {config.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Date helpers
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrdenesPageClientProps {
  orders: {
    id: string;
    order_number: string;
    order_date: string;
    expected_delivery_date: string | null;
    status: string;
    total: number;
    supplier: { id: string; name: string } | null;
    location: { id: string; name: string } | null;
  }[];
  count: number;
  totalPages: number;
  suppliers: { id: string; name: string }[];
  currentFilters: {
    search: string;
    statuses: string[];
    dateFrom: string;
    dateTo: string;
    page: number;
    supplier: string;
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrdenesPageClient({
  orders,
  count,
  totalPages,
  currentFilters,
  suppliers,
}: OrdenesPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search with debounce
  const [searchInput, setSearchInput] = useState(currentFilters.search);
  const debouncedSearch = useDebounce(searchInput, 300);
  const isFirstRender = useRef(true);

  // Status filter
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);

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
    if (currentFilters.statuses.length > 0)
      merged.status = currentFilters.statuses.join(",");
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
      router.push(qs ? `/ordenes?${qs}` : "/ordenes");
    });
  };

  const toggleStatus = (status: string) => {
    const current = currentFilters.statuses;
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    updateSearchParams({
      status: next.length > 0 ? next.join(",") : undefined,
      page: undefined,
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);

  return (
    <div className="flex flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Ordenes de compra</h2>
        <Button asChild>
          <Link href="/ordenes/nueva">
            <Plus />
            Nueva orden de compra
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative">
            {isPending ? (
              <Loader2 className="absolute left-2 top-2 size-4 animate-spin text-muted-foreground" />
            ) : (
              <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Buscar ordenes..."
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

          {/* Status filter */}
          <Popover open={statusFilterOpen} onOpenChange={setStatusFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 justify-start border-dashed"
              >
                <CirclePlus className="mr-2 h-4 w-4" />
                Estado
                {currentFilters.statuses.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {currentFilters.statuses.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder="Filtrar por estado" />
                <CommandList>
                  <CommandGroup>
                    {FILTER_STATUSES.map((status) => {
                      const isSelected = currentFilters.statuses.includes(
                        status.value,
                      );
                      const Icon = status.icon;
                      return (
                        <CommandItem
                          key={status.value}
                          onSelect={() => toggleStatus(status.value)}
                          className="gap-2"
                        >
                          <div className="flex size-4 items-center justify-center rounded-[4px] border border-input [&_svg]:invisible">
                            <Check
                              className={`size-3.5 text-primary-foreground ${
                                isSelected ? "visible" : ""
                              }`}
                            />
                          </div>
                          <Icon className="ml-2 size-4 text-muted-foreground" />
                          <span className="ml-2 truncate">{status.label}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
              {currentFilters.statuses.length > 0 && (
                <>
                  <div className="border-t" />
                  <button
                    className="flex w-full items-center justify-center py-1.5 text-sm hover:bg-accent"
                    onClick={() => {
                      updateSearchParams({
                        status: undefined,
                        page: undefined,
                      });
                      setStatusFilterOpen(false);
                    }}
                  >
                    Limpiar filtro
                  </button>
                </>
              )}
            </PopoverContent>
          </Popover>

          {/* Global clear filters */}
          {(currentFilters.search ||
            currentFilters.statuses.length > 0 ||
            dateFilterApplied) && (
            <Button
              variant="ghost"
              className="h-8"
              onClick={() => {
                setSearchInput("");
                startTransition(() => {
                  router.push("/ordenes");
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
            className={`overflow-hidden rounded-lg border ${isPending ? "opacity-60" : ""}`}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N orden</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Entrega Est.
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-4 rounded-full bg-muted p-4">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold">
                          Sin ordenes de compra
                        </h3>
                        <p className="mb-4 text-sm text-muted-foreground">
                          Crea tu primera orden de compra para gestionar pedidos
                          a proveedores.
                        </p>
                        <Button asChild>
                          <Link href="/ordenes/nueva">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva orden
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/ordenes/${order.id}`)}
                    >
                      <TableCell>
                        <span className="font-mono text-sm text-blue-500">
                          {order.order_number}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {order.supplier?.name || "\u2014"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-sm text-muted-foreground">
                              {formatRelativeDate(order.order_date)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {format(
                              new Date(order.order_date),
                              "d 'de' MMMM 'de' yyyy",
                              { locale: es },
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm">
                          {order.expected_delivery_date
                            ? format(
                                new Date(order.expected_delivery_date),
                                "d MMM",
                                { locale: es },
                              )
                            : "\u2014"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right">
                        <span className="font-medium">
                          {formatCurrency(Number(order.total))}
                        </span>
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
                Mostrando {orders.length} de {count} resultados
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
