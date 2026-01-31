"use client";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ImageIcon, Search } from "lucide-react";
import { useState } from "react";

// Tipos
export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  cost?: number | string;
  stock?: number;
  // Puedes agregar más campos según tus necesidades
}

interface ProductSelectorProps {
  products: Product[];
  selectedProductIds?: string[];
  onAddProducts: (productIds: string[]) => void;
  onAddCustomItem?: () => void;
  formatCurrency?: (value: number) => string;
  getProductStock?: (product: Product) => React.ReactNode;
  buttonLabel?: string;
  buttonSize?: "default" | "sm" | "lg" | "icon";
  buttonVariant?:
    | "default"
    | "outline"
    | "ghost"
    | "destructive"
    | "secondary"
    | "link";
  showCustomItemOption?: boolean;
  showStockColumn?: boolean;
  showCostColumn?: boolean;
}

export function ProductSelector({
  products,
  selectedProductIds = [],
  onAddProducts,
  onAddCustomItem,
  formatCurrency = (value: number) => `$ ${value.toFixed(2)}`,
  getProductStock = (product: Product) => product.stock || 0,
  buttonLabel = "Agregar productos",
  buttonSize = "sm",
  buttonVariant = "outline",
  showCustomItemOption = true,
  showStockColumn = true,
  showCostColumn = true,
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleProductSelection = (productId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleAddSelectedProducts = () => {
    onAddProducts(Array.from(selectedIds));
    setSelectedIds(new Set());
    setOpen(false);
  };

  const handleAddCustomItem = () => {
    onAddCustomItem?.();
    setOpen(false);
  };

  return (
    <div className="flex gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant={buttonVariant} size={buttonSize}>
            <Search className="mr-2 h-4 w-4" />
            {buttonLabel}
          </Button>
        </DialogTrigger>
        <DialogContent className="flex h-[80vh] max-w-2xl flex-col overflow-hidden p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>{buttonLabel}</DialogTitle>
          </DialogHeader>
          <Command className="flex h-full w-full flex-col overflow-hidden">
            <CommandInput placeholder="Buscá productos por nombre o SKU…" />
            <CommandList className="relative flex-1 overflow-y-auto">
              {/* Header Row */}
              <div className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background px-3 py-2 text-sm font-medium text-muted-foreground">
                <div className="flex-1">Producto</div>
                {showStockColumn && (
                  <div className="hidden min-w-20 text-right sm:block">
                    Stock
                  </div>
                )}
                {showCostColumn && (
                  <div className="hidden min-w-28 text-right sm:block">
                    Costo
                  </div>
                )}
              </div>

              <CommandEmpty>No se encontraron productos</CommandEmpty>

              <CommandGroup>
                {products.map((product) => {
                  const alreadyAdded = selectedProductIds.includes(product.id);
                  const isSelected = selectedIds.has(product.id);

                  return (
                    <CommandItem
                      key={product.id}
                      value={`${product.name} ${product.sku || ""}`}
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
                        {showStockColumn && (
                          <div className="min-w-20 text-right">
                            {getProductStock(product)}
                          </div>
                        )}
                        {showCostColumn && (
                          <div className="min-w-28 text-right font-semibold">
                            {formatCurrency(Number(product.cost) || 0)}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>

          {selectedIds.size > 0 && (
            <DialogFooter className="border-t p-4">
              <Button onClick={handleAddSelectedProducts} className="w-full">
                Agregar {selectedIds.size} producto
                {selectedIds.size > 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {showCustomItemOption && onAddCustomItem && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={buttonVariant} size={buttonSize}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleAddCustomItem}>
              Ítem personalizado
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
