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
  CornerDownRight,
  Search,
  X,
} from "lucide-react";
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

import {
  getActiveCashRegisters,
  type CashRegister,
} from "@/lib/services/cash-registers";
import { getShifts, type Shift } from "@/lib/services/shifts";

type TimeUnit = "days" | "weeks" | "months";

export default function TurnosPage() {
  const router = useRouter();

  // Data
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [cashRegisterFilter, setCashRegisterFilter] = useState<string[]>([]);
  const [discrepancyFilter, setDiscrepancyFilter] = useState<string[]>([]);
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
        dateFrom = now.toISOString();
      }

      const [shiftsResult, registersResult] = await Promise.all([
        getShifts({
          page,
          pageSize,
          status:
            statusFilter.length === 1
              ? (statusFilter[0] as "open" | "closed")
              : undefined,
          cashRegisterId:
            cashRegisterFilter.length === 1 ? cashRegisterFilter[0] : undefined,
          dateFrom,
        }),
        getActiveCashRegisters(),
      ]);

      setShifts(shiftsResult.data);
      setTotalCount(shiftsResult.count);
      setTotalPages(shiftsResult.totalPages);
      setCashRegisters(registersResult);
    } catch (error) {
      console.error("Error loading shifts:", error);
      toast.error("Error al cargar turnos");
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    pageSize,
    statusFilter,
    cashRegisterFilter,
    dateFilterActive,
    lastAmount,
    timeUnit,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter shifts by search and discrepancy (client-side)
  const filteredShifts = shifts.filter((shift) => {
    const matchesSearch =
      shift.cash_register?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ?? true;

    const matchesDiscrepancy =
      discrepancyFilter.length === 0 ||
      (discrepancyFilter.includes("with") &&
        shift.discrepancy !== null &&
        Number(shift.discrepancy) !== 0) ||
      (discrepancyFilter.includes("without") &&
        (shift.discrepancy === null || Number(shift.discrepancy) === 0));

    return matchesSearch && matchesDiscrepancy;
  });

  // Formatting
  const formatCurrency = (value: number | null) => {
    if (value === null) return "$0,00";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(value);
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) {
      return format(date, "HH:mm", { locale: es });
    } else if (diffDays === 1) {
      return `ayer a las ${format(date, "HH:mm", { locale: es })}`;
    } else if (diffDays < 7) {
      return format(date, "EEEE 'a las' HH:mm", { locale: es });
    } else {
      return format(date, "d/M/yyyy HH:mm", { locale: es });
    }
  };

  // Handlers
  const handleRowClick = (shift: Shift) => {
    router.push(`/turnos/${shift.id}`);
  };

  const toggleStatus = (value: string) => {
    setStatusFilter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
    setPage(1);
  };

  const toggleCashRegister = (value: string) => {
    setCashRegisterFilter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
    setPage(1);
  };

  const toggleDiscrepancy = (value: string) => {
    setDiscrepancyFilter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const applyDateFilter = () => {
    setDateFilterActive(true);
    setPage(1);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter([]);
    setCashRegisterFilter([]);
    setDiscrepancyFilter([]);
    setDateFilterActive(false);
    setLastAmount("30");
    setTimeUnit("days");
    setPage(1);
  };

  const hasActiveFilters =
    statusFilter.length > 0 ||
    cashRegisterFilter.length > 0 ||
    discrepancyFilter.length > 0 ||
    dateFilterActive;

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Turnos</h2>
      </div>

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por caja…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full pl-8 sm:w-[150px] lg:w-[250px]"
                name="search"
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
                          onSelect={() => toggleStatus("open")}
                          className="cursor-pointer"
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              statusFilter.includes("open")
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span>Abierto</span>
                        </CommandItem>
                        <CommandItem
                          onSelect={() => toggleStatus("closed")}
                          className="cursor-pointer"
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              statusFilter.includes("closed")
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span>Cerrado</span>
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

              {/* Caja filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 justify-start border-dashed",
                      cashRegisterFilter.length > 0 && "border-solid bg-accent",
                    )}
                  >
                    <CirclePlus className="mr-2 h-4 w-4" />
                    Caja
                    {cashRegisterFilter.length > 0 && (
                      <>
                        <div className="ml-2 flex h-4 w-4 items-center justify-center rounded-sm bg-primary text-[10px] font-medium text-primary-foreground">
                          {cashRegisterFilter.length}
                        </div>
                        <X
                          className="ml-2 h-3 w-3 hover:opacity-70"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCashRegisterFilter([]);
                          }}
                        />
                      </>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Caja" />
                    <CommandList>
                      <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                      <CommandGroup>
                        {cashRegisters.map((register) => (
                          <CommandItem
                            key={register.id}
                            onSelect={() => toggleCashRegister(register.id)}
                            className="cursor-pointer"
                          >
                            <div
                              className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                cashRegisterFilter.includes(register.id)
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50 [&_svg]:invisible",
                              )}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </div>
                            <span>{register.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {cashRegisterFilter.length > 0 && (
                        <>
                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => setCashRegisterFilter([])}
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

              {/* Discrepancia filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 justify-start border-dashed",
                      discrepancyFilter.length > 0 && "border-solid bg-accent",
                    )}
                  >
                    <CirclePlus className="mr-2 h-4 w-4" />
                    Discrepancia
                    {discrepancyFilter.length > 0 && (
                      <>
                        <div className="ml-2 flex h-4 w-4 items-center justify-center rounded-sm bg-primary text-[10px] font-medium text-primary-foreground">
                          {discrepancyFilter.length}
                        </div>
                        <X
                          className="ml-2 h-3 w-3 hover:opacity-70"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDiscrepancyFilter([]);
                          }}
                        />
                      </>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Discrepancia" />
                    <CommandList>
                      <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => toggleDiscrepancy("with")}
                          className="cursor-pointer"
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              discrepancyFilter.includes("with")
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span>Con discrepancia</span>
                        </CommandItem>
                        <CommandItem
                          onSelect={() => toggleDiscrepancy("without")}
                          className="cursor-pointer"
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              discrepancyFilter.includes("without")
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span>Sin discrepancia</span>
                        </CommandItem>
                      </CommandGroup>
                      {discrepancyFilter.length > 0 && (
                        <>
                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => setDiscrepancyFilter([])}
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
                        Fecha de apertura
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
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Caja</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Discrepancia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-20" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredShifts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No se encontraron turnos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShifts.map((shift) => (
                    <TableRow
                      key={shift.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(shift)}
                    >
                      <TableCell>{formatDateTime(shift.opened_at)}</TableCell>
                      <TableCell>
                        {shift.closed_at ? (
                          formatDateTime(shift.closed_at)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {shift.cash_register?.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            shift.status === "open" ? "default" : "secondary"
                          }
                        >
                          {shift.status === "open" ? "Abierto" : "Cerrado"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right",
                          shift.discrepancy !== null &&
                            Number(shift.discrepancy) < 0 &&
                            "text-red-600",
                        )}
                      >
                        {formatCurrency(
                          shift.discrepancy !== null
                            ? Number(shift.discrepancy)
                            : 0,
                        )}
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
              Mostrando {filteredShifts.length} de {totalCount} resultados
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex w-[150px] items-center justify-center text-sm font-medium">
                Página {page} de {totalPages}
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
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                <span className="sr-only">Ir a la página siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden h-8 w-8 lg:flex"
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
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
