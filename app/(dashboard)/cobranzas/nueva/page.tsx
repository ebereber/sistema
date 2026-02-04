"use client";

import { CustomerDialog } from "@/components/clientes/customer-dialog";
import { Button } from "@/components/ui/button";
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
import { useUserCashRegisters } from "@/hooks/use-user-cash-registers";
import { createCustomerPaymentAction } from "@/lib/actions/customer-payments";
import {
  getPendingSaleById,
  getPendingSales,
  type PaymentAllocation,
  type PaymentMethod as PaymentMethodData,
  type PendingSale,
} from "@/lib/services/customer-payments";
import { getCustomers } from "@/lib/services/customers";
import { getPaymentMethods } from "@/lib/services/payment-methods";
import {
  Calendar,
  Check,
  ChevronRight,
  ChevronsUpDown,
  CreditCard,
  FileText,
  Loader2,
  Plus,
  Receipt,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  tax_id: string | null;
}

interface PaymentMethodOption {
  id: string;
  name: string;
  type: string;
  requires_reference: boolean;
}

interface CashRegister {
  id: string;
  name: string;
}

interface SelectedSale extends PendingSale {
  selected: boolean;
  amountToPay: number;
}

interface AddedPaymentMethod {
  id: string;
  payment_method_id: string | null;
  method_name: string;
  amount: number;
  reference: string;
  cash_register_id: string;
}

export default function NuevaCobranzaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preloadSaleId = searchParams.get("saleId");

  // States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [openCustomerCombobox, setOpenCustomerCombobox] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");

  const [pendingSales, setPendingSales] = useState<SelectedSale[]>([]);
  const [salesSearch, setSalesSearch] = useState("");
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>(
    [],
  );

  const [addedMethods, setAddedMethods] = useState<AddedPaymentMethod[]>([]);

  const [dialogMethodOpen, setDialogMethodOpen] = useState(false);
  const [newMethod, setNewMethod] = useState({
    payment_method_id: "",
    method_name: "",
    amount: "",
    reference: "",
    cash_register_id: "",
  });
  const { cashRegisters, isLoading: isLoadingRegisters } = useUserCashRegisters(
    (registers) => {
      if (registers.length > 0) {
        setNewMethod((prev) => ({
          ...prev,
          cash_register_id: registers[0].id,
        }));
      }
    },
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [customersData, methodsData] = await Promise.all([
          getCustomers(),
          getPaymentMethods({ isActive: true, availability: "VENTAS" }),
        ]);

        setCustomers(
          customersData.map((c) => ({
            id: c.id,
            name: c.name,
            tax_id: c.tax_id,
          })),
        );
        setPaymentMethods(
          methodsData.map((m) => ({
            id: m.id,
            name: m.name,
            type: m.type,
            requires_reference: m.requires_reference,
          })),
        );
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar datos");
      }
    }

    loadData();
  }, []);

  // Load preloaded sale
  useEffect(() => {
    async function loadPreloadedSale() {
      if (!preloadSaleId) return;

      try {
        const sale = await getPendingSaleById(preloadSaleId);
        if (sale && sale.balance > 0) {
          // We need to get the customer from the sale
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const { data: saleData } = await supabase
            .from("sales")
            .select("customer_id, customer:customers(id, name, tax_id)")
            .eq("id", preloadSaleId)
            .single();

          if (saleData?.customer) {
            const customer = Array.isArray(saleData.customer)
              ? saleData.customer[0]
              : saleData.customer;
            setSelectedCustomer(customer as Customer);

            // Load all pending sales for this customer
            const allSales = await getPendingSales(customer.id);
            const salesWithSelection = allSales.map((s) => ({
              ...s,
              selected: s.id === preloadSaleId,
              amountToPay: s.id === preloadSaleId ? s.balance : s.balance,
            }));
            setPendingSales(salesWithSelection);

            // Pre-fill amount in method dialog
            const preloadedSale = salesWithSelection.find(
              (s) => s.id === preloadSaleId,
            );
            if (preloadedSale) {
              setNewMethod((prev) => ({
                ...prev,
                amount: preloadedSale.balance.toFixed(2),
              }));
            }
          }
        }
      } catch (error) {
        console.error("Error loading preloaded sale:", error);
      }
    }

    loadPreloadedSale();
  }, [preloadSaleId]);

  // Load pending sales when customer changes
  useEffect(() => {
    async function loadPendingSales() {
      if (!selectedCustomer) {
        setPendingSales([]);
        return;
      }

      setIsLoadingSales(true);
      try {
        const sales = await getPendingSales(selectedCustomer.id);
        const salesWithSelection = sales.map((s) => ({
          ...s,
          selected: preloadSaleId ? s.id === preloadSaleId : true,
          amountToPay: s.balance,
        }));
        setPendingSales(salesWithSelection);
      } catch (error) {
        console.error("Error loading pending sales:", error);
        toast.error("Error al cargar ventas pendientes");
      } finally {
        setIsLoadingSales(false);
      }
    }

    if (!preloadSaleId || !pendingSales.length) {
      loadPendingSales();
    }
  }, [selectedCustomer, preloadSaleId]);

  // Calculations
  const selectedSales = pendingSales.filter((s) => s.selected);
  const totalSales = selectedSales.reduce((sum, s) => sum + s.amountToPay, 0);
  const totalMethods = addedMethods.reduce((sum, m) => sum + m.amount, 0);
  const difference = totalSales - totalMethods;

  // Handlers
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setOpenCustomerCombobox(false);
    setPendingSales([]);
    setAddedMethods([]);
  };

  const handleCustomerCreated = (customer: { id: string; name: string }) => {
    const newCustomer = { id: customer.id, name: customer.name, tax_id: null };
    setCustomers((prev) => [...prev, newCustomer]);
    setSelectedCustomer(newCustomer);
    setOpenCustomerCombobox(false);
  };

  const handleToggleSale = (saleId: string) => {
    setPendingSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, selected: !s.selected } : s)),
    );
  };

  const handleToggleAllSales = () => {
    const allSelected = pendingSales.every((s) => s.selected);
    setPendingSales((prev) =>
      prev.map((s) => ({ ...s, selected: !allSelected })),
    );
  };

  const handleAmountChange = (saleId: string, value: string) => {
    const numValue = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
    setPendingSales((prev) =>
      prev.map((s) => {
        if (s.id === saleId) {
          const clampedValue = Math.min(Math.max(0, numValue), s.balance);
          return { ...s, amountToPay: clampedValue };
        }
        return s;
      }),
    );
  };

  const handleAddMethod = () => {
    const method = paymentMethods.find(
      (m) => m.id === newMethod.payment_method_id,
    );
    if (!method) return;

    const amount = parseFloat(newMethod.amount.replace(/[^0-9.-]/g, "")) || 0;
    if (amount <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    setAddedMethods((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        payment_method_id: method.id,
        method_name: method.name,
        amount,
        reference: newMethod.reference,
        cash_register_id: newMethod.cash_register_id,
      },
    ]);

    setNewMethod({
      payment_method_id: "",
      method_name: "",
      amount: Math.max(0, difference - amount).toFixed(2),
      reference: "",
      cash_register_id: cashRegisters[0]?.id || "",
    });

    setDialogMethodOpen(false);
  };

  const handleRemoveMethod = (id: string) => {
    setAddedMethods((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      toast.error("Seleccioná un cliente");
      return;
    }

    if (selectedSales.length === 0) {
      toast.error("Seleccioná al menos una venta");
      return;
    }

    if (addedMethods.length === 0) {
      toast.error("Agregá al menos un método de pago");
      return;
    }

    if (Math.abs(difference) > 0.01) {
      toast.error(
        "El total de métodos de pago debe coincidir con el total a cobrar",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const allocations: PaymentAllocation[] = selectedSales.map((s) => ({
        sale_id: s.id,
        amount: s.amountToPay,
      }));

      const methods: PaymentMethodData[] = addedMethods.map((m) => ({
        payment_method_id: m.payment_method_id,
        method_name: m.method_name,
        amount: m.amount,
        reference: m.reference || undefined,
        cash_register_id: m.cash_register_id || undefined,
      }));

      const payment = await createCustomerPaymentAction(
        {
          customer_id: selectedCustomer.id,
          payment_date: `${paymentDate}T12:00:00`,
          notes: notes || undefined,
        },
        allocations,
        methods,
      );

      toast.success("Cobranza registrada correctamente");
      router.push(`/cobranzas/${payment.id}`);
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error("Error al registrar la cobranza");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format helpers
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-AR");
  };

  // Filter customers
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.tax_id && c.tax_id.includes(customerSearch)),
  );

  // Filter sales
  const filteredSales = pendingSales.filter((s) =>
    s.sale_number.toLowerCase().includes(salesSearch.toLowerCase()),
  );

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="gap-4">
          <Link
            href="/cobranzas"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:underline"
          >
            Cobranzas
            <ChevronRight className="size-3" />
          </Link>
          <h1 className="text-3xl font-bold">Nueva cobranza</h1>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Customer card */}
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Customer */}
                <div className="space-y-3">
                  <Label>Cliente</Label>
                  <Popover
                    open={openCustomerCombobox}
                    onOpenChange={setOpenCustomerCombobox}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCustomerCombobox}
                        className="w-full justify-start text-left min-w-0"
                      >
                        <span className="truncate">
                          {selectedCustomer?.name || "Seleccionar cliente"}
                        </span>
                        <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Buscá por nombre o CUIT…"
                          value={customerSearch}
                          onValueChange={setCustomerSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            No se encontraron clientes.
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandGroup>
                              <CustomerDialog
                                mode="create"
                                onSuccess={handleCustomerCreated}
                                trigger={
                                  <div className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground">
                                    <Plus className="h-4 w-4" />
                                    <span className="font-medium">
                                      Nuevo cliente
                                    </span>
                                  </div>
                                }
                              />
                            </CommandGroup>
                          </CommandGroup>
                          <CommandGroup heading="Clientes">
                            {filteredCustomers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                onSelect={() => handleSelectCustomer(customer)}
                                className="flex items-center justify-between"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium">
                                    {customer.name}
                                  </div>
                                  {customer.tax_id && (
                                    <div className="text-sm text-muted-foreground">
                                      CUIT {customer.tax_id}
                                    </div>
                                  )}
                                </div>
                                {selectedCustomer?.id === customer.id && (
                                  <Check className="size-4" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date */}
                <div className="space-y-3">
                  <Label>Fecha de cobro</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-3 md:col-span-2">
                  <Label>Notas</Label>
                  <Input
                    placeholder="Notas del cobro"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending sales card - only show if customer selected */}
          {selectedCustomer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-4" />
                  Ventas pendientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número de comprobante…"
                    value={salesSearch}
                    onChange={(e) => setSalesSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>

                {/* Table */}
                {isLoadingSales ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredSales.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileText className="mb-2 h-8 w-8" />
                    <p>No hay ventas pendientes</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={pendingSales.every((s) => s.selected)}
                              onCheckedChange={handleToggleAllSales}
                            />
                          </TableHead>
                          <TableHead>Nº Comprobante</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                          <TableHead className="text-right">
                            Monto a cobrar
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSales.map((sale) => (
                          <TableRow
                            key={sale.id}
                            data-state={sale.selected ? "selected" : undefined}
                          >
                            <TableCell>
                              <Checkbox
                                checked={sale.selected}
                                onCheckedChange={() =>
                                  handleToggleSale(sale.id)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/ventas/${sale.id}`}
                                className="font-medium text-primary hover:underline"
                                target="_blank"
                              >
                                {sale.sale_number}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(sale.sale_date)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(sale.balance)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="text"
                                value={
                                  sale.selected
                                    ? sale.amountToPay.toFixed(2)
                                    : ""
                                }
                                onChange={(e) =>
                                  handleAmountChange(sale.id, e.target.value)
                                }
                                disabled={!sale.selected}
                                className="ml-auto h-8 w-28 text-right"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment methods card - only show if customer selected */}
          {selectedCustomer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="size-4" />
                  Método de cobro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setNewMethod((prev) => ({
                      ...prev,
                      amount: difference > 0 ? difference.toFixed(2) : "",
                    }));
                    setDialogMethodOpen(true);
                  }}
                  disabled={selectedSales.length === 0}
                >
                  <Plus className="mr-2 size-4" />
                  Agregar método de cobro
                </Button>

                {/* Added methods list */}
                {addedMethods.length > 0 && (
                  <div className="space-y-2">
                    {addedMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <div className="font-medium">
                            {method.method_name}
                          </div>
                          {method.reference && (
                            <div className="text-xs text-muted-foreground">
                              Ref: {method.reference}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatCurrency(method.amount)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveMethod(method.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Summary */}
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
                <span className="text-muted-foreground">Total ventas</span>
                <span className="font-medium">
                  {formatCurrency(totalSales)}
                </span>
              </div>

              <div className="mt-4 flex justify-between border-t pt-4 text-base font-semibold">
                <span>Total del cobro</span>
                <span>{formatCurrency(totalSales)}</span>
              </div>

              {selectedCustomer && (
                <>
                  <div className="space-y-2 pt-2 text-muted-foreground">
                    <div className="flex justify-between text-sm">
                      <span>Métodos de pago</span>
                      <span className="font-medium">
                        {formatCurrency(totalMethods)}
                      </span>
                    </div>
                  </div>

                  {Math.abs(difference) > 0.01 && (
                    <div className="flex justify-between pt-2 text-sm text-destructive">
                      <span>Diferencia</span>
                      <span className="font-medium">
                        {formatCurrency(difference)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button
                type="button"
                size="lg"
                className="w-full text-base font-medium"
                disabled={
                  !selectedCustomer ||
                  selectedSales.length === 0 ||
                  addedMethods.length === 0 ||
                  Math.abs(difference) > 0.01 ||
                  isSubmitting
                }
                onClick={handleSubmit}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirmar cobro
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Add payment method dialog */}
      <Dialog open={dialogMethodOpen} onOpenChange={setDialogMethodOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar método de pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Método de pago *</Label>
              <Select
                value={newMethod.payment_method_id}
                onValueChange={(value) => {
                  const method = paymentMethods.find((m) => m.id === value);
                  setNewMethod((prev) => ({
                    ...prev,
                    payment_method_id: value,
                    method_name: method?.name || "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Monto *</Label>
              <Input
                type="text"
                value={newMethod.amount}
                onChange={(e) =>
                  setNewMethod((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>

            <div className="space-y-3">
              <Label>Referencia</Label>
              <Input
                value={newMethod.reference}
                onChange={(e) =>
                  setNewMethod((prev) => ({
                    ...prev,
                    reference: e.target.value,
                  }))
                }
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-3">
              <Label>Caja *</Label>
              <Select
                value={newMethod.cash_register_id}
                onValueChange={(value) =>
                  setNewMethod((prev) => ({ ...prev, cash_register_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar caja" />
                </SelectTrigger>
                <SelectContent>
                  {cashRegisters.map((register) => (
                    <SelectItem key={register.id} value={register.id}>
                      {register.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogMethodOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddMethod}
              disabled={!newMethod.payment_method_id || !newMethod.amount}
            >
              Agregar método
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
