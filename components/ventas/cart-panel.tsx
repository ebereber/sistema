"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  EllipsisVertical,
  PackagePlus,
  Save,
  ShoppingCart,
  StickyNote,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type CartItem as CartItemType,
  type CartTotals,
  type GlobalDiscount,
  type ItemDiscount,
  type SelectedCustomer,
  calculateCartTotals,
  formatPrice,
} from "@/lib/validations/sale";
import { Kbd } from "../ui/kbd";
import { AddNoteDialog } from "./add-note-dialog";
import { CartItem } from "./cart-item";
import { ChangeDateDialog } from "./change-date-dialog";
import { CustomItemDialog } from "./custom-item-dialog";
import { CustomerSelectDialog } from "./customer-select-dialog";
import { DiscountDialog } from "./discount-dialog";
import { SaveQuoteDialog } from "./save-quote-dialog";

interface CartPanelProps {
  items: CartItemType[];
  customer: SelectedCustomer;
  globalDiscount: GlobalDiscount | null;
  note: string;
  saleDate: Date;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onApplyItemDiscount: (id: string, discount: ItemDiscount | null) => void;
  onCustomerChange: (customer: SelectedCustomer) => void;
  onGlobalDiscountChange: (discount: GlobalDiscount | null) => void;
  onAddCustomItem: (
    name: string,
    price: number,
    quantity: number,
    taxRate: number,
    type: string,
  ) => void;
  onNoteChange: (note: string) => void;
  onSaleDateChange: (date: Date) => void;
  onContinue: () => void;
  onClearCart: () => void;
}

export function CartPanel({
  items,
  customer,
  globalDiscount,
  note,
  saleDate,
  onQuantityChange,
  onRemoveItem,
  onApplyItemDiscount,
  onCustomerChange,
  onGlobalDiscountChange,
  onAddCustomItem,
  onNoteChange,
  onSaleDateChange,
  onContinue,
  onClearCart,
}: CartPanelProps) {
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [customItemDialogOpen, setCustomItemDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [saveQuoteDialogOpen, setSaveQuoteDialogOpen] = useState(false);

  // Calculate totals
  const totals: CartTotals = calculateCartTotals(items, globalDiscount);

  // Check if there are any discounts
  const hasItemDiscounts = totals.itemDiscounts > 0;
  const hasGlobalDiscount = totals.globalDiscount > 0;
  const hasAnyDiscounts = hasItemDiscounts || hasGlobalDiscount;

  const isEmpty = items.length === 0;

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Formatear fecha corta
  const formatShortDate = (date: Date) => {
    return format(date, "d/M/yy", { locale: es });
  };

  return (
    <div className="flex h-full flex-col rounded-lg mt-4 lg:mt-0 lg:border bg-sidebar">
      {/* Header */}
      <div className="flex items-center p-2 justify-between">
        <div className="items-center gap-2">
          <h2 className="font-semibold text-sm">Caja Principal</h2>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <EllipsisVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-fit">
              <DropdownMenuItem onClick={() => setCustomItemDialogOpen(true)}>
                <PackagePlus className="mr-2 size-4" />
                Ítem Personalizado
                <Kbd className="ml-auto">⌘I</Kbd>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setNoteDialogOpen(true)}>
                <StickyNote className="mr-2 size-4" />
                {note ? "Editar Nota" : "Agregar Nota"}
                <Kbd className="ml-auto">⌘N</Kbd>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateDialogOpen(true)}>
                <CalendarDays className="mr-2 size-4" />
                {isToday(saleDate)
                  ? "Cambiar fecha"
                  : `Fecha: ${formatShortDate(saleDate)}`}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSaveQuoteDialogOpen(true)}>
                <Save className="mr-2 size-4" />
                Guardar como presupuesto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!isEmpty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCart}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="mr-1 h-4 w-4" />
            </Button>
          )}
        </div>
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

          <span className="ml-2  truncate text-muted-foreground text-xs">
            DNI
            {customer.taxId}
          </span>
        </Button>
        {customer.priceListName && (
          <div className="mt-1.5 flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
            <Tag className="h-3 w-3" />
            <span>
              Lista:{" "}
              <span className="font-medium">{customer.priceListName}</span>
              {customer.priceListAdjustment !== 0 &&
                customer.priceListAdjustment && (
                  <span className="ml-1 text-green-600 font-medium">
                    {customer.priceListAdjustmentType === "AUMENTO" ? "+" : "-"}
                    {customer.priceListAdjustment}%
                  </span>
                )}
            </span>
          </div>
        )}
      </div>

      {/* Note indicator */}
      {note && (
        <div className="border-b p-2">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
            onClick={() => setNoteDialogOpen(true)}
          >
            <StickyNote className="h-4 w-4 shrink-0" />
            <span className="truncate">{note}</span>
          </button>
        </div>
      )}

      {/* Cart items */}
      <ScrollArea className="flex-1 h-full pr-4 overflow-hidden">
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
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with totals and actions */}
      {!isEmpty && (
        <div className="border-t p-4">
          {/* Discount button or discount lines */}
          {!hasAnyDiscounts ? (
            <div className="mb-4 w-fit">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setDiscountDialogOpen(true)}
              >
                <span className="flex-1 text-left">+ Agregar descuento</span>
                {/*  <kbd className="ml-2 hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground sm:inline-block">
                  {navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl"}D
                </kbd> */}
              </Button>
            </div>
          ) : (
            <div className="mb-4 space-y-2 text-sm">
              {/* Item discounts line */}
              {hasItemDiscounts && (
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-green-600 hover:text-green-700 transition-colors"
                  onClick={() => setDiscountDialogOpen(true)}
                >
                  <span>Descuentos por producto</span>
                  <span>-{formatPrice(totals.itemDiscounts)}</span>
                </button>
              )}

              {/* Global discount line */}
              {hasGlobalDiscount && (
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-green-600 hover:text-green-700 transition-colors"
                  onClick={() => setDiscountDialogOpen(true)}
                >
                  <span>
                    Descuento global
                    {globalDiscount?.type === "percentage" &&
                      ` (${globalDiscount.value}%)`}
                  </span>
                  <span>-{formatPrice(totals.globalDiscount)}</span>
                </button>
              )}
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(totals.total)}</span>
          </div>

          {/* Continue button */}
          <Button className="mt-4 w-full" size="lg" onClick={onContinue}>
            Continuar
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

      {/* Unified discount dialog */}
      <DiscountDialog
        open={discountDialogOpen}
        onOpenChange={setDiscountDialogOpen}
        items={items}
        globalDiscount={globalDiscount}
        onApplyItemDiscount={onApplyItemDiscount}
        onApplyGlobalDiscount={onGlobalDiscountChange}
      />

      {/* Custom item dialog */}
      <CustomItemDialog
        open={customItemDialogOpen}
        onOpenChange={setCustomItemDialogOpen}
        onAddItem={onAddCustomItem}
      />

      {/* Add note dialog */}
      <AddNoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        note={note}
        onNoteChange={onNoteChange}
        onSave={() => {}}
      />

      {/* Change date dialog */}
      <ChangeDateDialog
        open={dateDialogOpen}
        onOpenChange={setDateDialogOpen}
        date={saleDate}
        onDateChange={onSaleDateChange}
      />

      {/* Save quote dialog */}
      <SaveQuoteDialog
        open={saveQuoteDialogOpen}
        onOpenChange={setSaveQuoteDialogOpen}
      />
    </div>
  );
}
