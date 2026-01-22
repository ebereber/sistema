"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

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
  onDiscountClick: (item: CartItemType) => void;
}

export function CartItem({
  item,
  onQuantityChange,
  onRemove,
  onDiscountClick,
}: CartItemProps) {
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

  const formatDiscount = (discount: ItemDiscount): string => {
    if (discount.type === "percentage") {
      return `-${discount.value}%`;
    }
    return `-${formatPrice(discount.value)}`;
  };

  return (
    <div className="group relative flex animate-in fade-in-0 items-center gap-3  py-2 duration-200 last:border-b-0">
      {/* Header: Name and remove button */}

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 md:text-sm text-xs font-medium  leading-tight">
          {item.name}
        </p>
        <div className="flex gap-2">
          <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
          <span className="text-xs text-muted-foreground">
            {formatPrice(item.price)}
          </span>
          {hasDiscount && item.discount && (
            <span
              className="cursor-pointer text-green-600 dark:text-green-500  text-xs"
              onClick={() => onDiscountClick(item)}
            >
              {formatDiscount(item.discount)} OFF
            </span>
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
      {/*  <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Eliminar</span>
        </Button> */}
      <div className="w-20 text-right flex flex-col">
        {hasDiscount && (
          <span className="text-xs text-muted-foreground line-through">
            {formatPrice(item.price * item.quantity)}
          </span>
        )}
        <span className="font-semibold text-sm">{formatPrice(itemTotal)}</span>
      </div>

      {/* Price and quantity row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/*  <span className="text-sm text-muted-foreground">
            {formatPrice(item.price)}
          </span> */}

          {/*  {!hasDiscount && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => onDiscountClick(item)}
            >
              <Percent className="mr-1 h-3 w-3" />
              Desc.
            </Button>
          )} */}
        </div>
      </div>

      {/* Total row */}
    </div>
  );
}
