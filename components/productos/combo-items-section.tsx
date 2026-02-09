"use client";

import { Minus, Package, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Product } from "@/lib/services/products";
import { ProductSearchDialog } from "../compras/product-search-dialog";

// ─── Types ────────────────────────────────────────────

export interface ComboItem {
  product_id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

interface ComboItemsSectionProps {
  items: ComboItem[];
  onItemsChange: (items: ComboItem[]) => void;
  priceAdjustment: number;
  onPriceAdjustmentChange: (value: number) => void;
  products: Product[];
  disabled?: boolean;
}

// ─── Helpers ──────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

// ─── Component ────────────────────────────────────────

export function ComboItemsSection({
  items,
  onItemsChange,
  priceAdjustment,
  onPriceAdjustmentChange,
  products,
  disabled,
}: ComboItemsSectionProps) {
  const excludedIds = useMemo(
    () => items.map((item) => item.product_id),
    [items],
  );

  const basePrice = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const finalPrice = basePrice + (basePrice * priceAdjustment) / 100;

  const handleProductsSelected = (selectedProducts: Product[]) => {
    const newItems: ComboItem[] = selectedProducts.map((p) => ({
      product_id: p.id,
      name: p.name,
      sku: p.sku,
      price: Number(p.price),
      quantity: 1,
    }));
    onItemsChange([...items, ...newItems]);
  };

  const handleRemoveProduct = (productId: string) => {
    onItemsChange(items.filter((item) => item.product_id !== productId));
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    onItemsChange(
      items.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: newQuantity }
          : item,
      ),
    );
  };

  return (
    <div className="space-y-6">
      {/* Products Card */}
      <Card>
        <CardHeader>
          <CardTitle>Productos del Combo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.sku} · {formatCurrency(item.price)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="ml-auto flex w-fit items-stretch">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-r-none border-r-0"
                            type="button"
                            disabled={disabled || item.quantity <= 1}
                            onClick={() =>
                              handleQuantityChange(
                                item.product_id,
                                item.quantity - 1,
                              )
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            max="999"
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(
                                item.product_id,
                                Number(e.target.value) || 1,
                              )
                            }
                            disabled={disabled}
                            className="h-8 w-14 rounded-none border-x-0 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-l-none border-l-0"
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              handleQuantityChange(
                                item.product_id,
                                item.quantity + 1,
                              )
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                            type="button"
                            disabled={disabled}
                            onClick={() => handleRemoveProduct(item.product_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
              <Package className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Agregá productos para armar el combo
              </p>
            </div>
          )}

          <ProductSearchDialog
            products={products}
            excludedProductIds={excludedIds}
            onProductsSelected={handleProductsSelected}
            formatCurrency={formatCurrency}
          />
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Precio base ({items.length} producto
                {items.length !== 1 ? "s" : ""})
              </span>
              <span className="text-sm text-muted-foreground">
                {formatCurrency(basePrice)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label
                  htmlFor="price-adjustment"
                  className="text-sm text-muted-foreground"
                >
                  Ajuste de precio
                </Label>
                <p className="text-xs text-muted-foreground">
                  Ej: -10 para 10% de descuento, 10 para 10% de aumento
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="price-adjustment"
                  type="number"
                  min="-100"
                  max="1000"
                  step="0.01"
                  value={priceAdjustment}
                  onChange={(e) =>
                    onPriceAdjustmentChange(Number(e.target.value) || 0)
                  }
                  disabled={disabled}
                  className="h-8 w-24 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="font-medium">Precio final</span>
              <span className="font-medium text-lg">
                {formatCurrency(finalPrice)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
