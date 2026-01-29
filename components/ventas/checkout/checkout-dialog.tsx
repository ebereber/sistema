"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { CheckoutConfirmation } from "./checkout-confirmation";
import { CheckoutSummary } from "./checkout-summary";
import { PaymentCardForm, PaymentCardSelect } from "./payment-card-form";
import { PaymentMethodsList } from "./payment-methods-list";
import { PaymentReferenceForm } from "./payment-reference-form";
import { PaymentSplit } from "./payment-split";
import type { CheckoutDialogProps } from "./types";
import { useCheckout } from "./use-checkout";

export function CheckoutDialog({
  open,
  onOpenChange,
  cartItems,
  customer,
  globalDiscount,
  note,
  saleDate,
  onSuccess,
  isExchangeMode = false,
  exchangeData,
  itemsToReturn = [],
  exchangeTotals,
  shiftId,
}: CheckoutDialogProps) {
  const checkout = useCheckout({
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
    shiftId,
  });

  return (
    <Sheet open={open} onOpenChange={checkout.handleOpenChange}>
      <SheetContent
        side={checkout.needsPayment ? "bottom" : "right"}
        className={cn(
          checkout.needsPayment ? "h-[95vh] w-full" : "h-full w-full max-w-md",
        )}
      >
        <SheetDescription className="hidden"></SheetDescription>
        {checkout.currentView === "confirmation" ? (
          <CheckoutConfirmation
            isExchangeMode={isExchangeMode}
            exchangeResult={checkout.exchangeResult}
            saleNumber={checkout.saleNumber}
            total={checkout.total}
            onNewSale={checkout.handleNewSale}
          />
        ) : (
          <>
            <SheetHeader className="gap-0.5 p-4">
              <SheetTitle className="text-base flex items-center gap-2">
                {isExchangeMode && (
                  <ArrowLeftRight className="h-4 w-4 text-orange-500" />
                )}
                {isExchangeMode
                  ? `Confirmar cambio - ${exchangeData?.originalSaleNumber}`
                  : `Confirmar venta a ${customer.name}`}
              </SheetTitle>
            </SheetHeader>

            <form
              className={cn(
                checkout.needsPayment
                  ? "flex flex-1 flex-col overflow-hidden px-4"
                  : "flex flex-col overflow-hidden px-4",
              )}
              onSubmit={async (e) => {
                e.preventDefault();
                await checkout.handleConfirm();
              }}
            >
              <div
                className={cn(
                  "flex flex-1 flex-col gap-6 overflow-y-auto pt-0.5",
                  checkout.needsPayment
                    ? "lg:flex-row"
                    : "items-center justify-center",
                )}
              >
                {/* Left panel - Only show if needs payment */}
                {checkout.needsPayment && (
                  <div className="flex-1 px-0.5">
                    <Card className="gap-0 py-4">
                      {/* View: Payment methods list */}
                      {checkout.currentView === "payment-list" && (
                        <PaymentMethodsList
                          paymentMethods={checkout.paymentMethods}
                          isPending={checkout.isPending}
                          onPendingChange={checkout.setIsPending}
                          onMethodClick={checkout.handlePaymentMethodClick}
                          onSplitPayment={checkout.handleSplitPayment}
                        />
                      )}

                      {/* View: Split payment */}
                      {checkout.currentView === "split-payment" && (
                        <PaymentSplit
                          splitPayments={checkout.splitPayments}
                          remaining={checkout.remaining}
                          currentAmount={checkout.currentSplitAmount}
                          isAmountValid={checkout.isAmountValid}
                          isPaymentComplete={checkout.isPaymentComplete}
                          paymentMethods={checkout.paymentMethods}
                          onAmountChange={checkout.setCurrentSplitAmount}
                          onMethodClick={checkout.handlePaymentMethodClick}
                          onRemovePayment={checkout.handleRemoveSplitPayment}
                          onBack={checkout.handleBack}
                        />
                      )}

                      {/* View: Card type selection */}
                      {checkout.currentView === "card-select" && (
                        <PaymentCardSelect
                          onCardTypeSelect={checkout.handleCardTypeSelect}
                          onBack={checkout.handleBack}
                          onTransferClick={checkout.handleTransferClick}
                        />
                      )}

                      {/* View: Card form (lote/cupón) */}
                      {checkout.currentView === "card-form" &&
                        checkout.selectedCardType && (
                          <PaymentCardForm
                            selectedCardType={checkout.selectedCardType}
                            cardLote={checkout.cardLote}
                            cardCupon={checkout.cardCupon}
                            isFromSplitPayment={checkout.isFromSplitPayment}
                            onLoteChange={checkout.setCardLote}
                            onCuponChange={checkout.setCardCupon}
                            onBack={checkout.handleBack}
                            onContinue={checkout.handleCardFormContinue}
                          />
                        )}

                      {/* View: Reference form (transfer) */}
                      {checkout.currentView === "reference-form" && (
                        <PaymentReferenceForm
                          reference={checkout.paymentReference}
                          isFromSplitPayment={checkout.isFromSplitPayment}
                          onReferenceChange={checkout.setPaymentReference}
                          onBack={checkout.handleBack}
                          onContinue={checkout.handleReferenceFormContinue}
                        />
                      )}

                      {/* View: Single payment form */}
                      {checkout.currentView === "payment-form" &&
                        checkout.selectedMethod && (
                          <>
                            <CardHeader className="flex flex-row items-center justify-between px-4">
                              <CardDescription>
                                {checkout.selectedMethod.name}
                              </CardDescription>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={checkout.handleBack}
                              >
                                <ChevronLeft className="size-4" />
                                Editar
                              </Button>
                            </CardHeader>

                            <CardContent className="space-y-4 px-4">
                              <div className="rounded-lg border p-2">
                                <div className="flex items-center gap-3">
                                  {checkout.selectedCardType ? (
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted p-2">
                                      <Image
                                        src={checkout.selectedCardType.icon}
                                        alt={checkout.selectedCardType.name}
                                        width={32}
                                        height={20}
                                        className="h-5 w-auto object-contain"
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                                      <checkout.selectedMethod.icon className="size-5" />
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <h3 className="flex w-fit items-center gap-2 text-sm font-medium leading-snug">
                                      {checkout.selectedCardType
                                        ? checkout.selectedCardType.name
                                        : checkout.selectedMethod.name}
                                    </h3>
                                    {checkout.selectedCardType && (
                                      <p className="text-xs text-muted-foreground">
                                        Lote: {checkout.cardLote} | Cupón:{" "}
                                        {checkout.cardCupon}
                                      </p>
                                    )}
                                    {checkout.paymentReference &&
                                      !checkout.selectedCardType && (
                                        <p className="text-xs text-muted-foreground">
                                          Ref: {checkout.paymentReference}
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
                )}

                {/* Right panel - Summary */}
                <CheckoutSummary
                  totals={checkout.totals}
                  total={checkout.total}
                  globalDiscount={globalDiscount}
                  hasGlobalDiscount={checkout.hasGlobalDiscount}
                  isExchangeMode={isExchangeMode}
                  exchangeTotals={exchangeTotals}
                  exchangeAmountToPay={checkout.exchangeAmountToPay}
                  availableCreditNotes={checkout.availableCreditNotes}
                  selectedCreditNotes={checkout.selectedCreditNotes}
                  totalSelectedCreditNotes={checkout.totalSelectedCreditNotes}
                  onToggleCreditNote={checkout.toggleCreditNote}
                  selectedVoucher={checkout.selectedVoucher}
                  onVoucherChange={checkout.setSelectedVoucher}
                  isSubmitting={checkout.isSubmitting}
                  needsPayment={checkout.needsPayment}
                  isPending={checkout.isPending}
                  currentView={checkout.currentView}
                  selectedPaymentMethod={checkout.selectedPaymentMethod}
                  isPaymentComplete={checkout.isPaymentComplete}
                  onSubmit={checkout.handleConfirm}
                />
              </div>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
