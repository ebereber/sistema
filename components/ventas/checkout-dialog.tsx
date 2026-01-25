"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getPaymentMethods } from "@/lib/services/payment-methods";
import {
  createSale,
  type PaymentInsert,
  type SaleItemInsert,
} from "@/lib/services/sales";
import { parseArgentineCurrency } from "@/lib/utils/currency";
import {
  calculateCartTotals,
  calculateItemTotal,
  formatPrice,
  type CartItem,
  type GlobalDiscount,
  type SelectedCustomer,
} from "@/lib/validations/sale";
import {
  Banknote,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  FileCheck,
  Gift,
  ListTodo,
  Loader2,
  Mail,
  Pencil,
  Printer,
  Smartphone,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CurrencyInput } from "../ui/currency-input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "../ui/item";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  customer: SelectedCustomer;
  globalDiscount: GlobalDiscount | null;
  note: string;
  saleDate: Date;
  onSuccess: (saleNumber: string) => void;
}

type CheckoutView =
  | "payment-list"
  | "payment-form"
  | "split-payment"
  | "confirmation";

interface SplitPayment {
  id: string;
  methodId: string;
  methodName: string;
  amount: number;
  reference?: string;
}
const ICON_MAP = {
  Banknote: Banknote,
  FileCheck: FileCheck,
  CreditCard: CreditCard,
  Building2: Building2,
  DollarSign: DollarSign,
  Smartphone: Smartphone, // Para QR
} as const;

export function CheckoutDialog({
  open,
  onOpenChange,
  cartItems,
  customer,
  globalDiscount,
  note,
  saleDate,
  onSuccess,
}: CheckoutDialogProps) {
  // Calculate totals from cart
  const totals = calculateCartTotals(cartItems, globalDiscount);
  const { subtotal, taxes: tax, total } = totals;

  const [selectedVoucher, setSelectedVoucher] = useState("COMPROBANTE_X");
  const [isPending, setIsPending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentView, setCurrentView] = useState<CheckoutView>("payment-list");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    string | null
  >(null);
  const [saleNumber, setSaleNumber] = useState<string | null>(null);

  // Split payment states
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  const [currentSplitAmount, setCurrentSplitAmount] = useState("");
  const [isAddingPartialPayment, setIsAddingPartialPayment] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<
    Array<{
      id: string;
      name: string;
      icon: React.ComponentType<{ className?: string }>;
      shortcut: string;
    }>
  >([]);

  const [isLoadingMethods, setIsLoadingMethods] = useState(true);

  useEffect(() => {
    async function loadPaymentMethods() {
      setIsLoadingMethods(true);
      try {
        const methods = await getPaymentMethods({
          isActive: true,
          availability: "VENTAS", // o 'VENTAS_Y_COMPRAS'
        });

        // Mapear a formato del checkout
        const mappedMethods = methods.map((m, index) => {
          // Mapear el icono
          const Icon = ICON_MAP[m.icon as keyof typeof ICON_MAP] || DollarSign;

          return {
            id: m.id, // ← UUID real
            name: m.name,
            icon: Icon,
            shortcut: (index + 1).toString(),
          };
        });

        setPaymentMethods(mappedMethods);
      } catch (error) {
        console.error("Error cargando medios de pago:", error);
        toast.error("Error al cargar medios de pago");
      } finally {
        setIsLoadingMethods(false);
      }
    }

    if (open) {
      loadPaymentMethods();
    }
  }, [open]);

  const handlePaymentMethodClick = (methodId: string) => {
    if (currentView === "split-payment") {
      const amount = parseArgentineCurrency(currentSplitAmount);
      const method = paymentMethods.find((m) => m.id === methodId);

      if (method && amount > 0 && amount <= remaining) {
        const newPayment: SplitPayment = {
          id: Math.random().toString(36).substr(2, 9),
          methodId: method.id,
          methodName: method.name,
          amount: amount,
        };

        const newSplitPayments = [...splitPayments, newPayment];
        setSplitPayments(newSplitPayments);

        // Calcular nuevo restante y autocompletar
        const newTotalPaid = newSplitPayments.reduce(
          (sum, p) => sum + p.amount,
          0,
        );
        const newRemaining = total - newTotalPaid;

        if (newRemaining > 0) {
          setCurrentSplitAmount(newRemaining.toFixed(2));
        } else {
          setCurrentSplitAmount("");
        }
      }
    } else {
      setSelectedPaymentMethod(methodId);
      setCurrentView("payment-form");
    }
  };

  const handleSplitPayment = () => {
    setCurrentView("split-payment");
    setSplitPayments([]);
    // El primer input debe estar vacío
    setCurrentSplitAmount("");
  };

  const handleRemoveSplitPayment = (id: string) => {
    const newSplitPayments = splitPayments.filter((p) => p.id !== id);
    setSplitPayments(newSplitPayments);

    // Recalcular y autocompletar el restante
    const newTotalPaid = newSplitPayments.reduce((sum, p) => sum + p.amount, 0);
    const newRemaining = total - newTotalPaid;
    setCurrentSplitAmount(newRemaining.toFixed(2));
  };

  const handleEditSplitPayments = () => {
    // Volver al último pago para editarlo
    const lastPayment = splitPayments[splitPayments.length - 1];
    if (lastPayment) {
      setSplitPayments(splitPayments.slice(0, -1));
      setCurrentSplitAmount(lastPayment.amount.toString());
    }
  };

  const handleBack = () => {
    if (currentView === "payment-form") {
      setCurrentView("payment-list");
      setSelectedPaymentMethod(null);
    } else if (currentView === "split-payment") {
      if (splitPayments.length > 0) {
        // Si hay pagos, volver a la lista principal preguntando
        setSplitPayments([]);
      }
      setCurrentView("payment-list");
    }
  };

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);

      // Preparar datos de la venta
      const saleData = {
        customer_id: customer.id || null,
        subtotal,
        discount: totals.itemDiscounts + totals.globalDiscount,
        tax,
        total,
        notes: note || null,
        status: (isPending ? "PENDING" : "COMPLETED") as
          | "COMPLETED"
          | "PENDING"
          | "CANCELLED",
        voucher_type: selectedVoucher,
        sale_date: saleDate.toISOString(),
      };

      // Preparar items
      const items: SaleItemInsert[] = cartItems.map((item) => ({
        product_id: item.productId,
        description: item.name,
        sku: item.sku || null,
        quantity: item.quantity,
        unit_price: item.price,
        discount:
          item.discount?.type === "percentage"
            ? (item.price * item.quantity * item.discount.value) / 100
            : item.discount?.value || 0,
        tax_rate: item.taxRate,
        total: calculateItemTotal(item),
      }));

      // Preparar pagos
      const payments: PaymentInsert[] =
        currentView === "split-payment"
          ? splitPayments.map((p) => ({
              payment_method_id: p.methodId,
              method_name: p.methodName,
              amount: p.amount,
              reference: p.reference || null,
            }))
          : selectedPaymentMethod
            ? [
                {
                  payment_method_id: selectedPaymentMethod,
                  method_name:
                    paymentMethods.find((m) => m.id === selectedPaymentMethod)
                      ?.name || "",
                  amount: total,
                  reference: null,
                },
              ]
            : [];

      // Guardar venta
      const sale = await createSale(saleData, items, payments);

      setSaleNumber(sale.sale_number);
      setCurrentView("confirmation");

      // Notificar éxito después de mostrar confirmación
      setTimeout(() => {
        onSuccess(sale.sale_number);
      }, 2000);
    } catch (error: unknown) {
      console.error("Error al crear venta:", error);
      toast.error("Error al confirmar la venta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewSale = () => {
    handleOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCurrentView("payment-list");
      setSelectedPaymentMethod(null);
      setSaleNumber(null);
      setSplitPayments([]);
      setCurrentSplitAmount("");
      setIsSubmitting(false);
      setIsPending(false);
    }
    onOpenChange(open);
  };

  const selectedMethod = paymentMethods.find(
    (m) => m.id === selectedPaymentMethod,
  );

  // Calcular totales para pago dividido
  const totalPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = total - totalPaid;

  const currentAmount = parseArgentineCurrency(currentSplitAmount);
  const isAmountValid = currentAmount > 0 && currentAmount <= remaining;
  const isPaymentComplete = Math.abs(remaining) < 0.01; // Usar tolerancia para decimales

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] w-full">
        {currentView === "confirmation" ? (
          <>
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
              <div className="flex flex-col items-center space-y-6 text-center">
                <div className="zoom-in-50 flex h-16 w-16 animate-in items-center justify-center rounded-full bg-green-500/10 fill-mode-both duration-300">
                  <Check
                    className="h-10 w-10 text-green-600"
                    strokeWidth={2.5}
                  />
                </div>

                <div className="fade-in slide-in-from-bottom-2 animate-in space-y-2 fill-mode-both delay-100 duration-300">
                  <h2 className="text-2xl font-semibold">¡Venta confirmada!</h2>
                  <p className="text-lg font-medium text-muted-foreground">
                    {saleNumber}
                  </p>
                  <p className="text-3xl font-bold">{formatPrice(total)}</p>
                </div>

                <div className="fade-in slide-in-from-bottom-2 flex w-full max-w-sm animate-in flex-col gap-4 fill-mode-both pt-2 delay-200 duration-300">
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" className="flex-1">
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <svg
                        className="mr-2 h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 448 512"
                      >
                        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                      </svg>
                      WhatsApp
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex justify-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                    >
                      <Download className="mr-1.5 h-4 w-4" />
                      Descargar PDF
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                    >
                      <Gift className="mr-1.5 h-4 w-4" />
                      Ticket de cambio
                    </Button>
                    <Link href="/ventas/348758734">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                      >
                        <ExternalLink className="mr-1.5 h-4 w-4" />
                        Ver detalles
                      </Button>
                    </Link>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  onClick={handleNewSale}
                  className="fade-in animate-in fill-mode-both delay-500 duration-300"
                >
                  Nueva venta
                  <kbd className="ml-2 hidden h-5 min-w-5 select-none items-center justify-center gap-1 rounded-sm border border-muted-foreground/30 px-1 font-sans text-xs font-medium text-muted-foreground md:block">
                    Enter
                  </kbd>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="gap-0.5 p-4">
              <SheetTitle className="text-base">
                Confirmar venta a {customer.name}
              </SheetTitle>
            </SheetHeader>

            <form
              className="flex flex-1 flex-col overflow-hidden px-4"
              onSubmit={async (e) => {
                e.preventDefault();
                await handleConfirm();
              }}
            >
              <div className="flex flex-1 flex-col gap-6 overflow-y-auto pt-0.5 lg:flex-row">
                {/* Panel izquierdo */}
                <div className="flex-1 px-0.5">
                  <Card className="gap-0 py-4">
                    {/* Vista: Lista de medios de pago */}
                    {currentView === "payment-list" && (
                      <>
                        <CardHeader className="px-4">
                          <CardDescription>
                            Seleccioná el medio de pago
                          </CardDescription>
                          <div className="col-start-2 row-span-2 row-start-1 mr-2 flex items-center gap-2 self-start justify-self-end">
                            <Checkbox
                              id="fullAmountPending"
                              checked={isPending}
                              onCheckedChange={(checked) =>
                                setIsPending(checked === true)
                              }
                            />
                            <Label
                              htmlFor="fullAmountPending"
                              className="cursor-pointer text-sm leading-none"
                            >
                              Pendiente de pago
                            </Label>
                          </div>
                        </CardHeader>

                        <CardContent className="p-2">
                          <ItemGroup role="list">
                            {paymentMethods.map((method) => (
                              <Item
                                variant="default"
                                key={method.id}
                                onClick={() =>
                                  handlePaymentMethodClick(method.id)
                                }
                              >
                                <ItemMedia variant="icon">
                                  <method.icon className="size-4" />
                                </ItemMedia>
                                <ItemContent>
                                  <ItemTitle>{method.name}</ItemTitle>
                                </ItemContent>
                                <ItemActions>
                                  <ChevronRight className="size-4 text-muted-foreground" />
                                </ItemActions>
                              </Item>
                            ))}

                            <Item
                              className="mt-2"
                              variant="outline"
                              onClick={handleSplitPayment}
                            >
                              <ItemMedia>
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted">
                                  <ListTodo className="size-5" />
                                </div>
                              </ItemMedia>
                              <ItemContent>
                                <ItemTitle>Dividir pago</ItemTitle>
                              </ItemContent>
                              <ItemActions>
                                <kbd className="pointer-events-none hidden h-5 min-w-5 select-none items-center justify-center gap-1 rounded-sm border border-muted-foreground/30 px-1 font-sans text-xs font-medium text-muted-foreground md:block">
                                  0
                                </kbd>
                                <ChevronRight className="size-4 text-muted-foreground" />
                              </ItemActions>
                            </Item>
                          </ItemGroup>
                        </CardContent>
                      </>
                    )}

                    {/* Vista: Pago dividido */}
                    {currentView === "split-payment" && (
                      <>
                        <CardHeader className="flex flex-row items-center justify-between px-4">
                          <CardDescription className="flex items-center gap-1">
                            Pago {splitPayments.length + 1}
                          </CardDescription>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBack}
                          >
                            <ChevronLeft className="size-4" />
                            Atrás
                          </Button>
                        </CardHeader>

                        <CardContent className="space-y-4 px-4">
                          {/* Mostrar pagos anteriores */}
                          {splitPayments.length > 0 && (
                            <div className="space-y-2">
                              {splitPayments.map((payment, index) => (
                                <Item
                                  key={payment.id}
                                  variant="muted"
                                  className="bg-muted/50"
                                >
                                  <ItemMedia variant="icon">
                                    {(() => {
                                      const method = paymentMethods.find(
                                        (m) => m.id === payment.methodId,
                                      );
                                      const Icon = method?.icon || DollarSign;
                                      return <Icon className="h-4 w-4" />;
                                    })()}
                                  </ItemMedia>
                                  <ItemContent>
                                    <ItemTitle>
                                      <span className="text-muted-foreground">
                                        Pago {index + 1}
                                      </span>{" "}
                                      {payment.methodName}
                                    </ItemTitle>
                                  </ItemContent>
                                  <ItemActions>
                                    <span className="font-medium">
                                      {formatPrice(payment.amount)}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-6 text-muted-foreground hover:text-destructive"
                                      onClick={() =>
                                        handleRemoveSplitPayment(payment.id)
                                      }
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </ItemActions>
                                </Item>
                              ))}

                              <div className="mt-2 flex justify-between border-t pt-2">
                                <span className="text-muted-foreground">
                                  Restante:
                                </span>
                                <span className="text-lg font-bold">
                                  {formatPrice(remaining)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Formulario de nuevo pago */}
                          {!isPaymentComplete && (
                            <div className="fade-in animate-in space-y-6 duration-300">
                              <div className="space-y-2">
                                <Label>Monto a pagar</Label>
                                <CurrencyInput
                                  type="text"
                                  inputMode="numeric"
                                  value={currentSplitAmount}
                                  onChange={(e) =>
                                    setCurrentSplitAmount(e.target.value)
                                  }
                                  placeholder="$"
                                  className="h-10 font-medium md:text-lg"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Total restante: {formatPrice(remaining)}
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label>Seleccionar método</Label>
                                <fieldset
                                  className="m-0 border-0 p-0"
                                  disabled={!isAmountValid}
                                  style={
                                    !isAmountValid
                                      ? {
                                          pointerEvents: "none",
                                          opacity: 0.5,
                                          filter: "grayscale(1)",
                                        }
                                      : {}
                                  }
                                >
                                  <ItemGroup role="list">
                                    {paymentMethods.map((method) => (
                                      <Item
                                        variant="default"
                                        key={method.id}
                                        onClick={() =>
                                          handlePaymentMethodClick(method.id)
                                        }
                                      >
                                        <ItemMedia variant="icon">
                                          <method.icon className="size-4" />
                                        </ItemMedia>
                                        <ItemContent>
                                          <ItemTitle>{method.name}</ItemTitle>
                                        </ItemContent>
                                        <ItemActions>
                                          <ChevronRight className="size-4 text-muted-foreground" />
                                        </ItemActions>
                                      </Item>
                                    ))}
                                  </ItemGroup>
                                </fieldset>
                              </div>

                              {splitPayments.length > 0 && (
                                <div className="pt-4">
                                  <Button
                                    variant="outline"
                                    className="w-full"
                                    type="button"
                                    onClick={() =>
                                      setIsAddingPartialPayment(true)
                                    }
                                  >
                                    Marcar como pago parcial
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Vista final de resumen */}
                          {isPaymentComplete && splitPayments.length > 0 && (
                            <div className="space-y-2">
                              <ItemGroup role="list" className="space-y-2">
                                {splitPayments.map((payment) => {
                                  const method = paymentMethods.find(
                                    (m) => m.id === payment.methodId,
                                  );
                                  const Icon = method?.icon || DollarSign;
                                  return (
                                    <Item
                                      key={payment.id}
                                      variant="muted"
                                      className="bg-muted/50"
                                    >
                                      <ItemMedia variant="icon">
                                        <Icon className="h-4 w-4" />
                                      </ItemMedia>
                                      <ItemContent>
                                        <ItemTitle>
                                          {payment.methodName}
                                        </ItemTitle>
                                      </ItemContent>
                                      <ItemActions>
                                        <span className="font-medium">
                                          {formatPrice(payment.amount)}
                                        </span>
                                      </ItemActions>
                                    </Item>
                                  );
                                })}
                              </ItemGroup>
                            </div>
                          )}
                        </CardContent>
                      </>
                    )}

                    {/* Vista: Formulario de pago único */}
                    {currentView === "payment-form" && selectedMethod && (
                      <>
                        <CardHeader className="flex flex-row items-center justify-between px-4">
                          <CardDescription>
                            {selectedMethod.name}
                          </CardDescription>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBack}
                          >
                            <ChevronLeft className="size-4" />
                            Editar
                          </Button>
                        </CardHeader>

                        <CardContent className="space-y-4 px-4">
                          <div className="rounded-lg border p-2">
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                                <selectedMethod.icon className="size-5" />
                              </div>
                              <div>
                                <h3 className="flex w-fit items-center gap-2 text-sm font-medium leading-snug">
                                  {selectedMethod.name}
                                </h3>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </>
                    )}
                  </Card>
                </div>

                {/* Panel derecho - Resumen */}
                <div className="sticky top-0 flex w-full shrink-0 flex-col space-y-6 self-start lg:max-w-md">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Principal</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto gap-1.5 p-0 text-muted-foreground"
                    >
                      <Pencil className="size-3.5" />
                      <span className="sr-only">Editar ubicación</span>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <RadioGroup
                      value={selectedVoucher}
                      onValueChange={setSelectedVoucher}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex gap-4">
                        <Label
                          htmlFor="voucher-COMPROBANTE_X"
                          className="flex w-full cursor-pointer gap-3 rounded-md border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:has-[:checked]:bg-primary/10"
                        >
                          <RadioGroupItem
                            value="COMPROBANTE_X"
                            id="voucher-COMPROBANTE_X"
                            className="mt-px"
                          />
                          <div className="flex flex-1 flex-col gap-1.5 leading-snug">
                            <div className="text-sm font-medium">
                              Comprobante X
                            </div>
                          </div>
                          <kbd className="pointer-events-none hidden h-5 min-w-5 select-none items-center justify-center gap-1 rounded-sm border border-muted-foreground/30 px-1 font-sans text-xs font-medium text-muted-foreground md:block">
                            C
                          </kbd>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA</span>
                      <span>{formatPrice(tax)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pb-2">
                    <Button
                      type="submit"
                      size="lg"
                      className="h-12 w-full text-base font-medium"
                      disabled={
                        isSubmitting ||
                        (currentView === "payment-form" &&
                          !selectedPaymentMethod) ||
                        (currentView === "split-payment" && !isPaymentComplete)
                      }
                    >
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isSubmitting ? "Confirmando..." : "Confirmar venta"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
