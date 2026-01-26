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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getMainLocation } from "@/lib/services/locations";
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
import Image from "next/image";
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
  | "card-select"
  | "card-form"
  | "reference-form"
  | "split-payment"
  | "confirmation";

const CARD_TYPES = [
  { id: 'visa-debito', name: 'Visa Débito', brand: 'visa', type: 'DEBITO', icon: '/tarjetas/visa.svg' },
  { id: 'visa-credito', name: 'Visa Crédito', brand: 'visa', type: 'CREDITO', icon: '/tarjetas/visa.svg' },
  { id: 'master-debito', name: 'Mastercard Débito', brand: 'master', type: 'DEBITO', icon: '/tarjetas/master.svg' },
  { id: 'master-credito', name: 'Mastercard Crédito', brand: 'master', type: 'CREDITO', icon: '/tarjetas/master.svg' },
  { id: 'cabal-debito', name: 'Cabal Débito', brand: 'cabal', type: 'DEBITO', icon: '/tarjetas/cabal.svg' },
  { id: 'cabal-credito', name: 'Cabal Crédito', brand: 'cabal', type: 'CREDITO', icon: '/tarjetas/cabal.svg' },
  { id: 'naranja', name: 'Naranja', brand: 'naranja', type: 'CREDITO', icon: '/tarjetas/naranja.svg' },
  { id: 'american', name: 'American Express', brand: 'american', type: 'CREDITO', icon: '/tarjetas/american.svg' },
] as const;

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
  const [location, setLocation] = useState<{ id: string; name: string } | null>(
    null,
  );

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
      type: string;
      requires_reference: boolean;
    }>
  >([]);

  // Card payment states
  const [selectedCardType, setSelectedCardType] = useState<typeof CARD_TYPES[number] | null>(null);
  const [cardLote, setCardLote] = useState("");
  const [cardCupon, setCardCupon] = useState("");

  // Transfer payment state
  const [paymentReference, setPaymentReference] = useState("");

  // Split payment with card/reference states
  const [pendingSplitAmount, setPendingSplitAmount] = useState<number>(0);
  const [isFromSplitPayment, setIsFromSplitPayment] = useState(false);

  const [isLoadingMethods, setIsLoadingMethods] = useState(true);

  // Check if there are any discounts
  const hasItemDiscounts = totals.itemDiscounts > 0;
  const hasGlobalDiscount = totals.globalDiscount > 0;

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
            id: m.id,
            name: m.name,
            icon: Icon,
            shortcut: (index + 1).toString(),
            type: m.type,
            requires_reference: m.requires_reference,
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

  useEffect(() => {
    async function loadLocation() {
      const loc = await getMainLocation();
      setLocation(loc);
    }
    if (open) {
      loadLocation();
    }
  }, [open]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentView("payment-list");
      setSelectedPaymentMethod(null);
      setSaleNumber(null);
      setSplitPayments([]);
      setCurrentSplitAmount("");
      setIsPending(false);
      setSelectedVoucher("COMPROBANTE_X");
      setIsSubmitting(false);
      // Reset card and reference states
      setSelectedCardType(null);
      setCardLote("");
      setCardCupon("");
      setPaymentReference("");
      // Reset split payment with reference states
      setPendingSplitAmount(0);
      setIsFromSplitPayment(false);
    }
  }, [open]);

  const handlePaymentMethodClick = (methodId: string) => {
    if (currentView === "split-payment") {
      if (remaining <= 0) return;
      const amount = parseArgentineCurrency(currentSplitAmount);
      const method = paymentMethods.find((m) => m.id === methodId);

      if (method && amount > 0 && amount <= remaining) {
        // Si requiere referencia, ir al formulario correspondiente
        if (method.requires_reference) {
          setIsFromSplitPayment(true);
          setPendingSplitAmount(amount);
          setSelectedPaymentMethod(methodId);

          if (method.type === "TARJETA") {
            setCurrentView("card-select");
          } else {
            setCurrentView("reference-form");
          }
          return;
        }

        // Si no requiere referencia, agregar pago directamente
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
      const method = paymentMethods.find((m) => m.id === methodId);
      if (!method) return;

      setSelectedPaymentMethod(methodId);

      // Si requiere referencia, mostrar formulario según tipo
      if (method.requires_reference) {
        if (method.type === "TARJETA") {
          setCurrentView("card-select");
        } else {
          setCurrentView("reference-form");
        }
      } else {
        // No requiere referencia, ir directo a confirmación
        setCurrentView("payment-form");
      }
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

  const handleCompleteSplitPaymentWithReference = () => {
    const method = paymentMethods.find((m) => m.id === selectedPaymentMethod);
    if (!method) return;

    const reference = selectedCardType
      ? `${selectedCardType.name} - Lote: ${cardLote}, Cupón: ${cardCupon}`
      : paymentReference || undefined;

    const newPayment: SplitPayment = {
      id: Math.random().toString(36).substr(2, 9),
      methodId: method.id,
      methodName: selectedCardType
        ? `${method.name} - ${selectedCardType.name}`
        : method.name,
      amount: pendingSplitAmount,
      reference,
    };

    const newSplitPayments = [...splitPayments, newPayment];
    setSplitPayments(newSplitPayments);

    const newTotalPaid = newSplitPayments.reduce((sum, p) => sum + p.amount, 0);
    const newRemaining = total - newTotalPaid;

    // Limpiar estados
    setSelectedPaymentMethod(null);
    setSelectedCardType(null);
    setCardLote("");
    setCardCupon("");
    setPaymentReference("");
    setPendingSplitAmount(0);

    if (newRemaining > 0) {
      setCurrentSplitAmount(newRemaining.toFixed(2));
    } else {
      setCurrentSplitAmount("");
    }

    setCurrentView("split-payment");
    setIsFromSplitPayment(false);
  };

  const handleBack = () => {
    // Si venimos de split payment, volver a split-payment
    if (isFromSplitPayment) {
      if (currentView === "card-form") {
        setCurrentView("card-select");
        setCardLote("");
        setCardCupon("");
      } else if (
        currentView === "card-select" ||
        currentView === "reference-form"
      ) {
        setCurrentView("split-payment");
        setSelectedPaymentMethod(null);
        setSelectedCardType(null);
        setPaymentReference("");
        setPendingSplitAmount(0);
        setIsFromSplitPayment(false);
      }
      return;
    }

    // Lógica existente para pago único
    const method = paymentMethods.find((m) => m.id === selectedPaymentMethod);

    if (currentView === "payment-form") {
      // Check if we came from card-form or reference-form
      if (method?.type === "TARJETA" && selectedCardType) {
        setCurrentView("card-form");
      } else if (method?.requires_reference && paymentReference) {
        setCurrentView("reference-form");
      } else {
        setCurrentView("payment-list");
        setSelectedPaymentMethod(null);
        setSelectedCardType(null);
        setCardLote("");
        setCardCupon("");
        setPaymentReference("");
      }
    } else if (currentView === "card-form") {
      setCurrentView("card-select");
      setCardLote("");
      setCardCupon("");
    } else if (currentView === "card-select") {
      setCurrentView("payment-list");
      setSelectedPaymentMethod(null);
      setSelectedCardType(null);
    } else if (currentView === "reference-form") {
      setCurrentView("payment-list");
      setSelectedPaymentMethod(null);
      setPaymentReference("");
    } else if (currentView === "split-payment") {
      if (splitPayments.length > 0) {
        // SI ESTAMOS EN PAGO 2, 3, etc:
        // Borramos el último pago y volvemos a poner su monto en el input para "editarlo"
        const lastPayment = splitPayments[splitPayments.length - 1];
        const newPayments = splitPayments.slice(0, -1);
        setSplitPayments(newPayments);
        setCurrentSplitAmount(lastPayment.amount.toString());
      } else {
        // SI ESTAMOS EN PAGO 1: Volver al menú principal
        setCurrentView("payment-list");
      }
    }
  };

  const handleConfirm = async () => {
    if (!location) {
      toast.error("No se pudo obtener la ubicación");
      return;
    }
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

      // Build payment reference
      const buildPaymentReference = (): string | null => {
        if (selectedCardType) {
          return `${selectedCardType.name} - Lote: ${cardLote}, Cupón: ${cardCupon}`;
        }
        if (paymentReference) {
          return paymentReference;
        }
        return null;
      };

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
                  reference: buildPaymentReference(),
                },
              ]
            : [];

      // Guardar venta
      const sale = await createSale(saleData, items, payments, location.id);

      setSaleNumber(sale.sale_number);
      setCurrentView("confirmation");
    } catch (error: unknown) {
      console.error("Error al crear venta:", error);
      toast.error("Error al confirmar la venta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewSale = () => {
    if (saleNumber) {
      onSuccess(saleNumber);
    }
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && saleNumber) {
      // Si se cierra con venta confirmada, notificar éxito
      onSuccess(saleNumber);
    }
    onOpenChange(newOpen);
  };

  const selectedMethod = paymentMethods.find(
    (m) => m.id === selectedPaymentMethod,
  );

  // Calcular totales para pago dividido
  const totalPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);

  const currentAmount = parseArgentineCurrency(currentSplitAmount);
  const isAmountValid = currentAmount > 0 && currentAmount <= remaining;
  const isPaymentComplete = Math.abs(remaining) < 0.1; // Usar tolerancia para decimales

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] w-full">
        <SheetDescription className="hidden"></SheetDescription>
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
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleBack}
                          >
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            {isPaymentComplete
                              ? "Editar"
                              : splitPayments.length === 0
                                ? "Atrás"
                                : "Atrás"}
                          </Button>
                        </CardHeader>

                        <CardContent className="space-y-4 px-4">
                          {/* Mostrar pagos anteriores */}
                          {!isPaymentComplete && splitPayments.length > 0 && (
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
                                  value={currentSplitAmount}
                                  onValueChange={(value) =>
                                    setCurrentSplitAmount(value.toFixed(2))
                                  }
                                  placeholder="$"
                                  className="h-10 font-medium md:text-lg"
                                  isAllowed={(values) =>
                                    values.floatValue == null ||
                                    values.floatValue <= remaining
                                  }
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

                    {/* Vista: Selección de tipo de tarjeta */}
                    {currentView === "card-select" && (
                      <>
                        <CardHeader className="flex flex-row items-center justify-between px-4">
                          <CardDescription>
                            Seleccioná el tipo de tarjeta
                          </CardDescription>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleBack}
                          >
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Atrás
                          </Button>
                        </CardHeader>

                        <CardContent className="space-y-4 px-4">
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {CARD_TYPES.map((card) => (
                              <button
                                key={card.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCardType(card);
                                  setCurrentView("card-form");
                                }}
                                className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:border-primary hover:bg-muted/50"
                              >
                                <Image
                                  src={card.icon}
                                  alt={card.name}
                                  width={48}
                                  height={32}
                                  className="h-8 w-auto object-contain"
                                />
                                <span className="text-center text-xs font-medium">
                                  {card.name}
                                </span>
                              </button>
                            ))}
                          </div>

                          <Separator />

                          <div>
                            <p className="mb-3 text-sm text-muted-foreground">
                              O pagar con QR / Transferencia
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                // Find the transfer payment method and switch to it
                                const transferMethod = paymentMethods.find(
                                  (m) => m.type === "TRANSFERENCIA"
                                );
                                if (transferMethod) {
                                  setSelectedPaymentMethod(transferMethod.id);
                                  setCurrentView("reference-form");
                                }
                              }}
                            >
                              <Smartphone className="mr-2 h-4 w-4" />
                              QR / Transferencia
                            </Button>
                          </div>
                        </CardContent>
                      </>
                    )}

                    {/* Vista: Formulario de tarjeta (lote y cupón) */}
                    {currentView === "card-form" && selectedCardType && (
                      <>
                        <CardHeader className="flex flex-row items-center justify-between px-4">
                          <CardDescription className="flex items-center gap-2">
                            <Image
                              src={selectedCardType.icon}
                              alt={selectedCardType.name}
                              width={32}
                              height={20}
                              className="h-5 w-auto object-contain"
                            />
                            {selectedCardType.name}
                          </CardDescription>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleBack}
                          >
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Cambiar
                          </Button>
                        </CardHeader>

                        <CardContent className="space-y-4 px-4">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="cardLote">Lote</Label>
                              <input
                                id="cardLote"
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                value={cardLote}
                                onChange={(e) => {
                                  const value = e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 4);
                                  setCardLote(value);
                                }}
                                placeholder="0001"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-lg ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                autoFocus
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="cardCupon">Cupón</Label>
                              <input
                                id="cardCupon"
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                value={cardCupon}
                                onChange={(e) => {
                                  const value = e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 4);
                                  setCardCupon(value);
                                  // Auto-advance cuando ambos tienen 4 dígitos
                                  if (value.length === 4 && cardLote.length === 4) {
                                    setTimeout(() => {
                                      if (isFromSplitPayment) {
                                        handleCompleteSplitPaymentWithReference();
                                      } else {
                                        setCurrentView("payment-form");
                                      }
                                    }, 300);
                                  }
                                }}
                                placeholder="0001"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-lg ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              />
                            </div>
                          </div>

                          <Button
                            type="button"
                            className="w-full"
                            disabled={
                              cardLote.length !== 4 || cardCupon.length !== 4
                            }
                            onClick={() => {
                              if (isFromSplitPayment) {
                                handleCompleteSplitPaymentWithReference();
                              } else {
                                setCurrentView("payment-form");
                              }
                            }}
                          >
                            {isFromSplitPayment ? "Agregar pago" : "Continuar"}
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </CardContent>
                      </>
                    )}

                    {/* Vista: Formulario de referencia (transferencia) */}
                    {currentView === "reference-form" && (
                      <>
                        <CardHeader className="flex flex-row items-center justify-between px-4">
                          <CardDescription>
                            Referencia de la transferencia
                          </CardDescription>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleBack}
                          >
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Atrás
                          </Button>
                        </CardHeader>

                        <CardContent className="space-y-4 px-4">
                          <div className="space-y-2">
                            <Label htmlFor="paymentReference">
                              Comprobante / Referencia
                            </Label>
                            <input
                              id="paymentReference"
                              type="text"
                              value={paymentReference}
                              onChange={(e) => setPaymentReference(e.target.value)}
                              placeholder="Ej: CBU, número de operación..."
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              autoFocus
                            />
                            <p className="text-xs text-muted-foreground">
                              Opcional: ingresá un dato para identificar la transferencia
                            </p>
                          </div>

                          <Button
                            type="button"
                            className="w-full"
                            onClick={() => {
                              if (isFromSplitPayment) {
                                handleCompleteSplitPaymentWithReference();
                              } else {
                                setCurrentView("payment-form");
                              }
                            }}
                          >
                            {isFromSplitPayment ? "Agregar pago" : "Aceptar"}
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
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
                              {selectedCardType ? (
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted p-2">
                                  <Image
                                    src={selectedCardType.icon}
                                    alt={selectedCardType.name}
                                    width={32}
                                    height={20}
                                    className="h-5 w-auto object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                                  <selectedMethod.icon className="size-5" />
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="flex w-fit items-center gap-2 text-sm font-medium leading-snug">
                                  {selectedCardType
                                    ? selectedCardType.name
                                    : selectedMethod.name}
                                </h3>
                                {selectedCardType && (
                                  <p className="text-xs text-muted-foreground">
                                    Lote: {cardLote} | Cupón: {cardCupon}
                                  </p>
                                )}
                                {paymentReference && !selectedCardType && (
                                  <p className="text-xs text-muted-foreground">
                                    Ref: {paymentReference}
                                  </p>
                                )}
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
                      <span>{formatPrice(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      {hasGlobalDiscount && (
                        <>
                          <span>
                            Descuento global
                            {globalDiscount?.type === "percentage" &&
                              ` (${globalDiscount.value}%)`}
                          </span>
                          <span>-{formatPrice(totals.globalDiscount)}</span>
                        </>
                      )}
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
                        currentView === "payment-list" ||
                        currentView === "card-select" ||
                        currentView === "card-form" ||
                        currentView === "reference-form" ||
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
