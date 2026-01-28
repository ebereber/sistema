"use client";

import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { formatPrice } from "@/lib/validations/sale";
import { ChevronLeft, ChevronRight, DollarSign, Trash2 } from "lucide-react";
import type { PaymentMethod, SplitPayment } from "./types";

interface PaymentSplitProps {
  splitPayments: SplitPayment[];
  remaining: number;
  currentAmount: string;
  isAmountValid: boolean;
  isPaymentComplete: boolean;
  paymentMethods: PaymentMethod[];
  onAmountChange: (value: string) => void;
  onMethodClick: (methodId: string) => void;
  onRemovePayment: (id: string) => void;
  onBack: () => void;
}

export function PaymentSplit({
  splitPayments,
  remaining,
  currentAmount,
  isAmountValid,
  isPaymentComplete,
  paymentMethods,
  onAmountChange,
  onMethodClick,
  onRemovePayment,
  onBack,
}: PaymentSplitProps) {
  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <CardDescription className="flex items-center gap-1">
          Pago {splitPayments.length + 1}
        </CardDescription>

        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          {isPaymentComplete
            ? "Editar"
            : splitPayments.length === 0
              ? "Atrás"
              : "Atrás"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 px-4">
        {/* Previous payments list */}
        {!isPaymentComplete && splitPayments.length > 0 && (
          <div className="space-y-2">
            {splitPayments.map((payment, index) => (
              <Item key={payment.id} variant="muted" className="bg-muted/50">
                <ItemMedia variant="icon">
                  {(() => {
                    const method = paymentMethods.find(
                      (m) => m.id === payment.methodId
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
                    onClick={() => onRemovePayment(payment.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </ItemActions>
              </Item>
            ))}

            <div className="mt-2 flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Restante:</span>
              <span className="text-lg font-bold">{formatPrice(remaining)}</span>
            </div>
          </div>
        )}

        {/* New payment form */}
        {!isPaymentComplete && (
          <div className="fade-in animate-in space-y-6 duration-300">
            <div className="space-y-2">
              <Label>Monto a pagar</Label>
              <CurrencyInput
                value={currentAmount}
                onValueChange={(value) => onAmountChange(value.toFixed(2))}
                placeholder="$"
                className="h-10 font-medium md:text-lg"
                isAllowed={(values) =>
                  values.floatValue == null || values.floatValue <= remaining
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
                      onClick={() => onMethodClick(method.id)}
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
          </div>
        )}

        {/* Final summary view */}
        {isPaymentComplete && splitPayments.length > 0 && (
          <div className="space-y-2">
            <ItemGroup role="list" className="space-y-2">
              {splitPayments.map((payment) => {
                const method = paymentMethods.find(
                  (m) => m.id === payment.methodId
                );
                const Icon = method?.icon || DollarSign;
                return (
                  <Item key={payment.id} variant="muted" className="bg-muted/50">
                    <ItemMedia variant="icon">
                      <Icon className="h-4 w-4" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{payment.methodName}</ItemTitle>
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
  );
}
