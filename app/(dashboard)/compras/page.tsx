"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CirclePlus,
  Copy,
  CornerDownRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
  DropdownMenuSeparator,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { DeletePurchaseDialog } from "@/components/compras/delete-purchase-dialog";
import { getPurchases, type Purchase } from "@/lib/services/purchases";
import { getSuppliers, type Supplier } from "@/lib/services/suppliers";

type TimeUnit = "days" | "weeks" | "months";

export default function ComprasPage() {
  const router = useRouter();

  // Data
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(
    null,
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [supplierFilter, setSupplierFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Date filter
  const [lastAmount, setLastAmount] = useState("30");
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("days");
  const [dateFilterActive, setDateFilterActive] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calculate date filter
      let dateFrom: string | undefined;
      if (dateFilterActive) {
        const now = new Date();
        const amount = parseInt(lastAmount) || 30;
        if (timeUnit === "days") {
          now.setDate(now.getDate() - amount);
        } else if (timeUnit === "weeks") {
          now.setDate(now.getDate() - amount * 7);
        } else if (timeUnit === "months") {
          now.setMonth(now.getMonth() - amount);
        }
        dateFrom = format(now, "yyyy-MM-dd");
      }

      const [purchasesResult, suppliersData] = await Promise.all([
        getPurchases({
          page,
          pageSize,
          status:
            statusFilter.length === 1
              ? (statusFilter[0] as "draft" | "completed" | "cancelled")
              : undefined,
          supplierId:
            supplierFilter.length === 1 ? supplierFilter[0] : undefined,
          dateFrom,
          search: searchQuery || undefined,
        }),
        getSuppliers({ active: true }),
      ]);

      setPurchases(purchasesResult.data);
      setTotalCount(purchasesResult.count);
      setTotalPages(purchasesResult.totalPages);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error("Error loading purchases:", error);
      toast.error("Error al cargar compras");
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    pageSize,
    statusFilter,
    supplierFilter,
    dateFilterActive,
    lastAmount,
    timeUnit,
    searchQuery,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Formatting
  const formatCurrency = (value: number | null) => {
    if (value === null) return "$0,00";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "d/M/yyyy", { locale: es });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="secondary">Completada</Badge>;
      case "draft":
        return <Badge variant="outline">Borrador</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Handlers
  const handleRowClick = (purchase: Purchase) => {
    router.push(`/compras/${purchase.id}`);
  };

  const handleDeleteClick = (purchase: Purchase) => {
    setPurchaseToDelete(purchase);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    setPurchaseToDelete(null);
    loadData();
  };

  const toggleStatus = (value: string) => {
    setStatusFilter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
    setPage(1);
  };

  const toggleSupplier = (value: string) => {
    setSupplierFilter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
    setPage(1);
  };

  const applyDateFilter = () => {
    setDateFilterActive(true);
    setPage(1);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter([]);
    setSupplierFilter([]);
    setDateFilterActive(false);
    setLastAmount("30");
    setTimeUnit("days");
    setPage(1);
  };

  const hasActiveFilters =
    statusFilter.length > 0 ||
    supplierFilter.length > 0 ||
    dateFilterActive ||
    searchQuery.length > 0;

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Compras</h2>
        <Button asChild>
          <Link href="/compras/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nueva compra
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nº factura o proveedor…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="h-8 w-full pl-8 sm:w-[250px] lg:w-[350px]"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Estado filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 justify-start border-dashed",
                      statusFilter.length > 0 && "border-solid bg-accent",
                    )}
                  >
                    <CirclePlus className="mr-2 h-4 w-4" />
                    Estado
                    {statusFilter.length > 0 && (
                      <>
                        <div className="ml-2 flex h-4 w-4 items-center justify-center rounded-sm bg-primary text-[10px] font-medium text-primary-foreground">
                          {statusFilter.length}
                        </div>
                        <X
                          className="ml-2 h-3 w-3 hover:opacity-70"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusFilter([]);
                          }}
                        />
                      </>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Estado" />
                    <CommandList>
                      <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => toggleStatus("completed")}
                          className="cursor-pointer"
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              statusFilter.includes("completed")
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span>Completada</span>
                        </CommandItem>
                        <CommandItem
                          onSelect={() => toggleStatus("draft")}
                          className="cursor-pointer"
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              statusFilter.includes("draft")
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span>Borrador</span>
                        </CommandItem>
                        <CommandItem
                          onSelect={() => toggleStatus("cancelled")}
                          className="cursor-pointer"
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              statusFilter.includes("cancelled")
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span>Cancelada</span>
                        </CommandItem>
                      </CommandGroup>
                      {statusFilter.length > 0 && (
                        <>
                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => setStatusFilter([])}
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

              {/* Proveedor filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 justify-start border-dashed",
                      supplierFilter.length > 0 && "border-solid bg-accent",
                    )}
                  >
                    <CirclePlus className="mr-2 h-4 w-4" />
                    Proveedor
                    {supplierFilter.length > 0 && (
                      <>
                        <div className="ml-2 flex h-4 w-4 items-center justify-center rounded-sm bg-primary text-[10px] font-medium text-primary-foreground">
                          {supplierFilter.length}
                        </div>
                        <X
                          className="ml-2 h-3 w-3 hover:opacity-70"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSupplierFilter([]);
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
                                supplierFilter.includes(supplier.id)
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
                      {supplierFilter.length > 0 && (
                        <>
                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => setSupplierFilter([])}
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

              {/* Date filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 justify-start border-dashed",
                      dateFilterActive && "border-solid bg-accent",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Fecha
                    {dateFilterActive && (
                      <X
                        className="ml-2 h-3 w-3 hover:opacity-70"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDateFilterActive(false);
                          setPage(1);
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[17rem]" align="start">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold">
                        Fecha de factura
                      </label>
                    </div>
                    <div className="space-y-3">
                      <Select defaultValue="last">
                        <SelectTrigger className="h-8 w-full">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last">en los últimos</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <CornerDownRight className="h-3.5 w-12 text-muted-foreground" />
                        <div className="flex flex-1 items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            placeholder="30"
                            value={lastAmount}
                            onChange={(e) => setLastAmount(e.target.value)}
                            className="h-8 w-full"
                          />
                          <Select
                            value={timeUnit}
                            onValueChange={(value: TimeUnit) =>
                              setTimeUnit(value)
                            }
                          >
                            <SelectTrigger className="h-8 w-full">
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
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={applyDateFilter}
                        className="w-full"
                        size="sm"
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Clear all filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-8"
                >
                  Limpiar filtros
                  <X className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Compra</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Nº Factura Prov.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Recibido</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : purchases.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground"
                    >
                      No se encontraron compras
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((purchase) => (
                    <TableRow
                      key={purchase.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(purchase)}
                    >
                      <TableCell>
                        <span className="font-mono text-sm font-medium">
                          {purchase.purchase_number || "-"}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(purchase.invoice_date)}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {purchase.supplier?.name}
                        </div>
                        {purchase.supplier?.tax_id && (
                          <div className="text-sm text-muted-foreground">
                            {purchase.supplier.tax_id}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-muted-foreground">
                          {purchase.voucher_number}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                      <TableCell>
                        {purchase.products_received ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            Sí
                          </Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(purchase.total))}
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
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Abrir menú</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/compras/${purchase.id}/editar`);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/compras/nueva?duplicateFrom=${purchase.id}`,
                                );
                              }}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(purchase);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
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
              Mostrando {purchases.length} de {totalCount} resultados
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex w-[150px] items-center justify-center text-sm font-medium">
                Página {page} de {totalPages || 1}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="hidden h-8 w-8 lg:flex"
                disabled={page === 1}
                onClick={() => setPage(1)}
              >
                <span className="sr-only">Ir a la primera página</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <span className="sr-only">Ir a la página anterior</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage(page + 1)}
              >
                <span className="sr-only">Ir a la página siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden h-8 w-8 lg:flex"
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage(totalPages)}
              >
                <span className="sr-only">Ir a la última página</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Delete Dialog */}
      {purchaseToDelete && (
        <DeletePurchaseDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          purchaseId={purchaseToDelete.id}
          voucherNumber={purchaseToDelete.voucher_number}
          hasReceivedProducts={purchaseToDelete.products_received}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
