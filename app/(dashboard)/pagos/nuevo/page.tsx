"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  Check,
  ChevronRight,
  ChevronsUpDown,
  CreditCard,
  EllipsisVertical,
  FileText,
  Info,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { SupplierDialog } from "@/components/proveedores/supplier-dialog";
import {
  getCashRegisters,
  type CashRegister,
} from "@/lib/services/cash-registers";
import {
  createSupplierPayment,
  getPendingPurchases,
} from "@/lib/services/supplier-payments";
import { getSuppliers, type Supplier } from "@/lib/services/suppliers";

// Types
interface PendingPurchase {
  id: string;
  voucher_number: string;
  purchase_number: string | null;
  total: number;
  amount_paid: number | null;
  invoice_date: string;
  payment_status: string | null;
  balance: number;
  selected: boolean;
  amountToPay: number;
}

interface PaymentMethodItem {
  id: string;
  method_name: string;
  reference: string;
  cash_register_id: string;
  amount: number;
}

const PAYMENT_METHODS = [
  "Efectivo",
  "Transferencia",
  "Tarjeta de débito",
  "Tarjeta de crédito",
  "Cheque",
  "Otro",
];

export default function NuevoPagoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseIdFromUrl = searchParams.get("purchaseId");

  // Data from DB
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [purchases, setPurchases] = useState<PendingPurchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [onAccountAmount, setOnAccountAmount] = useState<number>(0);

  // UI state
  const [openSupplier, setOpenSupplier] = useState(false);
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment method dialog state
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [dialogMethod, setDialogMethod] = useState("Efectivo");
  const [dialogReference, setDialogReference] = useState("");
  const [dialogCashRegisterId, setDialogCashRegisterId] = useState("");
  const [dialogAmount, setDialogAmount] = useState("");

  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [suppliersData, cashRegistersData] = await Promise.all([
          getSuppliers({ active: true }),
          getCashRegisters(),
        ]);
        setSuppliers(suppliersData);
        setCashRegisters(cashRegistersData);

        // Set default cash register (use first one)
        if (cashRegistersData.length > 0) {
          setDialogCashRegisterId(cashRegistersData[0].id);
        }

        // If purchaseId in URL, load that purchase and pre-select
        if (purchaseIdFromUrl && !initialLoadDone) {
          const { getPurchaseById } = await import("@/lib/services/purchases");
          const purchase = await getPurchaseById(purchaseIdFromUrl);

          if (purchase && purchase.supplier_id) {
            // Set supplier
            setSelectedSupplierId(purchase.supplier_id);

            // Load pending purchases for this supplier
            const pendingPurchases = await getPendingPurchases(
              purchase.supplier_id,
            );

            // Map and pre-select the purchase from URL
            setPurchases(
              pendingPurchases.map((p) => ({
                ...p,
                selected: p.id === purchaseIdFromUrl,
                amountToPay: p.id === purchaseIdFromUrl ? p.balance : 0,
              })),
            );
          }
          setInitialLoadDone(true);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar datos");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [purchaseIdFromUrl, initialLoadDone]);

  // Load pending purchases when supplier changes
  const loadPendingPurchases = useCallback(async (supplierId: string) => {
    if (!supplierId) {
      setPurchases([]);
      return;
    }

    setLoadingPurchases(true);
    try {
      const data = await getPendingPurchases(supplierId);
      setPurchases(
        data.map((p) => ({
          ...p,
          selected: false,
          amountToPay: 0,
        })),
      );
    } catch (error) {
      console.error("Error loading purchases:", error);
      toast.error("Error al cargar compras pendientes");
    } finally {
      setLoadingPurchases(false);
    }
  }, []);

  // Handle supplier change
  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setOpenSupplier(false);
    loadPendingPurchases(supplierId);
    // Reset payment methods when changing supplier
    setPaymentMethods([]);
    setOnAccountAmount(0);
  };

  // Handle supplier created
  const handleSupplierCreated = (supplier: Supplier) => {
    setSuppliers((prev) =>
      [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name)),
    );
    handleSupplierChange(supplier.id);
  };

  // Calculations
  const selectedPurchases = purchases.filter((p) => p.selected);
  const totalPurchases = selectedPurchases.reduce(
    (sum, p) => sum + p.amountToPay,
    0,
  );
  const totalPayment = totalPurchases + onAccountAmount;
  const totalPaymentMethods = paymentMethods.reduce(
    (sum, pm) => sum + pm.amount,
    0,
  );
  const difference = totalPayment - totalPaymentMethods;

  // Checkbox helpers
  const allSelected =
    purchases.length > 0 && purchases.every((p) => p.selected);
  const someSelected = purchases.some((p) => p.selected);

  // Handlers
  const handleSelectAll = () => {
    const newSelected = !allSelected;
    setPurchases(
      purchases.map((p) => ({
        ...p,
        selected: newSelected,
        amountToPay: newSelected ? p.balance : 0,
      })),
    );
  };

  const handleSelectPurchase = (purchaseId: string) => {
    setPurchases(
      purchases.map((p) =>
        p.id === purchaseId
          ? {
              ...p,
              selected: !p.selected,
              amountToPay: !p.selected ? p.balance : 0,
            }
          : p,
      ),
    );
  };

  const handleAmountChange = (purchaseId: string, value: string) => {
    const numValue = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
    setPurchases(
      purchases.map((p) =>
        p.id === purchaseId
          ? { ...p, amountToPay: Math.min(numValue, p.balance) }
          : p,
      ),
    );
  };

  const handleOnAccountChange = (value: string) => {
    const numValue = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
    setOnAccountAmount(numValue);
  };

  // Payment method handlers
  const openAddPaymentDialog = () => {
    setEditingPaymentId(null);
    setDialogMethod("Efectivo");
    setDialogReference("");
    // Keep default cash register
    setDialogAmount(difference > 0 ? difference.toFixed(2) : "");
    setOpenPaymentDialog(true);
  };

  const openEditPaymentDialog = (payment: PaymentMethodItem) => {
    setEditingPaymentId(payment.id);
    setDialogMethod(payment.method_name);
    setDialogReference(payment.reference);
    setDialogCashRegisterId(payment.cash_register_id);
    setDialogAmount(payment.amount.toString());
    setOpenPaymentDialog(true);
  };

  const handleSavePaymentMethod = () => {
    const amount = parseFloat(dialogAmount.replace(/[^0-9.]/g, "")) || 0;

    if (amount <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    if (editingPaymentId) {
      setPaymentMethods(
        paymentMethods.map((pm) =>
          pm.id === editingPaymentId
            ? {
                ...pm,
                method_name: dialogMethod,
                reference: dialogReference,
                cash_register_id: dialogCashRegisterId,
                amount,
              }
            : pm,
        ),
      );
    } else {
      const newPayment: PaymentMethodItem = {
        id: `temp-${Date.now()}`,
        method_name: dialogMethod,
        reference: dialogReference,
        cash_register_id: dialogCashRegisterId,
        amount,
      };
      setPaymentMethods([...paymentMethods, newPayment]);
    }

    setOpenPaymentDialog(false);
  };

  const handleDeletePaymentMethod = (id: string) => {
    setPaymentMethods(paymentMethods.filter((pm) => pm.id !== id));
  };

  // Format helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "hoy";
    if (date.toDateString() === yesterday.toDateString()) return "ayer";
    return format(date, "dd/MM/yyyy", { locale: es });
  };

  // Filter purchases by search
  const filteredPurchases = purchases.filter(
    (p) =>
      p.voucher_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.purchase_number || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!selectedSupplierId) {
      toast.error("Seleccioná un proveedor");
      return;
    }

    if (selectedPurchases.length === 0 && onAccountAmount <= 0) {
      toast.error("Seleccioná al menos una compra o ingresá un pago a cuenta");
      return;
    }

    if (paymentMethods.length === 0) {
      toast.error("Debés agregar al menos un método de pago");
      return;
    }

    if (Math.abs(difference) > 0.01) {
      toast.error(
        "El total de los métodos de pago debe ser igual al monto total",
      );
      return;
    }

    // Check amounts don't exceed balance
    for (const purchase of selectedPurchases) {
      if (purchase.amountToPay > purchase.balance) {
        toast.error(
          `El monto a pagar no puede superar el saldo de la compra ${purchase.voucher_number}`,
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const paymentData = {
        supplier_id: selectedSupplierId,
        payment_date: format(paymentDate, "yyyy-MM-dd"),
        total_amount: totalPayment,
        on_account_amount: onAccountAmount > 0 ? onAccountAmount : undefined,
        notes: notes || null,
      };

      const allocations = selectedPurchases.map((p) => ({
        purchase_id: p.id,
        amount: p.amountToPay,
      }));

      const methods = paymentMethods.map((pm) => ({
        method_name: pm.method_name,
        reference: pm.reference || null,
        cash_register_id: pm.cash_register_id || null,
        amount: pm.amount,
      }));

      const payment = await createSupplierPayment(
        paymentData,
        allocations,
        methods,
      );

      toast.success("Pago registrado correctamente");
      router.push(`/pagos/${payment.id}`);
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error("Error al registrar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const hasPurchases = purchases.length > 0;

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="gap-4">
          <Link
            href="/pagos"
            className="inline-flex items-center gap-1.5 px-0 text-sm text-muted-foreground hover:underline"
          >
            Pagos
            <ChevronRight className="size-3" />
          </Link>
          <h1 className="text-3xl font-bold">Nuevo pago a proveedor</h1>
        </div>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Columna izquierda */}
          <div className="space-y-6 lg:col-span-2">
            {/* Card de información básica */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Proveedor */}
                  <div className="space-y-2">
                    <Label>Proveedor *</Label>
                    <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openSupplier}
                          className="w-full justify-start text-left active:scale-100"
                        >
                          <span className="truncate">
                            {selectedSupplier?.name || "Seleccionar proveedor"}
                          </span>
                          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar proveedor…" />
                          <CommandList>
                            <CommandEmpty>
                              No se encontraron proveedores
                            </CommandEmpty>
                            <CommandGroup>
                              <SupplierDialog
                                mode="create"
                                onSuccess={handleSupplierCreated}
                                trigger={
                                  <div className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground">
                                    <Plus className="h-4 w-4" />
                                    <span className="font-medium">
                                      Crear nuevo proveedor
                                    </span>
                                  </div>
                                }
                              />
                            </CommandGroup>
                            <CommandGroup heading="Proveedores">
                              {suppliers.map((supplier) => (
                                <CommandItem
                                  key={supplier.id}
                                  value={supplier.name}
                                  onSelect={() =>
                                    handleSupplierChange(supplier.id)
                                  }
                                >
                                  <div
                                    className={cn(
                                      "mr-2 flex h-4 w-4 items-center justify-center rounded-[4px] border border-input",
                                      selectedSupplierId === supplier.id
                                        ? "bg-primary text-primary-foreground"
                                        : "[&_svg]:invisible",
                                    )}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="truncate">
                                    {supplier.name}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Fecha de pago */}
                  <div className="space-y-2">
                    <Label>Fecha de pago *</Label>
                    <Popover
                      open={openDatePicker}
                      onOpenChange={setOpenDatePicker}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal active:scale-100"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {format(paymentDate, "d 'de' MMMM 'de' yyyy", {
                            locale: es,
                          })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={paymentDate}
                          onSelect={(date) => {
                            if (date) {
                              setPaymentDate(date);
                              setOpenDatePicker(false);
                            }
                          }}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Notas */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Notas</Label>
                    <Input
                      placeholder="Notas del pago (opcional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de compras pendientes */}
            {selectedSupplierId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="size-4" />
                    Compras pendientes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingPurchases ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                  ) : !hasPurchases ? (
                    <p className="py-4 text-sm text-muted-foreground">
                      No hay compras pendientes para este proveedor.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Buscador */}
                      <div className="relative">
                        <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por número de factura…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8"
                        />
                      </div>

                      {/* Tabla de compras */}
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={allSelected}
                                  onCheckedChange={handleSelectAll}
                                  aria-label="Seleccionar todas"
                                  ref={(el) => {
                                    if (el) {
                                      (
                                        el as HTMLButtonElement & {
                                          indeterminate: boolean;
                                        }
                                      ).indeterminate =
                                        someSelected && !allSelected;
                                    }
                                  }}
                                />
                              </TableHead>
                              <TableHead>Nº Factura</TableHead>
                              <TableHead>Fecha</TableHead>
                              <TableHead className="text-right">
                                Saldo
                              </TableHead>
                              <TableHead className="text-right">
                                Monto a pagar
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPurchases.map((purchase) => (
                              <TableRow key={purchase.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={purchase.selected}
                                    onCheckedChange={() =>
                                      handleSelectPurchase(purchase.id)
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <Link
                                    href={`/compras/${purchase.id}`}
                                    className="font-medium text-primary hover:underline"
                                    target="_blank"
                                  >
                                    {purchase.voucher_number}
                                  </Link>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {formatDate(purchase.invoice_date)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(purchase.balance)}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={
                                      purchase.selected
                                        ? purchase.amountToPay.toFixed(2)
                                        : ""
                                    }
                                    onChange={(e) =>
                                      handleAmountChange(
                                        purchase.id,
                                        e.target.value,
                                      )
                                    }
                                    disabled={!purchase.selected}
                                    className="ml-auto flex h-8 w-28 text-right"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Pago a cuenta */}
                  <div className="border-t pt-4">
                    <div className="flex w-full flex-row items-center gap-4">
                      <Label className="flex items-center gap-2">
                        Pago a cuenta
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="size-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Registrá un pago para imputar a futuras facturas
                                (opcional)
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        placeholder="$ 0,00"
                        type="text"
                        inputMode="numeric"
                        value={
                          onAccountAmount > 0 ? onAccountAmount.toFixed(2) : ""
                        }
                        onChange={(e) => handleOnAccountChange(e.target.value)}
                        className="w-full text-right md:w-32"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Card de método de pago */}
            {selectedSupplierId &&
              (totalPurchases > 0 || onAccountAmount > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="size-4" />
                      Método de pago
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {paymentMethods.length > 0 && (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Método</TableHead>
                              <TableHead>Referencia</TableHead>
                              <TableHead className="text-right">
                                Monto
                              </TableHead>
                              <TableHead className="w-16"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paymentMethods.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell className="font-medium">
                                  {payment.method_name}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {payment.reference || "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(payment.amount)}
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <EllipsisVertical className="size-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() =>
                                          openEditPaymentDialog(payment)
                                        }
                                      >
                                        <Pencil className="mr-2 size-4" />
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() =>
                                          handleDeletePaymentMethod(payment.id)
                                        }
                                      >
                                        <Trash2 className="mr-2 size-4" />
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
                    )}

                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openAddPaymentDialog}
                      >
                        <Plus className="mr-2 size-4" />
                        Agregar método de pago
                      </Button>
                      {paymentMethods.length > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            Restante:{" "}
                          </span>
                          <span
                            className={cn(
                              "font-medium",
                              Math.abs(difference) > 0.01
                                ? "text-destructive"
                                : "text-green-600",
                            )}
                          >
                            {formatCurrency(Math.abs(difference))}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>

          {/* Columna derecha - Resumen */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="size-4 text-muted-foreground" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total compras</span>
                  <span className="font-medium">
                    {formatCurrency(totalPurchases)}
                  </span>
                </div>

                {onAccountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pago a cuenta</span>
                    <span className="font-medium">
                      {formatCurrency(onAccountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between border-t pt-4 text-base font-semibold">
                  <span>Total del pago</span>
                  <span>{formatCurrency(totalPayment)}</span>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Métodos de pago
                    </span>
                    <span className="font-medium">
                      {formatCurrency(totalPaymentMethods)}
                    </span>
                  </div>
                </div>

                {totalPayment > 0 && (
                  <div
                    className={cn(
                      "flex justify-between pt-2 text-sm",
                      Math.abs(difference) > 0.01
                        ? "text-destructive"
                        : "text-green-600",
                    )}
                  >
                    <span>Diferencia</span>
                    <span className="font-medium">
                      {formatCurrency(Math.abs(difference))}
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting || totalPayment === 0}
                >
                  {isSubmitting ? "Confirmando..." : "Confirmar pago"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>

      {/* Dialog de método de pago */}
      <Dialog open={openPaymentDialog} onOpenChange={setOpenPaymentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPaymentId ? "Editar" : "Agregar"} método de pago
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Método de pago *</Label>
                <Select value={dialogMethod} onValueChange={setDialogMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Referencia</Label>
                <Input
                  placeholder="Nº transferencia, cheque, etc."
                  value={dialogReference}
                  onChange={(e) => setDialogReference(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Caja *</Label>
              <Select
                value={dialogCashRegisterId}
                onValueChange={setDialogCashRegisterId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar caja" />
                </SelectTrigger>
                <SelectContent>
                  {cashRegisters.map((cr) => (
                    <SelectItem key={cr.id} value={cr.id}>
                      {cr.name}
                      {(cr as Record<string, unknown>).is_default ? " (Principal)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Monto *</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0.00"
                value={dialogAmount}
                onChange={(e) => setDialogAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenPaymentDialog(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSavePaymentMethod}>
              {editingPaymentId ? "Guardar cambios" : "Agregar método"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
