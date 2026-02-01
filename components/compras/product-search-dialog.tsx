"use client";

import { Image as ImageIcon, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Product } from "@/lib/services/products";

interface ProductSearchDialogProps {
  products: Product[];
  excludedProductIds?: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onProductsSelected: (products: Product[]) => void;
  trigger?: React.ReactNode;
  formatCurrency?: (value: number) => string;
}

function defaultFormatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value);
}

function getProductStock(product: Product): number {
  if (Array.isArray(product.stock)) {
    return product.stock.reduce(
      (sum, s) => sum + ((s as { quantity?: number }).quantity || 0),
      0,
    );
  }
  return typeof product.stock === "number" ? product.stock : 0;
}

export function ProductSearchDialog({
  products,
  excludedProductIds = [],
  open,
  onOpenChange,
  onProductsSelected,
  trigger,
  formatCurrency = defaultFormatCurrency,
}: ProductSearchDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = (value: boolean) => {
    if (!isControlled) setInternalOpen(value);
    onOpenChange?.(value);
  };

  const excludedSet = new Set(excludedProductIds);

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleAddSelected = () => {
    const selected = products.filter((p) => selectedProductIds.has(p.id));
    onProductsSelected(selected);
    setSelectedProductIds(new Set());
    setIsOpen(false);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setSelectedProductIds(new Set());
    }
    setIsOpen(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Search className="mr-2 h-4 w-4" />
            Agregar productos
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex h-[80vh] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Agregar productos</DialogTitle>
        </DialogHeader>
        <Command className="flex h-full w-full flex-col overflow-hidden">
          <CommandInput placeholder="Buscá productos por nombre o SKU…" />
          <CommandList className="relative flex-1 overflow-y-auto">
            <div className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background px-3 py-2 text-sm font-medium text-muted-foreground">
              <div className="flex-1">Producto</div>
              <div className="hidden min-w-20 text-right sm:block">Stock</div>
              <div className="hidden min-w-28 text-right sm:block">Costo</div>
            </div>
            <CommandEmpty>No se encontraron productos</CommandEmpty>
            <CommandGroup>
              {products.map((product) => {
                const alreadyAdded = excludedSet.has(product.id);
                const isSelected = selectedProductIds.has(product.id);

                return (
                  <CommandItem
                    key={product.id}
                    value={`${product.name} ${product.sku}`}
                    onSelect={() =>
                      !alreadyAdded && toggleProductSelection(product.id)
                    }
                    disabled={alreadyAdded}
                    className="flex cursor-pointer items-center gap-3 px-3 py-1.5"
                  >
                    <Checkbox
                      checked={isSelected || alreadyAdded}
                      disabled={alreadyAdded}
                    />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.name}</span>
                        {alreadyAdded && (
                          <span className="text-sm text-muted-foreground">
                            (ya agregado)
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        SKU: {product.sku || "-"}
                      </div>
                    </div>
                    <div className="hidden items-center gap-1 sm:flex">
                      <div className="min-w-20 text-right">
                        {getProductStock(product)}
                      </div>
                      <div className="min-w-28 text-right font-semibold">
                        {formatCurrency(Number(product.cost) || 0)}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        {selectedProductIds.size > 0 && (
          <DialogFooter className="border-t p-4">
            <Button onClick={handleAddSelected} className="w-full">
              Agregar {selectedProductIds.size} producto
              {selectedProductIds.size > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
