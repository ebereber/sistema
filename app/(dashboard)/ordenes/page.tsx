"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
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
import {
  getPurchaseOrders,
  type GetPurchaseOrdersFilters,
} from "@/lib/services/purchase-orders";
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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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

function computeDateFrom(
  tipo: string,
  cantidad: string,
  unidad: string,
): string | undefined {
  const num = parseInt(cantidad);
  if (isNaN(num) || num <= 0) return undefined;
  const now = new Date();
  if (tipo === "antes") return undefined;
  switch (unidad) {
    case "dias":
      return new Date(now.getTime() - num * 86400000).toISOString();
    case "semanas":
      return new Date(now.getTime() - num * 7 * 86400000).toISOString();
    case "meses": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - num);
      return d.toISOString();
    }
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
      return new Date(now.getTime() - num * 86400000).toISOString();
    case "semanas":
      return new Date(now.getTime() - num * 7 * 86400000).toISOString();
    case "meses": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - num);
      return d.toISOString();
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export default function OrdenesPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<
    Awaited<ReturnType<typeof getPurchaseOrders>>["data"]
  >([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Status filter
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);

  // Date filter
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [dateFilterType, setDateFilterType] = useState("ultimos");
  const [dateFilterQty, setDateFilterQty] = useState("30");
  const [dateFilterUnit, setDateFilterUnit] = useState("dias");
  const [dateFilterApplied, setDateFilterApplied] = useState(false);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: GetPurchaseOrdersFilters = {
        search: debouncedSearch || undefined,
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        page: currentPage,
        pageSize: PAGE_SIZE,
      };
      if (dateFilterApplied) {
        filters.dateFrom = computeDateFrom(
          dateFilterType,
          dateFilterQty,
          dateFilterUnit,
        );
        filters.dateTo = computeDateTo(
          dateFilterType,
          dateFilterQty,
          dateFilterUnit,
        );
      }
      const result = await getPurchaseOrders(filters);
      setOrders(result.data);
      setTotalCount(result.count);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Error al cargar órdenes");
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedSearch,
    selectedStatuses,
    currentPage,
    dateFilterApplied,
    dateFilterType,
    dateFilterQty,
    dateFilterUnit,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
    setCurrentPage(1);
  };

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
        <h2 className="text-2xl font-bold tracking-tight">Órdenes de compra</h2>
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
            <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar órdenes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                  <div className="flex gap-2">
                    {dateFilterApplied && (
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => {
                          setDateFilterApplied(false);
                          setCurrentPage(1);
                          setDateFilterOpen(false);
                        }}
                      >
                        Limpiar
                      </Button>
                    )}
                    <Button
                      className="w-full"
                      onClick={() => {
                        setDateFilterApplied(true);
                        setCurrentPage(1);
                        setDateFilterOpen(false);
                      }}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </div>
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
                {selectedStatuses.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedStatuses.length}
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
                      const isSelected = selectedStatuses.includes(
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
            </PopoverContent>
          </Popover>
        </div>

        {/* Table */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Orden</TableHead>
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-4 rounded-full bg-muted p-4">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold">
                          Sin órdenes de compra
                        </h3>
                        <p className="mb-4 text-sm text-muted-foreground">
                          Creá tu primera orden de compra para gestionar pedidos
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
                          {order.supplier?.name || "—"}
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
                            : "—"}
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
          {totalCount > 0 && (
            <div className="flex items-center justify-between px-2">
              <div className="hidden flex-1 text-sm text-muted-foreground md:block">
                Mostrando {orders.length} de {totalCount} resultados
              </div>
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
          )}
        </div>
      </div>
    </div>
  );
}
