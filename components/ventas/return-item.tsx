import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/validations/sale";
import { Minus, Plus, Trash2 } from "lucide-react";

interface ReturnItemProps {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  maxQuantity: number;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function ReturnItem({
  id,
  name,
  sku,
  price,
  quantity,
  maxQuantity,
  onQuantityChange,
  onRemove,
}: ReturnItemProps) {
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      onQuantityChange(id, Math.min(value, maxQuantity));
    }
  };

  const handleIncrement = () => {
    if (quantity < maxQuantity) {
      onQuantityChange(id, quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      onQuantityChange(id, quantity - 1);
    }
  };

  return (
    <div className="group relative flex animate-in fade-in-0 items-center gap-3 py-2 duration-200">
      {/* Product info */}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 md:text-sm text-xs font-medium leading-tight">
          {name}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          {sku && (
            <span className="text-xs text-muted-foreground">SKU: {sku}</span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatPrice(price)}
          </span>
          <span className="text-xs text-muted-foreground">
            (máx: {maxQuantity})
          </span>
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
          {quantity === 1 ? (
            <Trash2 className="size-4" />
          ) : (
            <Minus className="size-4" />
          )}
        </Button>
        <Input
          type="number"
          min={1}
          max={maxQuantity}
          value={quantity}
          onChange={handleQuantityChange}
          className="h-8 w-14 rounded-none border-x text-center text-sm [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 rounded-l-none border-l-0"
          onClick={handleIncrement}
          disabled={quantity >= maxQuantity}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Price (negative/red) */}
      <div className="w-20 text-right">
        <span className="font-semibold text-sm text-red-600 dark:text-red-400">
          -{formatPrice(price * quantity)}
        </span>
      </div>
    </div>
  );
}
