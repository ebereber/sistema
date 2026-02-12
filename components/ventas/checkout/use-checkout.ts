"use client";

import {
  applyCreditNoteToSale,
  getAvailableCreditNotes,
  type AvailableCreditNote,
} from "@/lib/services/credit-note-applications";
import { getMainLocation } from "@/lib/services/locations";
import { getPaymentMethods } from "@/lib/services/payment-methods";
import {
  createExchange,
  createSale,
  type PaymentInsert,
  type SaleItemInsert,
} from "@/lib/services/sales";

import {
  createArcaInvoiceAction,
  getArcaReadinessAction,
} from "@/lib/actions/arca";
import { syncSaleStockToMercadoLibre } from "@/lib/actions/mercadolibre";
import { syncSaleStockToTiendanube } from "@/lib/actions/tiendanube";
import {
  getAvailableFiscalVoucherTypes,
  isFiscalVoucher,
} from "@/lib/utils/fiscal";
import {
  checkStockAvailability,
  type StockCheckResult,
} from "@/lib/services/sales";
import { Shift } from "@/lib/services/shifts";
import { parseArgentineCurrency } from "@/lib/utils/currency";
import {
  calculateCartTotals,
  calculateItemTotal,
  type CartItem,
  type ExchangeData,
  type ExchangeItem,
  type ExchangeResult,
  type ExchangeTotals,
  type GlobalDiscount,
  type SelectedCustomer,
} from "@/lib/validations/sale";
import { DollarSign } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ICON_MAP,
  type CardType,
  type CheckoutView,
  type PaymentMethod,
  type SplitPayment,
} from "./types";

interface UseCheckoutProps {
  open: boolean;
  cartItems: CartItem[];
  customer: SelectedCustomer;
  globalDiscount: GlobalDiscount | null;
  note: string;
  saleDate: Date;
  onOpenChange: (open: boolean) => void;
  onSuccess: (saleNumber: string) => void;
  isExchangeMode: boolean;
  exchangeData?: ExchangeData | null;
  itemsToReturn: ExchangeItem[];
  exchangeTotals?: ExchangeTotals;
  shift: Shift | null;
  onSaleDateChange: (date: Date) => void;
}

export function useCheckout({
  open,
  cartItems,
  customer,
  globalDiscount,
  note,
  saleDate,
  onOpenChange,
  onSuccess,
  isExchangeMode,
  exchangeData,
  itemsToReturn,
  exchangeTotals,
  shift,
  onSaleDateChange,
}: UseCheckoutProps) {
  // Calculate totals from cart
  const totals = calculateCartTotals(cartItems, globalDiscount);
  const { subtotal, taxes: tax, total } = totals;

  // Exchange mode states
  const [availableCreditNotes, setAvailableCreditNotes] = useState<
    AvailableCreditNote[]
  >([]);
  const [selectedCreditNotes, setSelectedCreditNotes] = useState<
    Map<string, number>
  >(new Map());
  const [exchangeResult, setExchangeResult] = useState<ExchangeResult | null>(
    null,
  );

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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Card payment states
  const [selectedCardType, setSelectedCardType] = useState<CardType | null>(
    null,
  );
  const [cardLote, setCardLote] = useState("");
  const [cardCupon, setCardCupon] = useState("");

  // Transfer payment state
  const [paymentReference, setPaymentReference] = useState("");

  // Split payment with card/reference states
  const [pendingSplitAmount, setPendingSplitAmount] = useState<number>(0);
  const [isFromSplitPayment, setIsFromSplitPayment] = useState(false);

  const [isLoadingMethods, setIsLoadingMethods] = useState(true);

  // Pending payment states
  const [dueDate, setDueDate] = useState<string>("30");
  const [pendingAmount, setPendingAmount] = useState<number>(0);

  // Check if there are any discounts
  const hasItemDiscounts = totals.itemDiscounts > 0;
  const hasGlobalDiscount = totals.globalDiscount > 0;

  const [stockShortages, setStockShortages] = useState<StockCheckResult[]>([]);
  const [showStockWarning, setShowStockWarning] = useState(false);
  const skipStockCheckRef = useRef(false);

  // ARCA states
  const [arcaReady, setArcaReady] = useState(false);
  const [availableVoucherTypes, setAvailableVoucherTypes] = useState<string[]>([
    "COMPROBANTE_X",
  ]);
  const [isArcaProcessing, setIsArcaProcessing] = useState(false);
  const [arcaCae, setArcaCae] = useState<string | null>(null);
  const [arcaVoucherNumber, setArcaVoucherNumber] = useState<number | null>(
    null,
  );
  const arcaReadinessRef = useRef<{
    emisorCondicionIva: string | null;
  } | null>(null);

  // Load payment methods
  useEffect(() => {
    async function loadPaymentMethods() {
      setIsLoadingMethods(true);
      try {
        const methods = await getPaymentMethods({
          isActive: true,
          availability: "VENTAS",
        });

        const mappedMethods = methods.map((m, index) => {
          const Icon = ICON_MAP[m.icon as keyof typeof ICON_MAP] || DollarSign;

          return {
            id: m.id,
            name: m.name,
            icon: Icon,
            shortcut: (index + 1).toString(),
            type: m.type,
            requires_reference: m.requires_reference,
            bank_account_id: m.bank_account_id ?? null,
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

  // Load location
  // Load location from shift or fallback to main
  useEffect(() => {
    async function loadLocation() {
      // Si hay turno abierto, usar la ubicación de su caja
      if (shift?.cash_register?.location_id) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase
          .from("locations")
          .select("id, name")
          .eq("id", shift.cash_register.location_id)
          .single();

        if (data) {
          setLocation(data);
          return;
        }
      }

      // Fallback: ubicación principal
      const loc = await getMainLocation();
      setLocation(loc);
    }
    if (open) {
      loadLocation();
    }
  }, [open, shift]);

  // Load ARCA readiness when dialog opens
  useEffect(() => {
    async function checkArcaReadiness() {
      try {
        const readiness = await getArcaReadinessAction();
        setArcaReady(readiness.ready);
        arcaReadinessRef.current = {
          emisorCondicionIva: readiness.emisorCondicionIva,
        };

        if (readiness.ready && readiness.emisorCondicionIva) {
          const types = getAvailableFiscalVoucherTypes(
            readiness.emisorCondicionIva,
            customer.taxCategory,
          );
          setAvailableVoucherTypes(types);
        } else {
          setAvailableVoucherTypes(["COMPROBANTE_X"]);
        }
      } catch (error) {
        console.error("Error checking ARCA readiness:", error);
        setArcaReady(false);
        setAvailableVoucherTypes(["COMPROBANTE_X"]);
      }
    }

    if (open) {
      checkArcaReadiness();
    }
  }, [open, customer.taxCategory]);

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
      setSelectedCardType(null);
      setCardLote("");
      setCardCupon("");
      setPaymentReference("");
      setPendingSplitAmount(0);
      setIsFromSplitPayment(false);
      setSelectedCreditNotes(new Map());
      setExchangeResult(null);
      setDueDate("30");
      setPendingAmount(0);
      setArcaCae(null);
      setArcaVoucherNumber(null);
      setIsArcaProcessing(false);
    }
  }, [open]);

  // Load available credit notes
  useEffect(() => {
    async function loadCreditNotes() {
      console.log("Loading NC for customer:", customer.id);
      if (open && customer.id) {
        try {
          const notes = await getAvailableCreditNotes(customer.id);
          console.log("NC loaded:", notes);
          setAvailableCreditNotes(notes);
        } catch (error) {
          console.error("Error loading credit notes:", error);
        }
      } else {
        setAvailableCreditNotes([]);
      }
    }

    loadCreditNotes();
  }, [open, customer.id]);

  // Calculate totals for split payment
  const totalPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);

  const currentAmount = parseArgentineCurrency(currentSplitAmount);
  const isAmountValid = currentAmount > 0 && currentAmount <= remaining;
  const isPaymentComplete = Math.abs(remaining) < 0.1;

  const totalSelectedCreditNotes = Array.from(
    selectedCreditNotes.values(),
  ).reduce((sum, amount) => sum + amount, 0);

  const exchangeAmountToPay = exchangeTotals
    ? Math.max(0, exchangeTotals.balance - totalSelectedCreditNotes)
    : 0;

  const finalAmountToPay = isExchangeMode
    ? exchangeAmountToPay
    : Math.max(0, total - totalSelectedCreditNotes);

  const needsPayment = finalAmountToPay > 0;

  const selectedMethod = paymentMethods.find(
    (m) => m.id === selectedPaymentMethod,
  );

  // Handlers
  const handlePaymentMethodClick = (methodId: string) => {
    if (currentView === "split-payment") {
      if (remaining <= 0) return;
      const amount = parseArgentineCurrency(currentSplitAmount);
      const method = paymentMethods.find((m) => m.id === methodId);

      if (method && amount > 0 && amount <= remaining) {
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

        const newPayment: SplitPayment = {
          id: Math.random().toString(36).substr(2, 9),
          methodId: method.id,
          methodName: method.name,
          amount: amount,
        };

        const newSplitPayments = [...splitPayments, newPayment];
        setSplitPayments(newSplitPayments);

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

      if (method.requires_reference) {
        if (method.type === "TARJETA") {
          setCurrentView("card-select");
        } else {
          setCurrentView("reference-form");
        }
      } else {
        setCurrentView("payment-form");
      }
    }
  };

  const handleSplitPayment = () => {
    setCurrentView("split-payment");
    setSplitPayments([]);
    setCurrentSplitAmount("");
    setIsPending(false);
    setPendingAmount(0);
  };

  const handleMarkAsPending = () => {
    setPendingAmount(remaining);
    setIsPending(true);
  };

  const handleRemoveSplitPayment = (id: string) => {
    const newSplitPayments = splitPayments.filter((p) => p.id !== id);
    setSplitPayments(newSplitPayments);

    const newTotalPaid = newSplitPayments.reduce((sum, p) => sum + p.amount, 0);
    const newRemaining = total - newTotalPaid;
    setCurrentSplitAmount(newRemaining.toFixed(2));
  };

  const handleEditSplitPayments = () => {
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

    const method = paymentMethods.find((m) => m.id === selectedPaymentMethod);

    if (currentView === "payment-form") {
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
      // Si está pendiente, primero quitamos el estado pendiente
      if (isPending && pendingAmount > 0) {
        setIsPending(false);
        setPendingAmount(0);
        return;
      }

      if (splitPayments.length > 0) {
        const lastPayment = splitPayments[splitPayments.length - 1];
        const newPayments = splitPayments.slice(0, -1);
        setSplitPayments(newPayments);
        setCurrentSplitAmount(lastPayment.amount.toString());
      } else {
        setCurrentView("payment-list");
      }
    }
  };

  const toggleCreditNote = (noteId: string, availableBalance: number) => {
    setSelectedCreditNotes((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(noteId)) {
        newMap.delete(noteId);
      } else {
        const currentTotal = Array.from(newMap.values()).reduce(
          (sum, amt) => sum + amt,
          0,
        );
        const totalToPay = exchangeTotals
          ? Math.max(0, exchangeTotals.balance)
          : total;
        const remainingToPay = Math.max(0, totalToPay - currentTotal);
        const amountToApply = Math.min(availableBalance, remainingToPay);
        if (amountToApply > 0) {
          newMap.set(noteId, amountToApply);
        }
      }
      return newMap;
    });
  };

  const handleConfirm = async () => {
    if (!location) {
      toast.error("No se pudo obtener la ubicación");
      return;
    }

    // Verificar stock (solo si no se pidió saltar)
    if (!skipStockCheckRef.current) {
      try {
        const shortages = await checkStockAvailability(
          cartItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
          })),
          location.id,
        );

        if (shortages.length > 0) {
          setStockShortages(shortages);
          setShowStockWarning(true);
          return;
        }
      } catch (error) {
        console.error("Error checking stock:", error);
        // Si falla la verificación, continuar con la venta
      }
    }

    // Resetear para próxima venta
    skipStockCheckRef.current = false;
    try {
      setIsSubmitting(true);

      const buildPaymentReference = (): string | null => {
        if (selectedCardType) {
          return `${selectedCardType.name} - Lote: ${cardLote}, Cupón: ${cardCupon}`;
        }
        if (paymentReference) {
          return paymentReference;
        }
        return null;
      };

      // Calculate due date if pending
      const calculateDueDate = (): string | null => {
        if (!isPending) return null;
        const date = new Date(saleDate);
        date.setDate(date.getDate() + parseInt(dueDate));
        return date.toISOString();
      };

      // Handle exchange mode
      if (isExchangeMode && exchangeData && exchangeTotals) {
        const exchangePayments: PaymentInsert[] =
          currentView === "split-payment"
            ? splitPayments.map((p) => ({
                payment_method_id: p.methodId,
                method_name: p.methodName,
                amount: p.amount,
                reference: p.reference || null,
                bank_account_id: paymentMethods.find((m) => m.id === p.methodId)?.bank_account_id ?? null,
                type: paymentMethods.find((m) => m.id === p.methodId)?.type ?? null,
              }))
            : selectedPaymentMethod
              ? [
                  {
                    payment_method_id: selectedPaymentMethod,
                    method_name:
                      paymentMethods.find((m) => m.id === selectedPaymentMethod)
                        ?.name || "",
                    amount: Math.max(
                      0,
                      exchangeTotals.balance - totalSelectedCreditNotes,
                    ),
                    reference: buildPaymentReference(),
                    bank_account_id: paymentMethods.find((m) => m.id === selectedPaymentMethod)?.bank_account_id ?? null,
                    type: paymentMethods.find((m) => m.id === selectedPaymentMethod)?.type ?? null,
                  },
                ]
              : [];

        const appliedCreditNotes = Array.from(
          selectedCreditNotes.entries(),
        ).map(([creditNoteId, amount]) => ({
          creditNoteId,
          amount,
        }));

        const result = await createExchange({
          exchangeData,
          itemsToReturn,
          newCartItems: cartItems,
          payments:
            exchangeTotals.balance > 0 &&
            exchangeTotals.balance - totalSelectedCreditNotes > 0
              ? exchangePayments
              : [],
          appliedCreditNotes,
          locationId: location.id,
          saleDate,
          note: note || undefined,
          globalDiscount,
          shiftId: shift?.id ?? null,
          shiftCashRegisterId: shift?.cash_register?.id ?? null,
        });

        setExchangeResult(result);

        if (result.sale) {
          setSaleNumber(result.sale.saleNumber);
        } else if (result.creditNote) {
          setSaleNumber(result.creditNote.saleNumber);
        }

        setCurrentView("confirmation");
        return;
      }

      // Standard sale flow
      const amountAfterCreditNotes = Math.max(
        0,
        total - totalSelectedCreditNotes,
      );

      const payments: PaymentInsert[] =
        currentView === "split-payment"
          ? splitPayments.map((p) => ({
              payment_method_id: p.methodId,
              method_name: p.methodName,
              amount: p.amount,
              reference: p.reference || null,
              bank_account_id: paymentMethods.find((m) => m.id === p.methodId)?.bank_account_id ?? null,
              type: paymentMethods.find((m) => m.id === p.methodId)?.type ?? null,
            }))
          : selectedPaymentMethod && amountAfterCreditNotes > 0 && !isPending
            ? [
                {
                  payment_method_id: selectedPaymentMethod,
                  method_name:
                    paymentMethods.find((m) => m.id === selectedPaymentMethod)
                      ?.name || "",
                  amount: amountAfterCreditNotes,
                  reference: buildPaymentReference(),
                  bank_account_id: paymentMethods.find((m) => m.id === selectedPaymentMethod)?.bank_account_id ?? null,
                  type: paymentMethods.find((m) => m.id === selectedPaymentMethod)?.type ?? null,
                },
              ]
            : [];

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
        shift_id: shift?.id ?? null,
        due_date: calculateDueDate(),
        amount_paid: isPending ? totalPaid : total,
      };

      const items: SaleItemInsert[] = cartItems.map((item) => ({
        product_id: item.productId,
        description: item.name,
        sku: item.sku || null,
        quantity: item.quantity,
        unit_price: item.price,
        unit_cost: item.cost,
        discount:
          item.discount?.type === "percentage"
            ? (item.price * item.quantity * item.discount.value) / 100
            : item.discount?.value || 0,
        tax_rate: item.taxRate,
        total: calculateItemTotal(item),
      }));

      const sale = await createSale(saleData, items, payments, location.id, shift?.cash_register?.id ?? null);

      if (totalSelectedCreditNotes > 0 && selectedCreditNotes.size > 0) {
        for (const [creditNoteId, amount] of selectedCreditNotes.entries()) {
          await applyCreditNoteToSale(creditNoteId, sale.id, amount);
        }
      }

      // ARCA: solicitar CAE si es comprobante fiscal
      if (isFiscalVoucher(selectedVoucher)) {
        setIsArcaProcessing(true);
        try {
          const arcaResult = await createArcaInvoiceAction(sale.id);
          if (arcaResult.success) {
            setArcaCae(arcaResult.cae ?? null);
            setArcaVoucherNumber(arcaResult.voucherNumber ?? null);
          } else {
            toast.warning(
              `Venta guardada. Error ARCA: ${arcaResult.error}`,
            );
          }
        } catch (arcaError) {
          console.error("Error procesando ARCA:", arcaError);
          toast.warning("Venta guardada pero no se pudo obtener el CAE");
        } finally {
          setIsArcaProcessing(false);
        }
      }

      // Sync stock to integrations (non-blocking, fire-and-forget)
      const productIds = items
        .map((item) => item.product_id)
        .filter((id): id is string => id !== null);
      if (productIds.length > 0) {
        syncSaleStockToTiendanube(productIds).catch((err) => {
          console.error("Error syncing stock to Tiendanube:", err);
        });
        syncSaleStockToMercadoLibre(productIds).catch((err) => {
          console.error("Error syncing stock to MercadoLibre:", err);
        });
      }

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
      onSuccess(saleNumber);
    }
    onOpenChange(newOpen);
  };

  const handleCardTypeSelect = (card: CardType) => {
    setSelectedCardType(card);
    setCurrentView("card-form");
  };

  const handleTransferClick = () => {
    const transferMethod = paymentMethods.find(
      (m) => m.type === "TRANSFERENCIA",
    );
    if (transferMethod) {
      setSelectedPaymentMethod(transferMethod.id);
      setCurrentView("reference-form");
    }
  };

  const handleCardFormContinue = () => {
    if (isFromSplitPayment) {
      handleCompleteSplitPaymentWithReference();
    } else {
      setCurrentView("payment-form");
    }
  };

  const handleReferenceFormContinue = () => {
    if (isFromSplitPayment) {
      handleCompleteSplitPaymentWithReference();
    } else {
      setCurrentView("payment-form");
    }
  };

  const handleConfirmWithShortage = () => {
    setShowStockWarning(false);
    setStockShortages([]);
    skipStockCheckRef.current = true;
    handleConfirm();
  };

  const handleCancelShortage = () => {
    setShowStockWarning(false);
    setStockShortages([]);
  };

  return {
    // State
    currentView,
    isSubmitting,
    isPending,
    setIsPending,
    selectedVoucher,
    setSelectedVoucher,
    saleNumber,
    location,
    setLocation,
    paymentMethods,
    isLoadingMethods,
    exchangeResult,
    onSaleDateChange,

    // Totals
    totals,
    total,
    subtotal,
    tax,
    hasItemDiscounts,
    hasGlobalDiscount,

    // Credit notes
    availableCreditNotes,
    selectedCreditNotes,
    totalSelectedCreditNotes,
    exchangeAmountToPay,
    toggleCreditNote,

    // Payment method selection
    selectedPaymentMethod,
    selectedMethod,

    // Split payments
    splitPayments,
    currentSplitAmount,
    setCurrentSplitAmount,
    remaining,
    isAmountValid,
    isPaymentComplete,
    totalPaid,
    isAddingPartialPayment,
    setIsAddingPartialPayment,

    stockShortages,
    showStockWarning,
    handleConfirmWithShortage,
    handleCancelShortage,

    // Card payments
    selectedCardType,
    cardLote,
    setCardLote,
    cardCupon,
    setCardCupon,

    // Reference payments
    paymentReference,
    setPaymentReference,

    // Split payment with reference
    pendingSplitAmount,
    isFromSplitPayment,

    // Computed
    needsPayment,
    finalAmountToPay,

    // Pending payment
    dueDate,
    setDueDate,
    pendingAmount,
    handleMarkAsPending,

    // ARCA
    arcaReady,
    availableVoucherTypes,
    isArcaProcessing,
    arcaCae,
    arcaVoucherNumber,

    // Handlers
    handlePaymentMethodClick,
    handleSplitPayment,
    handleRemoveSplitPayment,
    handleEditSplitPayments,
    handleCompleteSplitPaymentWithReference,
    handleBack,
    handleConfirm,
    handleNewSale,
    handleOpenChange,
    handleCardTypeSelect,
    handleTransferClick,
    handleCardFormContinue,
    handleReferenceFormContinue,
  };
}
