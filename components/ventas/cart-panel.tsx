"use client";

import { ArrowRight, Percent, ShoppingCart, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type CartItem as CartItemType,
  type CartTotals,
  type GlobalDiscount,
  type ItemDiscount,
  type SelectedCustomer,
  calculateCartTotals,
} from "@/lib/validations/sale";
import { CartItem } from "./cart-item";
import { CartSummary } from "./cart-summary";
import { CustomerSelectDialog } from "./customer-select-dialog";
import { DiscountDialog } from "./discount-dialog";

interface CartPanelProps {
  items: CartItemType[];
  customer: SelectedCustomer;
  globalDiscount: GlobalDiscount | null;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onApplyItemDiscount: (id: string, discount: ItemDiscount | null) => void;
  onCustomerChange: (customer: SelectedCustomer) => void;
  onGlobalDiscountChange: (discount: GlobalDiscount | null) => void;
  onContinue: () => void;
  onClearCart: () => void;
}

export function CartPanel({
  items,
  customer,
  globalDiscount,
  onQuantityChange,
  onRemoveItem,
  onApplyItemDiscount,
  onCustomerChange,
  onGlobalDiscountChange,
  onContinue,
  onClearCart,
}: CartPanelProps) {
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] =
    useState<CartItemType | null>(null);
  const [globalDiscountDialogOpen, setGlobalDiscountDialogOpen] =
    useState(false);

  // Calculate totals
  const totals: CartTotals = calculateCartTotals(items, globalDiscount);

  // Handle keyboard shortcut for customer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "c" && !e.shiftKey) {
        // Only trigger if not in an input field
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          setCustomerDialogOpen(true);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleItemDiscountClick = (item: CartItemType) => {
    setSelectedItemForDiscount(item);
    setDiscountDialogOpen(true);
  };

  const handleApplyItemDiscount = (discount: ItemDiscount | null) => {
    if (selectedItemForDiscount) {
      onApplyItemDiscount(selectedItemForDiscount.id, discount);
    }
    setSelectedItemForDiscount(null);
  };

  const isEmpty = items.length === 0;

  return (
    <div className="flex  h-full flex-col rounded-lg mt-4 lg:mt-0 lg:border bg-sidebar">
      {/* Header */}

      <div className="flex items-center p-2 justify-between">
        <div className="  items-center gap-2">
          {/* <ShoppingCart className="h-4 w-4" /> */}
          <h2 className="font-semibold text-sm">Caja Principal</h2>
        </div>
        {!isEmpty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearCart}
            className="text-muted-foreground hover:text-destructive "
          >
            <Trash2 className="mr-1 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Customer selector */}
      <div className="border-b p-2">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => setCustomerDialogOpen(true)}
        >
          <User className="mr-2 h-4 w-4" />
          <span className="flex-1 text-left truncate">{customer.name}</span>
          <kbd className="ml-2 hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground sm:inline-block">
            {navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl"}C
          </kbd>
        </Button>
      </div>

      {/* Cart items */}
      <ScrollArea className="flex-1 h-full pr-4  overflow-hidden ">
        <div className="p-4">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-semibold">Carrito vacío</h3>
              <p className="text-sm text-muted-foreground">
                Selecciona productos para agregar a la venta
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onQuantityChange={onQuantityChange}
                  onRemove={onRemoveItem}
                  onDiscountClick={handleItemDiscountClick}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with totals and actions */}
      {!isEmpty && (
        <div className="border-t p-4">
          {/* Global discount button */}
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setGlobalDiscountDialogOpen(true)}
            >
              <Percent className="mr-2 h-4 w-4" />
              {globalDiscount
                ? `Descuento: ${globalDiscount.type === "percentage" ? `${globalDiscount.value}%` : `$${globalDiscount.value}`}`
                : "Agregar descuento general"}
            </Button>
          </div>

          {/* Totals */}
          <CartSummary totals={totals} globalDiscount={globalDiscount} />

          {/* Continue button */}
          <Button className="mt-4 w-full" size="lg" onClick={onContinue}>
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Customer select dialog */}
      <CustomerSelectDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        selectedCustomer={customer}
        onCustomerSelect={onCustomerChange}
      />

      {/* Item discount dialog */}
      {selectedItemForDiscount && (
        <DiscountDialog
          mode="item"
          open={discountDialogOpen}
          onOpenChange={setDiscountDialogOpen}
          item={selectedItemForDiscount}
          onApply={handleApplyItemDiscount}
        />
      )}

      {/* Global discount dialog */}
      <DiscountDialog
        mode="global"
        open={globalDiscountDialogOpen}
        onOpenChange={setGlobalDiscountDialogOpen}
        subtotal={totals.subtotal - totals.itemDiscounts}
        currentDiscount={globalDiscount}
        onApply={onGlobalDiscountChange}
      />
    </div>
  );
}
