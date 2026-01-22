"use client";

import {
  formatPrice,
  type CartTotals,
  type GlobalDiscount,
} from "@/lib/validations/sale";

interface CartSummaryProps {
  totals: CartTotals;
  globalDiscount: GlobalDiscount | null;
}

export function CartSummary({ totals, globalDiscount }: CartSummaryProps) {
  const hasItemDiscounts = totals.itemDiscounts > 0;
  const hasGlobalDiscount = totals.globalDiscount > 0;

  const formatGlobalDiscount = (): string => {
    if (!globalDiscount) return "";
    if (globalDiscount.type === "percentage") {
      return `(${globalDiscount.value}%)`;
    }
    return "";
  };

  return (
    <div className="space-y-2 text-sm">
      {/* Subtotal */}
      {/* <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatPrice(totals.subtotal)}</span>
      </div> */}

      {/* Item discounts */}
      {hasItemDiscounts && (
        <div className="flex items-center justify-between text-green-600">
          <span>Desc. por producto</span>
          <span>-{formatPrice(totals.itemDiscounts)}</span>
        </div>
      )}

      {/* Global discount */}
      {hasGlobalDiscount && (
        <div className="flex items-center justify-between text-green-600">
          <span>Descuento general {formatGlobalDiscount()}</span>
          <span>-{formatPrice(totals.globalDiscount)}</span>
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between text-lg font-semibold">
        <span>Total</span>
        <span>{formatPrice(totals.total)}</span>
      </div>
    </div>
  );
}
