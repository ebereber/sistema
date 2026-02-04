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
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type { Shift } from "@/lib/services/shifts";

type TimeUnit = "days" | "weeks" | "months";

interface TurnosPageClientProps {
  shifts: Shift[];
  count: number;
  totalPages: number;
  cashRegisters: { id: string; name: string }[];
  currentFilters: {
    status: string;
    cashRegister: string;
    discrepancy: string;
    dateFrom: string;
    dateTo: string;
    page: number;
  };
}

export function TurnosPageClient({
  shifts,
  count,
  totalPages,
  cashRegisters,
  currentFilters,
}: TurnosPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Date filter local state (for the popover inputs)
  const [lastAmount, setLastAmount] = useState("30");
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("days");

  // Helper: build URL from filter updates and navigate
  const updateSearchParams = (updates: Record<string, string | undefined>) => {
    const merged: Record<string, string> = {};

    // Start from current filters
    if (currentFilters.status) merged.status = currentFilters.status;
    if (currentFilters.cashRegister)
      merged.cashRegister = currentFilters.cashRegister;
    if (currentFilters.discrepancy)
      merged.discrepancy = currentFilters.discrepancy;
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
      router.push(qs ? `/turnos?${qs}` : "/turnos");
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
    const newStatus = value === currentFilters.status ? undefined : value;
    updateSearchParams({ status: newStatus, page: undefined });
  };

  const toggleCashRegister = (value: string) => {
    const newCashRegister =
      value === currentFilters.cashRegister ? undefined : value;
    updateSearchParams({ cashRegister: newCashRegister, page: undefined });
  };

  const toggleDiscrepancy = (value: string) => {
    const newDiscrepancy =
      value === currentFilters.discrepancy ? undefined : value;
    updateSearchParams({ discrepancy: newDiscrepancy, page: undefined });
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
    const dateFrom = now.toISOString();
    updateSearchParams({ dateFrom, page: undefined });
  };

  const clearAllFilters = () => {
    setLastAmount("30");
    setTimeUnit("days");
    startTransition(() => {
      router.push("/turnos");
    });
  };

  const hasActiveFilters =
    currentFilters.status !== "" ||
    currentFilters.cashRegister !== "" ||
    currentFilters.discrepancy !== "" ||
    currentFilters.dateFrom !== "";

  const selectedCashRegisterName = cashRegisters.find(
    (r) => r.id === currentFilters.cashRegister,
  )?.name;

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
                          onSelect={() => toggleStatus("open")}
                          className="cursor-pointer"
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              currentFilters.status === "open"
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
                              currentFilters.status === "closed"
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span>Cerrado</span>
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

              {/* Caja filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 justify-start border-dashed",
                      currentFilters.cashRegister && "border-solid bg-accent",
                    )}
                  >
                    <CirclePlus className="mr-2 h-4 w-4" />
                    Caja
                    {currentFilters.cashRegister && (
                      <>
                        <div className="ml-2 flex h-4 w-4 items-center justify-center rounded-sm bg-primary text-[10px] font-medium text-primary-foreground">
                          1
                        </div>
                        <X
                          className="ml-2 h-3 w-3 hover:opacity-70"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSearchParams({
                              cashRegister: undefined,
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
                                currentFilters.cashRegister === register.id
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
                      {currentFilters.cashRegister && (
                        <>
                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem
                              onSelect={() =>
                                updateSearchParams({
                                  cashRegister: undefined,
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

              {/* Discrepancia filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 justify-start border-dashed",
                      currentFilters.discrepancy && "border-solid bg-accent",
                    )}
                  >
                    <CirclePlus className="mr-2 h-4 w-4" />
                    Discrepancia
                    {currentFilters.discrepancy && (
                      <>
                        <div className="ml-2 flex h-4 w-4 items-center justify-center rounded-sm bg-primary text-[10px] font-medium text-primary-foreground">
                          1
                        </div>
                        <X
                          className="ml-2 h-3 w-3 hover:opacity-70"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSearchParams({
                              discrepancy: undefined,
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
                              currentFilters.discrepancy === "with"
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
                              currentFilters.discrepancy === "without"
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span>Sin discrepancia</span>
                        </CommandItem>
                      </CommandGroup>
                      {currentFilters.discrepancy && (
                        <>
                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem
                              onSelect={() =>
                                updateSearchParams({
                                  discrepancy: undefined,
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
                            dateTo: undefined,
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
          <div
            className={cn(
              "overflow-hidden rounded-lg border",
              isPending && "opacity-60",
            )}
          >
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
                {shifts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No se encontraron turnos
                    </TableCell>
                  </TableRow>
                ) : (
                  shifts.map((shift) => (
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
              Mostrando {shifts.length} de {count} resultados
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
                disabled={
                  currentFilters.page === totalPages || totalPages === 0
                }
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
