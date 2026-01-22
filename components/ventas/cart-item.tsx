"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  calculateItemDiscount,
  calculateItemTotal,
  formatPrice,
  type CartItem as CartItemType,
  type ItemDiscount,
} from "@/lib/validations/sale";

interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function CartItem({ item, onQuantityChange, onRemove }: CartItemProps) {
  const itemTotal = calculateItemTotal(item);
  const discountAmount = calculateItemDiscount(
    item.price,
    item.quantity,
    item.discount,
  );
  const hasDiscount = discountAmount > 0;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      onQuantityChange(item.id, value);
    }
  };

  const handleIncrement = () => {
    onQuantityChange(item.id, item.quantity + 1);
  };

  const handleDecrement = () => {
    if (item.quantity > 1) {
      onQuantityChange(item.id, item.quantity - 1);
    } else if (item.quantity === 1) {
      onRemove(item.id);
    }
  };

  const formatDiscountBadge = (discount: ItemDiscount): string => {
    if (discount.type === "percentage") {
      return `${discount.value}% OFF`;
    }
    return `${formatPrice(discount.value)} OFF`;
  };

  return (
    <div className="group relative flex animate-in fade-in-0 items-center gap-3 py-2 duration-200 last:border-b-0">
      {/* Product info */}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 md:text-sm text-xs font-medium leading-tight">
          {item.name}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">SKU: {item.sku}</span>
          <span className="text-xs text-muted-foreground">
            {formatPrice(item.price)}
          </span>
          {hasDiscount && item.discount && (
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px] px-1.5 py-0"
            >
              {formatDiscountBadge(item.discount)}
            </Badge>
          )}
        </div>
      </div>

      {/* Quantity controls */}
      <div className="ml-2 flex w-fit items-stretch">
        <Button
          variant="outline"
          size="icon"
          className="h-8 rounded-r-none border-r-0"
          onClick={handleDecrement}
        >
          {item.quantity === 1 ? (
            <Trash2 className="size-4" />
          ) : (
            <Minus className="size-4" />
          )}
          <span className="sr-only">Decrementar</span>
        </Button>
        <Input
          type="number"
          min={1}
          value={item.quantity}
          onChange={handleQuantityChange}
          className="h-8 w-14 rounded-none border-x text-center text-sm [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 rounded-l-none border-l-0"
          onClick={handleIncrement}
        >
          <Plus className="h-3 w-3" />
          <span className="sr-only">Incrementar</span>
        </Button>
      </div>

      {/* Price column */}
      <div className="w-20 text-right flex flex-col">
        {hasDiscount && (
          <span className="text-xs text-muted-foreground line-through">
            {formatPrice(item.price * item.quantity)}
          </span>
        )}
        <span className="font-semibold text-sm">{formatPrice(itemTotal)}</span>
      </div>
    </div>
  );
}
