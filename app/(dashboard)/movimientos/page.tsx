"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Banknote,
  CalendarIcon,
  Check,
  CornerDownRight,
  Minus,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  SelectItem,
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
  SheetTrigger,
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

// Mock data
const accounts = [
  { id: "946d0f42-42bf-49ba-a71e-ded7f4091544", name: "Naranja" },
  { id: "99acfeb3-8a9d-4e89-8870-291d3561079e", name: "Principal" },
  { id: "3ad20ed4-8b2e-447a-9fbf-16c56feba004", name: "Caja chica" },
  { id: "e9e5f361-596b-4cb0-b0e7-5b7664afa13d", name: "Caja grande" },
];

const movementTypes = [
  "Cobro a cliente",
  "Pago a proveedor",
  "Cheque acreditado",
  "Cheque emitido",
  "Movimiento manual",
  "Transferencia de fondos",
];

const movements = [
  {
    date: "09/02/2026",
    account: "Caja chica",
    type: "Cobro a cliente",
    reference: "-",
    description: "-",
    amount: "+$2.356,00",
    isPositive: true,
  },
  {
    date: "09/02/2026",
    account: "Principal",
    type: "Cobro a cliente",
    reference: "-",
    description: "-",
    amount: "+$1.700,24",
    isPositive: true,
  },
  {
    date: "09/02/2026",
    account: "Caja chica",
    type: "Movimiento manual",
    reference: "-",
    description: "Sobrante de caja: Venta no registrada",
    amount: "+$12.288,08",
    isPositive: true,
    editable: true,
  },
  {
    date: "09/02/2026",
    account: "Principal",
    type: "Cobro a cliente",
    reference: "-",
    description: "-",
    amount: "+$9.882,29",
    isPositive: true,
  },
];

export default function MovementsPage() {
  const [search, setSearch] = React.useState("");
  const [transferDialogOpen, setTransferDialogOpen] = React.useState(false);
  const [dateFilterOpen, setDateFilterOpen] = React.useState(false);
  const [typeFilterOpen, setTypeFilterOpen] = React.useState(false);
  const [editSheetOpen, setEditSheetOpen] = React.useState(false);

  // Transfer form state
  const [sourceAccount, setSourceAccount] = React.useState("");
  const [destinationAccount, setDestinationAccount] = React.useState("");
  const [amount, setAmount] = React.useState("0");
  const [date, setDate] = React.useState<Date>(new Date());
  const [reference, setReference] = React.useState("");
  const [description, setDescription] = React.useState("");

  // Date filter state
  const [dateFilterType, setDateFilterType] = React.useState("last");
  const [dateFilterValue, setDateFilterValue] = React.useState("30");
  const [dateFilterUnit, setDateFilterUnit] = React.useState("días");

  // Type filter state
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);

  // Edit movement state
  const [editAccount, setEditAccount] = React.useState(
    "3ad20ed4-8b2e-447a-9fbf-16c56feba004",
  );
  const [editType, setEditType] = React.useState("add");
  const [editAmount, setEditAmount] = React.useState("12.288,08");
  const [editReference, setEditReference] = React.useState("");
  const [editDescription, setEditDescription] = React.useState(
    "Sobrante de caja: Venta no registrada",
  );
  const [editDate, setEditDate] = React.useState<Date>(new Date(2026, 1, 8));

  const isTransferFormValid =
    sourceAccount && destinationAccount && parseFloat(amount) > 0;

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          Movimientos de Tesorería
        </h2>
        <div className="flex gap-2">
          <Dialog
            open={transferDialogOpen}
            onOpenChange={setTransferDialogOpen}
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
              <form className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sourceId" className="text-right">
                    Origen
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value={sourceAccount}
                      onValueChange={setSourceAccount}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccioná una cuenta" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="destinationId" className="text-right">
                    Destino
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value={destinationAccount}
                      onValueChange={setDestinationAccount}
                      disabled={!sourceAccount}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccioná una cuenta" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts
                          .filter((account) => account.id !== sourceAccount)
                          .map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">
                    Monto
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="amount"
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="occurredAt" className="text-right">
                    Fecha
                  </Label>
                  <div className="col-span-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(date, "d 'de' MMMM 'de' yyyy", {
                            locale: es,
                          })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        {/* Add Calendar component here */}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reference" className="text-right">
                    Referencia
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="reference"
                      type="text"
                      placeholder="Ej: Transferencia #123"
                      maxLength={100}
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="description" className="pt-2 text-right">
                    Descripción
                  </Label>
                  <div className="col-span-3">
                    <Textarea
                      id="description"
                      placeholder="Opcional: describí la transferencia"
                      maxLength={200}
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
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
                  <Button type="submit" disabled={!isTransferFormValid}>
                    Crear transferencia
                  </Button>
                </DialogFooter>
              </form>
              <DialogClose className="absolute right-2 top-2">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <span className="sr-only">Cerrar</span>×
                </Button>
              </DialogClose>
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
                  className="h-8 justify-start border-dashed"
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
                  <div className="flex justify-end">
                    <Button
                      className="w-full"
                      onClick={() => setDateFilterOpen(false)}
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
                  className="h-8 justify-start border-dashed"
                >
                  Otros filtros
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command>
                  <CommandInput placeholder="Tipo" />
                  <CommandList>
                    <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                    <CommandGroup>
                      {movementTypes.map((type) => {
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
              {movements.map((movement, index) => (
                <TableRow key={index}>
                  <TableCell>{movement.date}</TableCell>
                  <TableCell>{movement.account}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{movement.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {movement.reference}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {movement.description}
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      movement.isPositive ? "text-green-600" : "text-red-600",
                    )}
                  >
                    {movement.amount}
                  </TableCell>
                  <TableCell>
                    {movement.editable && (
                      <Sheet
                        open={editSheetOpen}
                        onOpenChange={setEditSheetOpen}
                      >
                        <SheetTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Editar movimiento"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="sm:max-w-xl">
                          <SheetHeader>
                            <SheetTitle>Editar movimiento</SheetTitle>
                          </SheetHeader>
                          <div className="px-4 pb-6">
                            <form>
                              <div className="space-y-4">
                                {/* Account */}
                                <div className="flex flex-col gap-2">
                                  <Label htmlFor="balanceId">Cuenta</Label>
                                  <Select
                                    value={editAccount}
                                    onValueChange={setEditAccount}
                                    disabled
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue>
                                        <div className="flex items-center gap-2">
                                          <Banknote className="h-4 w-4" />
                                          Caja chica
                                        </div>
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {accounts.map((account) => (
                                        <SelectItem
                                          key={account.id}
                                          value={account.id}
                                        >
                                          {account.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Type and Amount */}
                                <div className="grid grid-cols-2 items-center gap-4">
                                  <div className="flex flex-col gap-2">
                                    <Label htmlFor="editType">Tipo</Label>
                                    <Select
                                      value={editType}
                                      onValueChange={setEditType}
                                    >
                                      <SelectTrigger>
                                        <SelectValue>
                                          <div className="flex items-center gap-2">
                                            {editType === "add" ? (
                                              <Plus className="h-4 w-4 text-green-600" />
                                            ) : (
                                              <Minus className="h-4 w-4 text-red-600" />
                                            )}
                                            {editType === "add"
                                              ? "Ingreso"
                                              : "Egreso"}
                                          </div>
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="remove">
                                          <div className="flex items-center gap-2">
                                            <Minus className="h-4 w-4 text-red-600" />
                                            Egreso
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="add">
                                          <div className="flex items-center gap-2">
                                            <Plus className="h-4 w-4 text-green-600" />
                                            Ingreso
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    <Label htmlFor="editAmount">Monto</Label>
                                    <Input
                                      id="editAmount"
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="0,00"
                                      value={editAmount}
                                      onChange={(e) =>
                                        setEditAmount(e.target.value)
                                      }
                                    />
                                  </div>
                                </div>

                                {/* Reference */}
                                <div className="flex flex-col gap-2">
                                  <Label htmlFor="editReference">
                                    Referencia
                                  </Label>
                                  <Input
                                    id="editReference"
                                    type="text"
                                    placeholder="Ej: VEP 12345"
                                    maxLength={100}
                                    value={editReference}
                                    onChange={(e) =>
                                      setEditReference(e.target.value)
                                    }
                                  />
                                </div>

                                {/* Description */}
                                <div className="flex flex-col gap-2">
                                  <Label htmlFor="editDescription">
                                    Descripción
                                  </Label>
                                  <Textarea
                                    id="editDescription"
                                    placeholder="Ej: Pago VEP AFIP enero 2025"
                                    maxLength={200}
                                    rows={2}
                                    value={editDescription}
                                    onChange={(e) =>
                                      setEditDescription(e.target.value)
                                    }
                                    className="resize-none"
                                  />
                                </div>

                                {/* Date */}
                                <div className="flex flex-col gap-2">
                                  <Label htmlFor="editOccurredAt">Fecha</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {format(
                                          editDate,
                                          "d 'de' MMMM 'de' yyyy",
                                          { locale: es },
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      {/* Add Calendar component here */}
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </div>

                              <SheetFooter className="mt-auto gap-2 p-4 flex flex-col">
                                <Button type="submit">Guardar cambios</Button>
                                <SheetClose asChild>
                                  <Button type="button" variant="outline">
                                    Cancelar
                                  </Button>
                                </SheetClose>
                              </SheetFooter>
                            </form>
                          </div>
                          <SheetClose className="absolute right-3 top-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                            >
                              <span className="sr-only">Cerrar</span>×
                            </Button>
                          </SheetClose>
                        </SheetContent>
                      </Sheet>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
