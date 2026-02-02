"use client";

import {
  ChevronDown,
  ChevronUp,
  DollarSign,
  Percent,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatPrice,
  type CartItem,
  type DiscountType,
  type GlobalDiscount,
  type ItemDiscount,
} from "@/lib/validations/sale";
import { toast } from "sonner";

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
  // Se inicializa al montar, no necesita useEffect
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
  const [isProductSectionOpen, setIsProductSectionOpen] = useState(true);

  // Check if there are any discounts
  const hasAnyDiscounts = (): boolean => {
    if (globalDiscount) return true;
    return items.some((item) => item.discount !== null);
  };

  // Count items with discounts
  const itemsWithDiscountsCount = items.filter(
    (item) => item.discount !== null,
  ).length;

  // Handle item discount change
  const handleItemDiscountChange = (
    itemId: string,
    field: "type" | "value",
    newValue: string,
  ) => {
    setItemDiscounts((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: newValue,
      },
    }));
  };

  // Remove item discount
  const handleRemoveItemDiscount = (itemId: string) => {
    setItemDiscounts((prev) => ({
      ...prev,
      [itemId]: {
        type: "percentage",
        value: "",
      },
    }));
  };

  // Remove all discounts
  const handleRemoveAllDiscounts = () => {
    setGlobalValue("");
    const clearedItemDiscounts: Record<string, ItemDiscountState> = {};
    items.forEach((item) => {
      clearedItemDiscounts[item.id] = {
        type: "percentage",
        value: "",
      };
    });
    setItemDiscounts(clearedItemDiscounts);
  };

  const handleApply = () => {
    const maxPct = maxDiscountPercentage;

    // Validar descuento global
    const globalNumValue = parseFloat(globalValue);
    if (!isNaN(globalNumValue) && globalNumValue > 0) {
      if (globalType === "percentage" && globalNumValue > maxPct) {
        toast.error(`El descuento máximo permitido es ${maxPct}%`);
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
            `El descuento máximo permitido es ${maxPct}% (el monto ingresado equivale a ${effectivePct.toFixed(1)}%)`,
          );
          return;
        }
      }
    }

    // Validar descuentos por producto
    for (const item of items) {
      const itemDiscount = itemDiscounts[item.id];
      if (!itemDiscount?.value) continue;

      const numValue = parseFloat(itemDiscount.value);
      if (isNaN(numValue) || numValue <= 0) continue;

      if (itemDiscount.type === "percentage" && numValue > maxPct) {
        toast.error(
          `Descuento máximo permitido es ${maxPct}% (producto: ${item.name})`,
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
            `Descuento máximo permitido es ${maxPct}% (producto: ${item.name}, equivale a ${effectivePct.toFixed(1)}%)`,
          );
          return;
        }
      }
    }

    // Si pasó validación, aplicar
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

  // Calculate preview
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

    const total = afterItemDiscounts - globalDiscountAmount;

    return {
      subtotal,
      itemDiscounts: totalItemDiscounts,
      globalDiscount: globalDiscountAmount,
      total: Math.max(0, total),
    };
  };

  const preview = calculatePreview();

  return (
    <DialogContent className="sm:max-w-185 w-full  max-h-[85vh] flex flex-col">
      <DialogHeader>
        <DialogTitle className="text-sm">Descuentos</DialogTitle>
        <DialogDescription className="hidden"></DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto space-y-6 py-4">
        {/* Global discount section */}
        <div className="space-y-3">
          <div className="flex  items-center justify-between rounded-md border bg-muted p-4 ">
            <h3 className="font-medium text-sm">Descuento global</h3>
            <div className="flex items-center gap-2">
              <Select
                value={globalType}
                onValueChange={(v) => setGlobalType(v as DiscountType)}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <div className="flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                    </div>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1">
                <Input
                  type="number"
                  min={0}
                  max={globalType === "percentage" ? 100 : undefined}
                  step="0.01"
                  placeholder={
                    globalType === "percentage" ? "Ej. 10" : "Ej. 100"
                  }
                  value={globalValue}
                  onChange={(e) => setGlobalValue(e.target.value)}
                  className="h-8 w-28  [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {globalType === "percentage" ? "%" : "$"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Item discounts section */}
        <Collapsible
          open={isProductSectionOpen}
          onOpenChange={setIsProductSectionOpen}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex justify-between rounded-md border bg-muted p-4 md:flex-row"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Descuentos por producto
                </span>
                {itemsWithDiscountsCount > 0 && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
                    {itemsWithDiscountsCount}
                  </span>
                )}
              </div>
              {isProductSectionOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            {items.map((item) => {
              const itemDiscount = itemDiscounts[item.id];
              const hasValue =
                itemDiscount?.value && parseFloat(itemDiscount.value) > 0;

              return (
                <div
                  key={item.id}
                  className="rounded-lg border p-3 space-y-2 flex justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className=" line-clamp-2 md:text-sm text-xs font-medium leading-tight">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.sku} • {formatPrice(item.price)} x {item.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={itemDiscount?.type || "percentage"}
                      onValueChange={(v) =>
                        handleItemDiscountChange(item.id, "type", v)
                      }
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">$</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="group relative flex-1">
                      <Input
                        type="number"
                        min={0}
                        max={
                          itemDiscount?.type === "percentage" ? 100 : undefined
                        }
                        step="0.01"
                        placeholder="Ej. 10%"
                        value={itemDiscount?.value || ""}
                        onChange={(e) =>
                          handleItemDiscountChange(
                            item.id,
                            "value",
                            e.target.value,
                          )
                        }
                        className="h-8 flex-1 w-28  [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                      />
                      {hasValue && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive absolute right-1 top-1"
                          onClick={() => handleRemoveItemDiscount(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* Preview */}
      </div>

      <DialogFooter className=" flex flex-col! gap-2  pt-4">
        {(preview.itemDiscounts > 0 || preview.globalDiscount > 0) && (
          <div className="rounded-lg border  p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(preview.subtotal)}</span>
            </div>
            {preview.itemDiscounts > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Desc. por producto</span>
                <span>-{formatPrice(preview.itemDiscounts)}</span>
              </div>
            )}
            {preview.globalDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento global</span>
                <span>-{formatPrice(preview.globalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Total</span>
              <span>{formatPrice(preview.total)}</span>
            </div>
          </div>
        )}
        <div className="flex justify-between flex-col gap-2 lg:flex-row">
          {hasAnyDiscounts() && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemoveAllDiscounts}
              className="text-destructive hover:text-destructive sm:mr-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar todos
            </Button>
          )}
          <div className="flex gap-2 sm:ml-auto lg:flex-row flex-col w-full justify-end">
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleApply}>
              Aplicar
            </Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
