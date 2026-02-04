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
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

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
import { useDebounce } from "@/hooks/use-debounce";
import type { Purchase } from "@/lib/services/purchases";
import type { Supplier } from "@/lib/services/suppliers";

type TimeUnit = "days" | "weeks" | "months";

interface ComprasPageClientProps {
  purchases: Purchase[];
  count: number;
  totalPages: number;
  suppliers: Supplier[];
  currentFilters: {
    search: string;
    status: string;
    supplier: string;
    dateFrom: string;
    page: number;
  };
}

export function ComprasPageClient({
  purchases,
  count,
  totalPages,
  suppliers,
  currentFilters,
}: ComprasPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(
    null,
  );

  // Search with debounce
  const [searchInput, setSearchInput] = useState(currentFilters.search);
  const debouncedSearch = useDebounce(searchInput, 300);
  const isFirstRender = useRef(true);

  // Date filter local state (for the popover inputs)
  const [lastAmount, setLastAmount] = useState("30");
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("days");

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

  const pageSize = 20;

  // Helper: build URL from filter updates and navigate
  const updateSearchParams = (updates: Record<string, string | undefined>) => {
    const merged: Record<string, string> = {};

    // Start from current filters
    if (currentFilters.search) merged.search = currentFilters.search;
    if (currentFilters.status) merged.status = currentFilters.status;
    if (currentFilters.supplier) merged.supplier = currentFilters.supplier;
    if (currentFilters.dateFrom) merged.dateFrom = currentFilters.dateFrom;
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
      router.push(qs ? `/compras?${qs}` : "/compras");
    });
  };

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
    router.refresh();
  };

  const toggleStatus = (value: string) => {
    const newStatus = value === currentFilters.status ? undefined : value;
    updateSearchParams({ status: newStatus, page: undefined });
  };

  const toggleSupplier = (value: string) => {
    const newSupplier = value === currentFilters.supplier ? undefined : value;
    updateSearchParams({ supplier: newSupplier, page: undefined });
  };

  const applyDateFilter = () => {
    const now = new Date();
    const amount = parseInt(lastAmount) || 30;
    if (timeUnit === "days") {
      now.setDate(now.getDate() - amount);
    } else if (timeUnit === "weeks") {
      now.setDate(now.getDate() - amount * 7);
    } else if (timeUnit === "months") {
      now.setMonth(now.getMonth() - amount);
    }
    const dateFrom = format(now, "yyyy-MM-dd");
    updateSearchParams({ dateFrom, page: undefined });
  };

  const clearAllFilters = () => {
    setSearchInput("");
    setLastAmount("30");
    setTimeUnit("days");
    startTransition(() => {
      router.push("/compras");
    });
  };

  const hasActiveFilters =
    currentFilters.status !== "" ||
    currentFilters.supplier !== "" ||
    currentFilters.dateFrom !== "" ||
    currentFilters.search !== "";

  const selectedSupplierName = suppliers.find(
    (s) => s.id === currentFilters.supplier,
  )?.name;

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
              {isPending ? (
                <Loader2 className="absolute left-2 top-2 h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              )}

              <Input
                placeholder="Buscar por nº factura o proveedor…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
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
                      currentFilters.status && "border-solid bg-accent",
                    )}
                  >
                    <CirclePlus className="mr-2 h-4 w-4" />
                    Estado
                    {currentFilters.status && (
                      <>
                        <div className="ml-2 flex h-4 w-4 items-center justify-center rounded-sm bg-primary text-[10px] font-medium text-primary-foreground">
                          1
                        </div>
                        <X
                          className="ml-2 h-3 w-3 hover:opacity-70"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSearchParams({
                              status: undefined,
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
                              currentFilters.status === "completed"
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
                              currentFilters.status === "draft"
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
                              currentFilters.status === "cancelled"
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span>Cancelada</span>
                        </CommandItem>
                      </CommandGroup>
                      {currentFilters.status && (
                        <>
                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem
                              onSelect={() =>
                                updateSearchParams({
                                  status: undefined,
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

              {/* Proveedor filter */}
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

              {/* Date filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 justify-start border-dashed",
                      currentFilters.dateFrom && "border-solid bg-accent",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Fecha
                    {currentFilters.dateFrom && (
                      <X
                        className="ml-2 h-3 w-3 hover:opacity-70"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSearchParams({
                            dateFrom: undefined,
                            page: undefined,
                          });
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
          <div
            className={cn(
              "overflow-hidden rounded-lg border",
              isPending && "opacity-60",
            )}
          >
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
                {purchases.length === 0 ? (
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
                      <TableCell className="text-right">
                        <div className="font-medium">
                          {formatCurrency(Number(purchase.total))}
                        </div>
                        {purchase.payment_status === "paid" ? (
                          <Badge
                            variant="secondary"
                            className="bg-green-50 text-green-700 dark:bg-green-800 dark:text-green-100"
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Pagado
                          </Badge>
                        ) : Number(purchase.total) -
                            Number(purchase.amount_paid || 0) >
                          0 ? (
                          <div className="text-sm text-destructive">
                            Saldo:{" "}
                            {formatCurrency(
                              Number(purchase.total) -
                                Number(purchase.amount_paid || 0),
                            )}
                          </div>
                        ) : null}
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
              Mostrando {purchases.length} de {count} resultados
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
                disabled={currentFilters.page === 1}
                onClick={() => updateSearchParams({ page: "1" })}
              >
                <span className="sr-only">Ir a la primera página</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentFilters.page === 1}
                onClick={() =>
                  updateSearchParams({
                    page:
                      currentFilters.page > 2
                        ? String(currentFilters.page - 1)
                        : undefined,
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
                disabled={
                  currentFilters.page === totalPages || totalPages === 0
                }
                onClick={() =>
                  updateSearchParams({ page: String(currentFilters.page + 1) })
                }
              >
                <span className="sr-only">Ir a la página siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden h-8 w-8 lg:flex"
                disabled={
                  currentFilters.page === totalPages || totalPages === 0
                }
                onClick={() => updateSearchParams({ page: String(totalPages) })}
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
