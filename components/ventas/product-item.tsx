"use client";

import { Package } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import type { ProductForSale } from "@/lib/services/sales";
import { formatPrice } from "@/lib/validations/sale";

interface ProductItemProps {
  product: ProductForSale;
  onClick: (product: ProductForSale) => void;
}

export function ProductItem({ product, onClick }: ProductItemProps) {
  const hasStock = product.stockQuantity > 0;
  const lowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;

  return (
    <button
      type="button"
      onClick={() => onClick(product)}
      className="flex w-full items-center gap-3 rounded-lg bg-card p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Product image or icon */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          <Package className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      {/* Product info */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 text-sm font-medium leading-tight">
          {product.name}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            SKU:{product.sku}
          </span>
          {lowStock && (
            <Badge
              variant="secondary"
              className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px] px-1.5 py-0 border-none"
            >
              Stock bajo
            </Badge>
          )}

          {/* Badge de Sin Stock */}
          {!hasStock && (
            <Badge
              variant="secondary"
              className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] px-1.5 py-0 border-none"
            >
              Sin stock
            </Badge>
          )}
        </div>
      </div>

      {/* Price and stock */}
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="font-semibold text-sm">
          {formatPrice(product.price)}
        </span>
        <span className="text-xs text-muted-foreground">
          {product.stockQuantity} en stock
        </span>
      </div>
    </button>
  );
}
