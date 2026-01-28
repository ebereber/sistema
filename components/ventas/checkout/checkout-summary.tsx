"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  formatPrice,
  type CartTotals,
  type ExchangeTotals,
  type GlobalDiscount,
} from "@/lib/validations/sale";
import { Loader2, Pencil } from "lucide-react";
import { CreditNotesSelector } from "./credit-notes-selector";
import type { AvailableCreditNote, CheckoutView } from "./types";

interface CheckoutSummaryProps {
  // Totals
  totals: CartTotals;
  total: number;
  globalDiscount: GlobalDiscount | null;
  hasGlobalDiscount: boolean;
  // Exchange mode
  isExchangeMode: boolean;
  exchangeTotals?: ExchangeTotals;
  exchangeAmountToPay: number;
  // Credit notes
  availableCreditNotes: AvailableCreditNote[];
  selectedCreditNotes: Map<string, number>;
  totalSelectedCreditNotes: number;
  onToggleCreditNote: (noteId: string, balance: number) => void;
  // Voucher
  selectedVoucher: string;
  onVoucherChange: (value: string) => void;
  // Submit
  isSubmitting: boolean;
  needsPayment: boolean;
  isPending: boolean;
  currentView: CheckoutView;
  selectedPaymentMethod: string | null;
  isPaymentComplete: boolean;
  onSubmit: () => void;
}

export function CheckoutSummary({
  totals,
  total,
  globalDiscount,
  hasGlobalDiscount,
  isExchangeMode,
  exchangeTotals,
  exchangeAmountToPay,
  availableCreditNotes,
  selectedCreditNotes,
  totalSelectedCreditNotes,
  onToggleCreditNote,
  selectedVoucher,
  onVoucherChange,
  isSubmitting,
  needsPayment,
  isPending,
  currentView,
  selectedPaymentMethod,
  isPaymentComplete,
  onSubmit,
}: CheckoutSummaryProps) {
  const canSubmit = (() => {
    if (isSubmitting) return false;

    if (isExchangeMode) {
      if (exchangeTotals?.isInFavorOfCustomer) {
        return true;
      }
      return !(
        exchangeAmountToPay > 0 &&
        !isPending &&
        currentView === "payment-list"
      );
    }

    // Normal sale mode
    if (!needsPayment) return true;

    return !(
      currentView === "payment-list" ||
      currentView === "card-select" ||
      currentView === "card-form" ||
      currentView === "reference-form" ||
      (currentView === "payment-form" && !selectedPaymentMethod) ||
      (currentView === "split-payment" && !isPaymentComplete)
    );
  })();

  return (
    <div className="sticky top-0 flex shrink-0 flex-col space-y-6 self-start w-full max-w-md">
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
          onValueChange={onVoucherChange}
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
                <div className="text-sm font-medium">Comprobante X</div>
              </div>
              <kbd className="pointer-events-none hidden h-5 min-w-5 select-none items-center justify-center gap-1 rounded-sm border border-muted-foreground/30 px-1 font-sans text-xs font-medium text-muted-foreground md:block">
                C
              </kbd>
            </Label>
          </div>
        </RadioGroup>
      </div>

      <Separator />

      {/* Exchange mode totals */}
      {isExchangeMode && exchangeTotals ? (
        <div className="space-y-3">
          {/* New products */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Productos nuevos</span>
            <span>{formatPrice(exchangeTotals.newProductsTotal)}</span>
          </div>

          {/* Return credit */}
          <div className="flex justify-between text-sm">
            <span className="text-red-600 dark:text-red-400">
              Crédito por devolución
            </span>
            <span className="text-red-600 dark:text-red-400">
              -{formatPrice(exchangeTotals.returnTotal)}
            </span>
          </div>

          <Separator />

          {/* Balance before NC */}
          <div className="flex justify-between text-sm font-medium">
            <span>
              {exchangeTotals.isInFavorOfCustomer
                ? "Crédito a favor"
                : "Subtotal a pagar"}
            </span>
            <span
              className={
                exchangeTotals.isInFavorOfCustomer
                  ? "text-red-600 dark:text-red-400"
                  : ""
              }
            >
              {exchangeTotals.isInFavorOfCustomer ? "-" : ""}
              {formatPrice(Math.abs(exchangeTotals.balance))}
            </span>
          </div>

          {/* Available credit notes (only if customer has to pay) */}
          {!exchangeTotals.isInFavorOfCustomer &&
            availableCreditNotes.length > 0 && (
              <CreditNotesSelector
                availableCreditNotes={availableCreditNotes}
                selectedCreditNotes={selectedCreditNotes}
                exchangeAmountToPay={exchangeAmountToPay}
                onToggle={onToggleCreditNote}
              />
            )}

          {/* Applied NC total */}
          {totalSelectedCreditNotes > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-red-600 dark:text-red-400">
                NC aplicadas
              </span>
              <span className="text-red-600 dark:text-red-400">
                -{formatPrice(totalSelectedCreditNotes)}
              </span>
            </div>
          )}

          <Separator />

          {/* Final amount to pay */}
          <div className="flex justify-between text-lg font-semibold">
            <span>
              {exchangeTotals.isInFavorOfCustomer
                ? "Crédito final"
                : "Total a pagar"}
            </span>
            <span
              className={
                exchangeTotals.isInFavorOfCustomer || exchangeAmountToPay === 0
                  ? "text-green-600 dark:text-green-400"
                  : ""
              }
            >
              {exchangeTotals.isInFavorOfCustomer
                ? formatPrice(Math.abs(exchangeTotals.balance))
                : formatPrice(exchangeAmountToPay)}
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(totals.subtotal)}</span>
          </div>

          {hasGlobalDiscount && (
            <div className="flex justify-between text-sm">
              <span>
                Descuento global
                {globalDiscount?.type === "percentage" &&
                  ` (${globalDiscount.value}%)`}
              </span>
              <span>-{formatPrice(totals.globalDiscount)}</span>
            </div>
          )}

          {/* NC available for normal sales */}
          {availableCreditNotes.length > 0 && (
            <CreditNotesSelector
              availableCreditNotes={availableCreditNotes}
              selectedCreditNotes={selectedCreditNotes}
              showDate
              onToggle={onToggleCreditNote}
            />
          )}

          {/* Applied NC total */}
          {totalSelectedCreditNotes > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-red-600 dark:text-red-400">
                NC aplicadas
              </span>
              <span className="text-red-600 dark:text-red-400">
                -{formatPrice(totalSelectedCreditNotes)}
              </span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(total - totalSelectedCreditNotes)}</span>
          </div>
        </div>
      )}

      <div className="space-y-2 pb-2">
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full text-base font-medium"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting
            ? "Confirmando..."
            : isExchangeMode
              ? "Confirmar cambio"
              : "Confirmar venta"}
        </Button>
      </div>
    </div>
  );
}
