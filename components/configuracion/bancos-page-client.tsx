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
  SheetDescription,
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
import {
  archiveBankAccountAction,
  createBankAccountAction,
  deleteBankAccountAction,
  getBankAccountBalancesAction,
  restoreBankAccountAction,
  updateBankAccountAction,
} from "@/lib/actions/bank-accounts";
import type { BankAccount } from "@/lib/services/bank-accounts-cached";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Ellipsis, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const BANKS = [
  { value: "galicia", label: "Banco Galicia" },
  { value: "nacion", label: "Banco Nacion" },
  { value: "santander", label: "Banco Santander" },
  { value: "bbva", label: "BBVA" },
  { value: "macro", label: "Banco Macro" },
  { value: "supervielle", label: "Banco Supervielle" },
  { value: "ciudad", label: "Banco Ciudad" },
  { value: "provincia", label: "Banco Provincia" },
  { value: "icbc", label: "ICBC" },
  { value: "hsbc", label: "HSBC" },
  { value: "patagonia", label: "Banco Patagonia" },
  { value: "comafi", label: "Banco Comafi" },
  { value: "credicoop", label: "Banco Credicoop" },
  { value: "brubank", label: "Brubank" },
  { value: "uala", label: "Uala" },
  { value: "mercadopago", label: "Mercado Pago" },
  { value: "naranja_x", label: "Naranja X" },
  { value: "personal_pay", label: "Personal Pay" },
  { value: "otro", label: "Otro" },
];

interface BancosPageClientProps {
  initialAccounts: BankAccount[];
}

export function BancosPageClient({ initialAccounts }: BancosPageClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);

  // Balances
  const [balances, setBalances] = useState<Record<string, number>>({});

  // Edit mode
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(
    null,
  );

  // Form state
  const [selectedBank, setSelectedBank] = useState("");
  const [customBankName, setCustomBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [initialBalance, setInitialBalance] = useState("0");
  const [balanceDate, setBalanceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [usesCheckbook, setUsesCheckbook] = useState(false);

  // Load balances
  useEffect(() => {
    const ids = initialAccounts.map((a) => a.id);
    if (ids.length > 0) {
      getBankAccountBalancesAction(ids).then(setBalances).catch(console.error);
    }
  }, [initialAccounts]);

  const filteredAccounts = initialAccounts.filter(
    (account) =>
      account.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.account_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getBankLabel = () => {
    if (selectedBank === "otro") return customBankName || "Otro";
    return BANKS.find((b) => b.value === selectedBank)?.label || "";
  };

  function openCreateSheet() {
    setEditingAccount(null);
    handleReset();
    setIsSheetOpen(true);
  }

  function openEditSheet(account: BankAccount) {
    setEditingAccount(account);
    // Find matching bank or set "otro"
    const matchingBank = BANKS.find((b) => b.label === account.bank_name);
    if (matchingBank) {
      setSelectedBank(matchingBank.value);
      setCustomBankName("");
    } else {
      setSelectedBank("otro");
      setCustomBankName(account.bank_name);
    }
    setAccountName(account.account_name);
    setCurrency(account.currency);
    setInitialBalance(String(account.initial_balance));
    setBalanceDate(account.balance_date.split("T")[0]);
    setUsesCheckbook(account.uses_checkbook);
    setIsSheetOpen(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const bankName = selectedBank === "otro" ? customBankName : getBankLabel();

    if (!bankName) {
      toast.error("Selecciona un banco");
      setIsLoading(false);
      return;
    }

    try {
      if (editingAccount) {
        await updateBankAccountAction(editingAccount.id, {
          bank_name: bankName,
          account_name: accountName,
          currency,
          uses_checkbook: usesCheckbook,
        });
        toast.success("Cuenta bancaria actualizada");
      } else {
        await createBankAccountAction({
          bank_name: bankName,
          account_name: accountName,
          currency,
          initial_balance: parseFloat(initialBalance) || 0,
          balance_date: balanceDate,
          uses_checkbook: usesCheckbook,
        });
        toast.success("Cuenta bancaria creada");
      }

      handleReset();
      setIsSheetOpen(false);
      router.refresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error(editingAccount ? "Error al actualizar" : "Error al crear", {
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedBank("");
    setCustomBankName("");
    setAccountName("");
    setCurrency("ARS");
    setInitialBalance("0");
    setBalanceDate(new Date().toISOString().split("T")[0]);
    setUsesCheckbook(false);
    setEditingAccount(null);
  };

  const handleCancel = () => {
    handleReset();
    setIsSheetOpen(false);
  };

  async function handleArchive(id: string) {
    try {
      await archiveBankAccountAction(id);
      toast.success("Cuenta bancaria archivada");
      router.refresh();
    } catch {
      toast.error("Error al archivar cuenta bancaria");
    }
  }

  async function handleRestore(id: string) {
    try {
      await restoreBankAccountAction(id);
      toast.success("Cuenta bancaria restaurada");
      router.refresh();
    } catch {
      toast.error("Error al restaurar cuenta bancaria");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBankAccountAction(id);
      toast.success("Cuenta bancaria eliminada");
      router.refresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al eliminar cuenta bancaria", { description: msg });
    }
  }

  const formatCurrency = (value: number, curr: string) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: curr === "USD" ? "USD" : "ARS",
    }).format(value);

  return (
    <div className="p-4 md:p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="order-2 flex flex-col gap-2 sm:order-1 sm:flex-1 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
              <Input
                className="h-8 w-full pl-8"
                placeholder="Buscar por banco o cuenta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="order-1 flex items-center gap-2 self-end sm:order-2 sm:self-auto">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button onClick={openCreateSheet}>
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
                className="sm:max-w-md overflow-y-auto "
              >
                <SheetHeader>
                  <SheetTitle>
                    {editingAccount
                      ? "Editar cuenta bancaria"
                      : "Agregar cuenta bancaria"}
                  </SheetTitle>
                  <SheetDescription>
                    {editingAccount
                      ? "Modifica los datos de la cuenta bancaria."
                      : "Agrega una nueva cuenta bancaria."}
                  </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6 p-4">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Informacion basica</h3>

                    {/* Bank name */}
                    <div className="space-y-2">
                      <Label htmlFor="bank">Nombre del banco *</Label>
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
                                ? getBankLabel()
                                : "Seleccionar banco..."}
                            </span>
                            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar banco..." />
                            <CommandList>
                              <CommandEmpty>
                                No se encontro el banco.
                              </CommandEmpty>
                              <CommandGroup>
                                {BANKS.map((bank) => (
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

                    {/* Custom bank name */}
                    {selectedBank === "otro" && (
                      <div className="space-y-2">
                        <Label htmlFor="customBankName">
                          Nombre del banco *
                        </Label>
                        <Input
                          id="customBankName"
                          placeholder="Ingresa el nombre del banco"
                          value={customBankName}
                          onChange={(e) => setCustomBankName(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    {/* Account name */}
                    <div className="space-y-2">
                      <Label htmlFor="accountName">Nombre de la cuenta *</Label>
                      <Input
                        id="accountName"
                        name="accountName"
                        placeholder="Ingresa el nombre de la cuenta"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        required
                      />
                    </div>

                    {/* Currency */}
                    <div className="space-y-2">
                      <Label>Moneda *</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                          <SelectItem value="USD">Dolares (USD)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Balance section - only for create */}
                  {!editingAccount && (
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-sm font-medium">Saldo inicial</h3>

                      <div className="space-y-2">
                        <Label htmlFor="initialBalance">Monto *</Label>
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

                      <div className="space-y-2">
                        <Label htmlFor="balanceDate">Fecha *</Label>
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
                  )}

                  {/* Features */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-sm font-medium">Caracteristicas</h3>

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

                  <SheetFooter className="gap-2 flex flex-col">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading
                        ? "Guardando..."
                        : editingAccount
                          ? "Guardar cambios"
                          : "Crear cuenta bancaria"}
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
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Nombre de cuenta</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    No se encontraron cuentas bancarias
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="font-medium">{account.bank_name}</div>
                    </TableCell>
                    <TableCell>
                      <div>{account.account_name}</div>
                    </TableCell>
                    <TableCell>
                      <span>{account.currency}</span>
                    </TableCell>
                    <TableCell>
                      <span>
                        {balances[account.id] !== undefined
                          ? formatCurrency(
                              balances[account.id],
                              account.currency,
                            )
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          account.status === "active" ? "default" : "secondary"
                        }
                      >
                        {account.status === "active" ? "Activa" : "Archivada"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <span className="sr-only">Abrir menu</span>
                            <Ellipsis className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditSheet(account)}
                          >
                            Editar
                          </DropdownMenuItem>
                          {account.status === "active" ? (
                            <DropdownMenuItem
                              onClick={() => handleArchive(account.id)}
                            >
                              Archivar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleRestore(account.id)}
                            >
                              Restaurar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(account.id)}
                          >
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

        {/* Count */}
        <div className="text-sm text-muted-foreground px-2">
          {filteredAccounts.length}{" "}
          {filteredAccounts.length === 1
            ? "cuenta bancaria"
            : "cuentas bancarias"}
        </div>
      </div>
    </div>
  );
}
