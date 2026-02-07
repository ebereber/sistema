"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { DollarSign, Percent, ShoppingBag, Tag, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────
type DiscountType = "percentage" | "fixed";

interface ItemDiscount {
  type: DiscountType;
  value: number;
}

interface GlobalDiscount {
  type: DiscountType;
  value: number;
}

interface CartItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  discount: ItemDiscount | null;
}

// ── Helpers ────────────────────────────────────────────────
function formatPrice(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);
}

// ── Props ──────────────────────────────────────────────────
interface DiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  globalDiscount: GlobalDiscount | null;
  maxDiscountPercentage: number;
  onApplyItemDiscount: (id: string, discount: ItemDiscount | null) => void;
  onApplyGlobalDiscount: (discount: GlobalDiscount | null) => void;
}

interface ItemDiscountState {
  type: DiscountType;
  value: string;
}

// ── Inline Toggle Button ───────────────────────────────────
function TypeToggle({
  value,
  onChange,
}: {
  value: DiscountType;
  onChange: (v: DiscountType) => void;
}) {
  return (
    <div className="flex h-8 items-center rounded-md border bg-muted/50 p-0.5">
      <button
        type="button"
        onClick={() => onChange("percentage")}
        className={`flex h-7 w-8 items-center justify-center rounded-sm text-xs transition-all ${
          value === "percentage"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Percent className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => onChange("fixed")}
        className={`flex h-7 w-8 items-center justify-center rounded-sm text-xs transition-all ${
          value === "fixed"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <DollarSign className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── Main Dialog ────────────────────────────────────────────
export function DiscountDialog({
  open,
  onOpenChange,
  items,
  globalDiscount,
  maxDiscountPercentage,
  onApplyItemDiscount,
  onApplyGlobalDiscount,
}: DiscountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DiscountDialogContent
          items={items}
          globalDiscount={globalDiscount}
          maxDiscountPercentage={maxDiscountPercentage}
          onApplyItemDiscount={onApplyItemDiscount}
          onApplyGlobalDiscount={onApplyGlobalDiscount}
          onClose={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}

// ── Dialog Content ─────────────────────────────────────────
function DiscountDialogContent({
  items,
  globalDiscount,
  maxDiscountPercentage,
  onApplyItemDiscount,
  onApplyGlobalDiscount,
  onClose,
}: Omit<DiscountDialogProps, "open" | "onOpenChange"> & {
  onClose: () => void;
}) {
  const [globalType, setGlobalType] = useState<DiscountType>(
    globalDiscount?.type ?? "percentage",
  );
  const [globalValue, setGlobalValue] = useState(
    globalDiscount?.value.toString() ?? "",
  );
  const [itemDiscounts, setItemDiscounts] = useState<
    Record<string, ItemDiscountState>
  >(() => {
    const initial: Record<string, ItemDiscountState> = {};
    items.forEach((item) => {
      initial[item.id] = item.discount
        ? { type: item.discount.type, value: item.discount.value.toString() }
        : { type: "percentage", value: "" };
    });
    return initial;
  });

  const hasAnyDiscounts = (): boolean => {
    if (globalDiscount) return true;
    return items.some((item) => item.discount !== null);
  };

  const itemsWithDiscountsCount = items.filter(
    (item) => item.discount !== null,
  ).length;

  const handleItemDiscountChange = (
    itemId: string,
    field: "type" | "value",
    newValue: string,
  ) => {
    setItemDiscounts((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: newValue },
    }));
  };

  const handleRemoveItemDiscount = (itemId: string) => {
    setItemDiscounts((prev) => ({
      ...prev,
      [itemId]: { type: "percentage", value: "" },
    }));
  };

  const handleRemoveAllDiscounts = () => {
    setGlobalValue("");
    const cleared: Record<string, ItemDiscountState> = {};
    items.forEach((item) => {
      cleared[item.id] = { type: "percentage", value: "" };
    });
    setItemDiscounts(cleared);
  };

  const handleApply = () => {
    const maxPct = maxDiscountPercentage;
    const globalNumValue = parseFloat(globalValue);

    if (!isNaN(globalNumValue) && globalNumValue > 0) {
      if (globalType === "percentage" && globalNumValue > maxPct) {
        toast.error(`El descuento maximo permitido es ${maxPct}%`);
        return;
      }
      if (globalType === "fixed") {
        const subtotal = items.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0,
        );
        const effectivePct =
          subtotal > 0 ? (globalNumValue / subtotal) * 100 : 0;
        if (effectivePct > maxPct) {
          toast.error(
            `El descuento maximo permitido es ${maxPct}% (el monto ingresado equivale a ${effectivePct.toFixed(1)}%)`,
          );
          return;
        }
      }
    }

    for (const item of items) {
      const itemDiscount = itemDiscounts[item.id];
      if (!itemDiscount?.value) continue;
      const numValue = parseFloat(itemDiscount.value);
      if (isNaN(numValue) || numValue <= 0) continue;
      if (itemDiscount.type === "percentage" && numValue > maxPct) {
        toast.error(
          `Descuento maximo permitido es ${maxPct}% (producto: ${item.name})`,
        );
        return;
      }
      if (itemDiscount.type === "fixed") {
        const itemSubtotal = item.price * item.quantity;
        const effectivePct =
          itemSubtotal > 0
            ? ((numValue * item.quantity) / itemSubtotal) * 100
            : 0;
        if (effectivePct > maxPct) {
          toast.error(
            `Descuento maximo permitido es ${maxPct}% (producto: ${item.name}, equivale a ${effectivePct.toFixed(1)}%)`,
          );
          return;
        }
      }
    }

    if (!isNaN(globalNumValue) && globalNumValue > 0) {
      onApplyGlobalDiscount({ type: globalType, value: globalNumValue });
    } else {
      onApplyGlobalDiscount(null);
    }

    items.forEach((item) => {
      const itemDiscount = itemDiscounts[item.id];
      if (itemDiscount) {
        const numValue = parseFloat(itemDiscount.value);
        if (!isNaN(numValue) && numValue > 0) {
          onApplyItemDiscount(item.id, {
            type: itemDiscount.type,
            value: numValue,
          });
        } else {
          onApplyItemDiscount(item.id, null);
        }
      }
    });

    onClose();
  };

  // Preview calculation
  const calculatePreview = () => {
    let subtotal = 0;
    let totalItemDiscounts = 0;

    items.forEach((item) => {
      const itemSubtotal = item.price * item.quantity;
      subtotal += itemSubtotal;
      const itemDiscount = itemDiscounts[item.id];
      if (itemDiscount && itemDiscount.value) {
        const numValue = parseFloat(itemDiscount.value) || 0;
        if (itemDiscount.type === "percentage") {
          totalItemDiscounts += itemSubtotal * (numValue / 100);
        } else {
          totalItemDiscounts += Math.min(
            numValue * item.quantity,
            itemSubtotal,
          );
        }
      }
    });

    const afterItemDiscounts = subtotal - totalItemDiscounts;
    let globalDiscountAmount = 0;
    const globalNumValue = parseFloat(globalValue) || 0;
    if (globalNumValue > 0) {
      if (globalType === "percentage") {
        globalDiscountAmount = afterItemDiscounts * (globalNumValue / 100);
      } else {
        globalDiscountAmount = Math.min(globalNumValue, afterItemDiscounts);
      }
    }

    return {
      subtotal,
      itemDiscounts: totalItemDiscounts,
      globalDiscount: globalDiscountAmount,
      total: Math.max(0, afterItemDiscounts - globalDiscountAmount),
    };
  };

  const preview = calculatePreview();
  const hasPreview = preview.itemDiscounts > 0 || preview.globalDiscount > 0;

  return (
    <DialogContent className="sm:max-w-lg w-full max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
      {/* Header */}
      <DialogHeader className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground">
            <Tag className="h-4 w-4 text-background" />
          </div>
          <div>
            <DialogTitle className="text-base font-semibold">
              Descuentos
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Aplica descuentos globales o por producto
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <Separator />

      {/* Content with tabs */}
      <Tabs
        defaultValue="global"
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="px-6 pt-4">
          <TabsList className="w-full grid grid-cols-2 h-9">
            <TabsTrigger value="global" className="text-xs gap-1.5">
              <Tag className="h-3 w-3" />
              Global
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs gap-1.5">
              <ShoppingBag className="h-3 w-3" />
              Por producto
              {itemsWithDiscountsCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 min-w-4 px-1 text-[10px] font-medium"
                >
                  {itemsWithDiscountsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Global Tab */}
        <TabsContent value="global" className="flex-1 px-6 py-4 mt-0">
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              El descuento global se aplica sobre el subtotal de toda la venta.
            </p>
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tipo y valor
              </label>
              <div className="flex items-center gap-2">
                <TypeToggle value={globalType} onChange={setGlobalType} />
                <div className="relative flex-1">
                  <Input
                    type="number"
                    min={0}
                    max={globalType === "percentage" ? 100 : undefined}
                    step="0.01"
                    placeholder={globalType === "percentage" ? "0" : "0.00"}
                    value={globalValue}
                    onChange={(e) => setGlobalValue(e.target.value)}
                    className="h-9 pr-8 text-sm tabular-nums [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    {globalType === "percentage" ? "%" : "$"}
                  </span>
                </div>
                {globalValue && parseFloat(globalValue) > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setGlobalValue("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="mt-0">
          <div className="px-6 pt-4 pb-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {items.length} producto{items.length !== 1 ? "s" : ""} en el
              carrito
            </p>
          </div>
          <ScrollArea
            className={cn(
              "w-full px-6 mb-4",
              // Si hay más de 3 productos, fijamos la altura para forzar el scroll
              // Si hay menos, dejamos que crezca naturalmente hasta el max-h del Dialog
              items.length > 3 ? "h-[400px]" : "h-auto",
            )}
          >
            <div className="space-y-2">
              {items.map((item) => {
                const itemDiscount = itemDiscounts[item.id];
                const hasValue =
                  itemDiscount?.value && parseFloat(itemDiscount.value) > 0;

                return (
                  <div
                    key={item.id}
                    className={`group rounded-lg border p-3 transition-colors ${
                      hasValue
                        ? "border-foreground/15 bg-foreground/[0.02]"
                        : "bg-card"
                    }`}
                  >
                    {/* Product info row */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug line-clamp-1">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.sku}
                          <span className="mx-1.5 text-border">{"/"}</span>
                          {formatPrice(item.price)} x {item.quantity}
                        </p>
                      </div>
                      <span className="text-xs font-medium tabular-nums shrink-0 pt-0.5">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>

                    {/* Discount controls row */}
                    <div className="flex items-center gap-2">
                      <TypeToggle
                        value={itemDiscount?.type || "percentage"}
                        onChange={(v) =>
                          handleItemDiscountChange(item.id, "type", v)
                        }
                      />
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          min={0}
                          max={
                            itemDiscount?.type === "percentage"
                              ? 100
                              : undefined
                          }
                          step="0.01"
                          placeholder={
                            itemDiscount?.type === "percentage" ? "0" : "0.00"
                          }
                          value={itemDiscount?.value || ""}
                          onChange={(e) =>
                            handleItemDiscountChange(
                              item.id,
                              "value",
                              e.target.value,
                            )
                          }
                          className="h-8 pr-8 text-sm tabular-nums [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">
                          {itemDiscount?.type === "percentage" ? "%" : "$"}
                        </span>
                      </div>
                      {hasValue && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveItemDiscount(item.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="border-t bg-muted/30 px-6 py-4 space-y-3">
        {/* Preview */}
        {hasPreview && (
          <div className="rounded-lg bg-background border p-3 text-sm space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span className="text-xs">Subtotal</span>
              <span className="text-xs tabular-nums">
                {formatPrice(preview.subtotal)}
              </span>
            </div>
            {preview.itemDiscounts > 0 && (
              <div className="flex justify-between text-foreground">
                <span className="text-xs">Desc. por producto</span>
                <span className="text-xs tabular-nums font-medium">
                  -{formatPrice(preview.itemDiscounts)}
                </span>
              </div>
            )}
            {preview.globalDiscount > 0 && (
              <div className="flex justify-between text-foreground">
                <span className="text-xs">Descuento global</span>
                <span className="text-xs tabular-nums font-medium">
                  -{formatPrice(preview.globalDiscount)}
                </span>
              </div>
            )}
            <Separator className="my-1" />
            <div className="flex justify-between font-semibold">
              <span className="text-sm">Total</span>
              <span className="text-sm tabular-nums">
                {formatPrice(preview.total)}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <div>
            {hasAnyDiscounts() && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveAllDiscounts}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 text-xs gap-1.5"
              >
                <Trash2 className="h-3 w-3" />
                Eliminar todos
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="h-8 text-xs px-6"
            >
              Aplicar
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
