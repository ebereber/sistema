"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
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
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Ellipsis, Plus } from "lucide-react";
import { useState } from "react";

// Tipos de datos
interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  status: "active" | "inactive";
}

// Lista de bancos disponibles
const banks = [
  { value: "banco", label: "Banco" },
  { value: "naranjapos", label: "Naranjapos" },
  { value: "galicia", label: "Banco Galicia" },
  { value: "nacion", label: "Banco Nación" },
  { value: "santander", label: "Banco Santander" },
  { value: "bbva", label: "BBVA" },
  { value: "macro", label: "Banco Macro" },
  { value: "supervielle", label: "Banco Supervielle" },
  { value: "ciudad", label: "Banco Ciudad" },
  { value: "provincia", label: "Banco Provincia" },
  { value: "icbc", label: "ICBC" },
  { value: "hsbc", label: "HSBC" },
];

// Datos de ejemplo
const initialAccounts: BankAccount[] = [
  {
    id: "1",
    bankName: "Banco",
    accountName: "Principal",
    status: "active",
  },
  {
    id: "2",
    bankName: "Naranjapos",
    accountName: "Naranja",
    status: "active",
  },
];

export default function BancosPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);

  // Estados del formulario
  const [selectedBank, setSelectedBank] = useState("");
  const [accountName, setAccountName] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [balanceDate, setBalanceDate] = useState("");
  const [usesCheckbook, setUsesCheckbook] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Aquí iría la lógica para guardar la cuenta
    console.log({
      selectedBank,
      accountName,
      initialBalance,
      balanceDate,
      usesCheckbook,
    });

    // Agregar la nueva cuenta a la lista
    const newAccount: BankAccount = {
      id: String(accounts.length + 1),
      bankName: banks.find((b) => b.value === selectedBank)?.label || "",
      accountName,
      status: "active",
    };
    setAccounts([...accounts, newAccount]);

    // Resetear formulario y cerrar sheet
    handleReset();
    setIsSheetOpen(false);
  };

  const handleReset = () => {
    setSelectedBank("");
    setAccountName("");
    setInitialBalance("0");
    setBalanceDate("");
    setUsesCheckbook(false);
  };

  const handleCancel = () => {
    handleReset();
    setIsSheetOpen(false);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="space-y-6">
        {/* Header con botón */}
        <div className="flex items-center justify-end">
          <div className="flex gap-2">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar cuenta bancaria
                  <div className="ml-2 hidden md:inline">
                    <kbd className="pointer-events-none hidden h-5 min-w-5 select-none items-center justify-center gap-1 rounded-sm border border-primary-foreground/30 px-1 font-sans text-xs font-medium md:inline-flex">
                      N
                    </kbd>
                  </div>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="sm:max-w-xl overflow-y-auto"
              >
                <SheetHeader>
                  <SheetTitle>Agregar Cuenta Bancaria</SheetTitle>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                  <div className="space-y-4">
                    {/* Información Básica */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">
                        Información Básica
                      </h3>

                      {/* Nombre del Banco */}
                      <div className="space-y-2">
                        <Label htmlFor="bank">Nombre del Banco *</Label>
                        <Popover open={bankOpen} onOpenChange={setBankOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={bankOpen}
                              className="h-8 w-full justify-between border bg-white text-muted-foreground active:scale-100 dark:bg-input/30"
                            >
                              <span className="truncate text-left">
                                {selectedBank
                                  ? banks.find(
                                      (bank) => bank.value === selectedBank,
                                    )?.label
                                  : "Seleccionar banco…"}
                              </span>
                              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Buscar banco..." />
                              <CommandList>
                                <CommandEmpty>
                                  No se encontró el banco.
                                </CommandEmpty>
                                <CommandGroup>
                                  {banks.map((bank) => (
                                    <CommandItem
                                      key={bank.value}
                                      value={bank.value}
                                      onSelect={(currentValue) => {
                                        setSelectedBank(
                                          currentValue === selectedBank
                                            ? ""
                                            : currentValue,
                                        );
                                        setBankOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedBank === bank.value
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                      {bank.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Nombre de la Cuenta */}
                      <div className="space-y-2">
                        <Label htmlFor="accountName">
                          Nombre de la Cuenta *
                        </Label>
                        <Input
                          id="accountName"
                          name="accountName"
                          placeholder="Ingresá el nombre de la cuenta"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Saldo y Límites */}
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-sm font-medium">Saldo y Límites</h3>

                      {/* Saldo Inicial */}
                      <div className="space-y-2">
                        <Label htmlFor="initialBalance">Saldo Inicial *</Label>
                        <Input
                          id="initialBalance"
                          placeholder="0"
                          type="text"
                          inputMode="numeric"
                          value={initialBalance}
                          onChange={(e) => setInitialBalance(e.target.value)}
                          required
                        />
                      </div>

                      {/* Fecha Saldo Inicial */}
                      <div className="space-y-2">
                        <Label htmlFor="balanceDate">
                          Fecha Saldo Inicial *
                        </Label>
                        <Input
                          id="balanceDate"
                          name="openingBalanceDate"
                          type="date"
                          value={balanceDate}
                          onChange={(e) => setBalanceDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Características */}
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-sm font-medium">Características</h3>

                      {/* Usa chequera */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="usesCheckbook"
                          checked={usesCheckbook}
                          onCheckedChange={(checked) =>
                            setUsesCheckbook(checked as boolean)
                          }
                        />
                        <Label
                          htmlFor="usesCheckbook"
                          className="cursor-pointer font-medium"
                        >
                          Usa chequera
                        </Label>
                      </div>
                    </div>
                  </div>

                  <SheetFooter className="gap-2 flex flex-col">
                    <Button type="submit" className="w-full">
                      Crear Cuenta Bancaria
                    </Button>
                    <SheetClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        className="w-full"
                      >
                        Cancelar
                      </Button>
                    </SheetClose>
                  </SheetFooter>
                </form>

                <SheetClose className="absolute right-3 top-3">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <span className="sr-only">Cerrar</span>×
                  </Button>
                </SheetClose>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Tabla de cuentas bancarias */}
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Nombre de Cuenta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="font-medium">{account.bankName}</div>
                  </TableCell>
                  <TableCell>
                    <div>{account.accountName}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {account.status === "active" ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <span className="sr-only">Abrir menú</span>
                          <Ellipsis className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem>Ver movimientos</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
