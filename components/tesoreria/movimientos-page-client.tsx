"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  Check,
  CornerDownRight,
  Minus,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { UnifiedTreasuryMovement } from "@/lib/services/treasury-cached";
import {
  createTreasuryTransferAction,
  createManualMovementAction,
  updateManualMovementAction,
  deleteManualMovementAction,
} from "@/lib/actions/treasury";

// ── Types ──────────────────────────────────────────────────────────

export interface TreasuryAccountOption {
  id: string;
  name: string;
  type: "bank_account" | "safe_box" | "cash_register";
}

interface MovimientosPageClientProps {
  movements: UnifiedTreasuryMovement[];
  accounts: TreasuryAccountOption[];
}

// ── Component ──────────────────────────────────────────────────────

export function MovimientosPageClient({
  movements,
  accounts,
}: MovimientosPageClientProps) {
  const router = useRouter();

  // Filters
  const [search, setSearch] = React.useState("");
  const [dateFilterOpen, setDateFilterOpen] = React.useState(false);
  const [typeFilterOpen, setTypeFilterOpen] = React.useState(false);
  const [dateFilterType, setDateFilterType] = React.useState("last");
  const [dateFilterValue, setDateFilterValue] = React.useState("30");
  const [dateFilterUnit, setDateFilterUnit] = React.useState("días");
  const [dateFilterActive, setDateFilterActive] = React.useState(false);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);

  // Transfer dialog
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [transferLoading, setTransferLoading] = React.useState(false);
  const [transferSource, setTransferSource] = React.useState("");
  const [transferDest, setTransferDest] = React.useState("");
  const [transferAmount, setTransferAmount] = React.useState("");
  const [transferDate, setTransferDate] = React.useState<Date>(new Date());
  const [transferDateOpen, setTransferDateOpen] = React.useState(false);
  const [transferRef, setTransferRef] = React.useState("");
  const [transferDesc, setTransferDesc] = React.useState("");

  // Manual movement sheet
  const [manualOpen, setManualOpen] = React.useState(false);
  const [manualLoading, setManualLoading] = React.useState(false);
  const [manualAccount, setManualAccount] = React.useState("");
  const [manualType, setManualType] = React.useState<"deposit" | "withdrawal">(
    "deposit",
  );
  const [manualAmount, setManualAmount] = React.useState("");
  const [manualRef, setManualRef] = React.useState("");
  const [manualDesc, setManualDesc] = React.useState("");
  const [manualDate, setManualDate] = React.useState<Date>(new Date());
  const [manualDateOpen, setManualDateOpen] = React.useState(false);

  // Edit sheet
  const [editOpen, setEditOpen] = React.useState(false);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editMovement, setEditMovement] =
    React.useState<UnifiedTreasuryMovement | null>(null);
  const [editType, setEditType] = React.useState<"deposit" | "withdrawal">(
    "deposit",
  );
  const [editAmount, setEditAmount] = React.useState("");
  const [editRef, setEditRef] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editDate, setEditDate] = React.useState<Date>(new Date());
  const [editDateOpen, setEditDateOpen] = React.useState(false);

  // ── Derived data ───────────────────────────────────────────────

  // Get unique types from movements for dynamic filter
  const availableTypes = React.useMemo(() => {
    const types = new Set(movements.map((m) => m.type));
    return Array.from(types).sort();
  }, [movements]);

  // Filter accounts for manual movements (no cash registers)
  const manualAccounts = React.useMemo(
    () => accounts.filter((a) => a.type !== "cash_register"),
    [accounts],
  );

  // Group accounts by type for selectors
  const bankAccounts = accounts.filter((a) => a.type === "bank_account");
  const safeBoxes = accounts.filter((a) => a.type === "safe_box");
  const cashRegisters = accounts.filter((a) => a.type === "cash_register");

  // Filtered movements
  const filteredMovements = React.useMemo(() => {
    let result = movements;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.account.toLowerCase().includes(q) ||
          m.type.toLowerCase().includes(q) ||
          m.reference?.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q),
      );
    }

    // Date filter
    if (dateFilterActive) {
      const days = parseInt(dateFilterValue) || 30;
      const multiplier =
        dateFilterUnit === "semanas" ? 7 : dateFilterUnit === "meses" ? 30 : 1;
      const totalDays = days * multiplier;
      const now = new Date();

      if (dateFilterType === "last") {
        const cutoff = new Date(
          now.getTime() - totalDays * 24 * 60 * 60 * 1000,
        );
        result = result.filter((m) => new Date(m.dateRaw) >= cutoff);
      } else {
        const cutoff = new Date(
          now.getTime() + totalDays * 24 * 60 * 60 * 1000,
        );
        result = result.filter((m) => new Date(m.dateRaw) <= cutoff);
      }
    }

    // Type filter
    if (selectedTypes.length > 0) {
      result = result.filter((m) => selectedTypes.includes(m.type));
    }

    return result;
  }, [
    movements,
    search,
    dateFilterActive,
    dateFilterType,
    dateFilterValue,
    dateFilterUnit,
    selectedTypes,
  ]);

  // ── Handlers ───────────────────────────────────────────────────

  function resetTransferForm() {
    setTransferSource("");
    setTransferDest("");
    setTransferAmount("");
    setTransferDate(new Date());
    setTransferRef("");
    setTransferDesc("");
  }

  function resetManualForm() {
    setManualAccount("");
    setManualType("deposit");
    setManualAmount("");
    setManualRef("");
    setManualDesc("");
    setManualDate(new Date());
  }

  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sourceAcc = accounts.find((a) => `${a.type}:${a.id}` === transferSource);
    const destAcc = accounts.find((a) => `${a.type}:${a.id}` === transferDest);

    if (!sourceAcc || !destAcc) return;

    setTransferLoading(true);
    try {
      await createTreasuryTransferAction({
        source_type: sourceAcc.type,
        source_id: sourceAcc.id,
        destination_type: destAcc.type,
        destination_id: destAcc.id,
        amount: parseFloat(transferAmount) || 0,
        reference: transferRef || undefined,
        description: transferDesc || undefined,
        date: format(transferDate, "yyyy-MM-dd"),
      });
      toast.success("Transferencia creada");
      setTransferOpen(false);
      resetTransferForm();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error al crear transferencia");
    } finally {
      setTransferLoading(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const acc = manualAccounts.find(
      (a) => `${a.type}:${a.id}` === manualAccount,
    );
    if (!acc) return;

    setManualLoading(true);
    try {
      await createManualMovementAction({
        account_type: acc.type as "bank_account" | "safe_box",
        account_id: acc.id,
        type: manualType,
        amount: parseFloat(manualAmount) || 0,
        reference: manualRef || undefined,
        description: manualDesc || undefined,
        date: format(manualDate, "yyyy-MM-dd"),
      });
      toast.success("Movimiento creado");
      setManualOpen(false);
      resetManualForm();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error al crear movimiento");
    } finally {
      setManualLoading(false);
    }
  }

  function openEditSheet(movement: UnifiedTreasuryMovement) {
    setEditMovement(movement);
    setEditType(movement.isPositive ? "deposit" : "withdrawal");
    setEditAmount(String(movement.amount));
    setEditRef(movement.reference || "");
    setEditDesc(movement.description || "");
    setEditDate(new Date(movement.dateRaw));
    setEditOpen(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editMovement) return;

    setEditLoading(true);
    try {
      await updateManualMovementAction(
        editMovement.id,
        editMovement.accountType as "bank_account" | "safe_box",
        {
          type: editType,
          amount: parseFloat(editAmount) || 0,
          reference: editRef || undefined,
          description: editDesc || undefined,
          date: format(editDate, "yyyy-MM-dd"),
        },
      );
      toast.success("Movimiento actualizado");
      setEditOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!editMovement) return;

    setEditLoading(true);
    try {
      await deleteManualMovementAction(
        editMovement.id,
        editMovement.accountType as "bank_account" | "safe_box",
      );
      toast.success("Movimiento eliminado");
      setEditOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar");
    } finally {
      setEditLoading(false);
    }
  }

  const isTransferValid =
    transferSource &&
    transferDest &&
    transferSource !== transferDest &&
    parseFloat(transferAmount) > 0;

  const isManualValid =
    manualAccount && parseFloat(manualAmount) > 0;

  // ── Render helpers ─────────────────────────────────────────────

  function renderAccountSelect(
    value: string,
    onValueChange: (val: string) => void,
    excludeValue?: string,
  ) {
    const filtered = (items: TreasuryAccountOption[]) =>
      items.filter((a) => `${a.type}:${a.id}` !== excludeValue);

    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Seleccioná una cuenta" />
        </SelectTrigger>
        <SelectContent>
          {filtered(bankAccounts).length > 0 && (
            <SelectGroup>
              <SelectLabel>Cuentas Bancarias</SelectLabel>
              {filtered(bankAccounts).map((a) => (
                <SelectItem key={`bank_account:${a.id}`} value={`bank_account:${a.id}`}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {filtered(safeBoxes).length > 0 && (
            <SelectGroup>
              <SelectLabel>Cajas Fuertes</SelectLabel>
              {filtered(safeBoxes).map((a) => (
                <SelectItem key={`safe_box:${a.id}`} value={`safe_box:${a.id}`}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {filtered(cashRegisters).length > 0 && (
            <SelectGroup>
              <SelectLabel>Cajas Registradoras</SelectLabel>
              {filtered(cashRegisters).map((a) => (
                <SelectItem key={`cash_register:${a.id}`} value={`cash_register:${a.id}`}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    );
  }

  function renderManualAccountSelect(
    value: string,
    onValueChange: (val: string) => void,
  ) {
    const manualBanks = manualAccounts.filter(
      (a) => a.type === "bank_account",
    );
    const manualSafes = manualAccounts.filter(
      (a) => a.type === "safe_box",
    );

    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Seleccioná una cuenta" />
        </SelectTrigger>
        <SelectContent>
          {manualBanks.length > 0 && (
            <SelectGroup>
              <SelectLabel>Cuentas Bancarias</SelectLabel>
              {manualBanks.map((a) => (
                <SelectItem key={`bank_account:${a.id}`} value={`bank_account:${a.id}`}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {manualSafes.length > 0 && (
            <SelectGroup>
              <SelectLabel>Cajas Fuertes</SelectLabel>
              {manualSafes.map((a) => (
                <SelectItem key={`safe_box:${a.id}`} value={`safe_box:${a.id}`}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    );
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          Movimientos de Tesorería
        </h2>
        <div className="flex gap-2">
          {/* Manual movement button */}
          <Button
            variant="outline"
            className="h-8 gap-1.5"
            onClick={() => {
              resetManualForm();
              setManualOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo movimiento
          </Button>

          {/* Transfer dialog */}
          <Dialog
            open={transferOpen}
            onOpenChange={(open) => {
              setTransferOpen(open);
              if (!open) resetTransferForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="h-8 gap-1.5">
                <Plus className="h-4 w-4" />
                Nueva transferencia
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nueva transferencia</DialogTitle>
                <DialogDescription>
                  Transferí fondos entre cuentas bancarias y cajas.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTransferSubmit} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Origen</Label>
                  <div className="col-span-3">
                    {renderAccountSelect(
                      transferSource,
                      setTransferSource,
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Destino</Label>
                  <div className="col-span-3">
                    {renderAccountSelect(
                      transferDest,
                      setTransferDest,
                      transferSource,
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Monto</Label>
                  <div className="col-span-3">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Fecha</Label>
                  <div className="col-span-3">
                    <Popover
                      open={transferDateOpen}
                      onOpenChange={setTransferDateOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(transferDate, "d 'de' MMMM 'de' yyyy", {
                            locale: es,
                          })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={transferDate}
                          onSelect={(date) => {
                            if (date) {
                              setTransferDate(date);
                              setTransferDateOpen(false);
                            }
                          }}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Referencia</Label>
                  <div className="col-span-3">
                    <Input
                      type="text"
                      placeholder="Ej: Transferencia #123"
                      maxLength={100}
                      value={transferRef}
                      onChange={(e) => setTransferRef(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="pt-2 text-right">Descripción</Label>
                  <div className="col-span-3">
                    <Textarea
                      placeholder="Opcional: describí la transferencia"
                      maxLength={200}
                      rows={2}
                      value={transferDesc}
                      onChange={(e) => setTransferDesc(e.target.value)}
                      className="resize-none"
                    />
                  </div>
                </div>
                <DialogFooter className="-mx-4 -mb-4 rounded-b-xl border-t bg-muted/50 p-4">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={!isTransferValid || transferLoading}
                  >
                    {transferLoading ? "Creando..." : "Crear transferencia"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="space-y-4">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex w-full min-w-0 flex-1 flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar movimientos…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-full pl-8 sm:w-[150px] lg:w-[250px]"
              />
            </div>

            {/* Date Filter */}
            <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-8 justify-start border-dashed",
                    dateFilterActive && "border-solid bg-accent",
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  Fecha
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[17rem]">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">Fecha</Label>
                  </div>
                  <div className="space-y-3">
                    <Select
                      value={dateFilterType}
                      onValueChange={setDateFilterType}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="en los últimos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last">en los últimos</SelectItem>
                        <SelectItem value="next">en los próximos</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <CornerDownRight className="h-3.5 w-12 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          placeholder="30"
                          value={dateFilterValue}
                          onChange={(e) => setDateFilterValue(e.target.value)}
                          className="w-full"
                        />
                        <Select
                          value={dateFilterUnit}
                          onValueChange={setDateFilterUnit}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="días" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="días">días</SelectItem>
                            <SelectItem value="semanas">semanas</SelectItem>
                            <SelectItem value="meses">meses</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {dateFilterActive && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setDateFilterActive(false);
                          setDateFilterOpen(false);
                        }}
                      >
                        Limpiar
                      </Button>
                    )}
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setDateFilterActive(true);
                        setDateFilterOpen(false);
                      }}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Type Filter */}
            <Popover open={typeFilterOpen} onOpenChange={setTypeFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-8 justify-start border-dashed",
                    selectedTypes.length > 0 && "border-solid bg-accent",
                  )}
                >
                  Tipo
                  {selectedTypes.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-5 rounded-sm px-1"
                    >
                      {selectedTypes.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar tipo..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                    <CommandGroup>
                      {availableTypes.map((type) => {
                        const isSelected = selectedTypes.includes(type);
                        return (
                          <CommandItem
                            key={type}
                            value={type}
                            onSelect={() => {
                              setSelectedTypes(
                                isSelected
                                  ? selectedTypes.filter((t) => t !== type)
                                  : [...selectedTypes, type],
                              );
                            }}
                          >
                            <div
                              className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-input",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50 [&_svg]:invisible",
                              )}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </div>
                            <span className="ml-2 truncate">{type}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Clear filters */}
            {(search || dateFilterActive || selectedTypes.length > 0) && (
              <Button
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  setSearch("");
                  setDateFilterActive(false);
                  setSelectedTypes([]);
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No se encontraron movimientos
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((movement) => (
                  <TableRow key={`${movement.accountType}-${movement.id}`}>
                    <TableCell>{movement.date}</TableCell>
                    <TableCell>{movement.account}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{movement.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {movement.reference || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="max-w-[200px] truncate text-muted-foreground">
                        {movement.description || "-"}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        movement.isPositive
                          ? "text-green-600"
                          : "text-red-600",
                      )}
                    >
                      {movement.isPositive ? "+" : "-"}$
                      {movement.amount.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      {movement.editable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Editar movimiento"
                          onClick={() => openEditSheet(movement)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Manual movement sheet */}
      <Sheet open={manualOpen} onOpenChange={setManualOpen}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Nuevo movimiento manual</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <form onSubmit={handleManualSubmit}>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label>Cuenta</Label>
                  {renderManualAccountSelect(manualAccount, setManualAccount)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Tipo</Label>
                    <Select
                      value={manualType}
                      onValueChange={(v) =>
                        setManualType(v as "deposit" | "withdrawal")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            {manualType === "deposit" ? (
                              <Plus className="h-4 w-4 text-green-600" />
                            ) : (
                              <Minus className="h-4 w-4 text-red-600" />
                            )}
                            {manualType === "deposit" ? "Ingreso" : "Egreso"}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deposit">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4 text-green-600" />
                            Ingreso
                          </div>
                        </SelectItem>
                        <SelectItem value="withdrawal">
                          <div className="flex items-center gap-2">
                            <Minus className="h-4 w-4 text-red-600" />
                            Egreso
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Monto</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Referencia</Label>
                  <Input
                    type="text"
                    placeholder="Ej: VEP 12345"
                    maxLength={100}
                    value={manualRef}
                    onChange={(e) => setManualRef(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Descripción</Label>
                  <Textarea
                    placeholder="Ej: Pago VEP AFIP enero 2025"
                    maxLength={200}
                    rows={2}
                    value={manualDesc}
                    onChange={(e) => setManualDesc(e.target.value)}
                    className="resize-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Fecha</Label>
                  <Popover
                    open={manualDateOpen}
                    onOpenChange={setManualDateOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(manualDate, "d 'de' MMMM 'de' yyyy", {
                          locale: es,
                        })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={manualDate}
                        onSelect={(date) => {
                          if (date) {
                            setManualDate(date);
                            setManualDateOpen(false);
                          }
                        }}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <SheetFooter className="mt-6 flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={!isManualValid || manualLoading}
                >
                  {manualLoading ? "Creando..." : "Crear movimiento"}
                </Button>
                <SheetClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </SheetClose>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit movement sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Editar movimiento</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label>Cuenta</Label>
                  <Input
                    value={editMovement?.account || ""}
                    disabled
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Tipo</Label>
                    <Select
                      value={editType}
                      onValueChange={(v) =>
                        setEditType(v as "deposit" | "withdrawal")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            {editType === "deposit" ? (
                              <Plus className="h-4 w-4 text-green-600" />
                            ) : (
                              <Minus className="h-4 w-4 text-red-600" />
                            )}
                            {editType === "deposit" ? "Ingreso" : "Egreso"}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deposit">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4 text-green-600" />
                            Ingreso
                          </div>
                        </SelectItem>
                        <SelectItem value="withdrawal">
                          <div className="flex items-center gap-2">
                            <Minus className="h-4 w-4 text-red-600" />
                            Egreso
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Monto</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Referencia</Label>
                  <Input
                    type="text"
                    placeholder="Ej: VEP 12345"
                    maxLength={100}
                    value={editRef}
                    onChange={(e) => setEditRef(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Descripción</Label>
                  <Textarea
                    placeholder="Ej: Pago VEP AFIP enero 2025"
                    maxLength={200}
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="resize-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Fecha</Label>
                  <Popover
                    open={editDateOpen}
                    onOpenChange={setEditDateOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(editDate, "d 'de' MMMM 'de' yyyy", {
                          locale: es,
                        })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={editDate}
                        onSelect={(date) => {
                          if (date) {
                            setEditDate(date);
                            setEditDateOpen(false);
                          }
                        }}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <SheetFooter className="mt-6 flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={
                    parseFloat(editAmount) <= 0 || editLoading
                  }
                >
                  {editLoading ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={editLoading}
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar movimiento
                </Button>
                <SheetClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </SheetClose>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
