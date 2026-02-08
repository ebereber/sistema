"use client";

import type { LabelProduct } from "@/components/productos/labels/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";

interface ChangeLabelQuantitiesPopoverProps {
  selectedProducts: string[];
  products: LabelProduct[];
  onSave: (quantities: Record<string, number>) => void;
  onClose: () => void;
}

export function ChangeLabelQuantitiesPopover({
  selectedProducts,
  products,
  onSave,
  onClose,
}: ChangeLabelQuantitiesPopoverProps) {
  const selectedProductsData = products.filter((p) =>
    selectedProducts.includes(p.id),
  );

  const [mode, setMode] = useState<"match_stock" | "value">("match_stock");
  const [fixedValue, setFixedValue] = useState<string>("");

  const handleApply = () => {
    let newQuantities: Record<string, number> = {};

    if (mode === "match_stock") {
      newQuantities = selectedProductsData.reduce(
        (acc, product) => ({
          ...acc,
          [product.id]: product.stock,
        }),
        {},
      );
    } else {
      const value = parseInt(fixedValue) || 0;
      newQuantities = selectedProductsData.reduce(
        (acc, product) => ({
          ...acc,
          [product.id]: value,
        }),
        {},
      );
    }

    onSave(newQuantities);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="font-medium text-sm">Cantidad a imprimir</div>

      <RadioGroup
        value={mode}
        onValueChange={(value) => setMode(value as "match_stock" | "value")}
        className="grid gap-3"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="match_stock" id="match_stock" />
          <Label htmlFor="match_stock" className="font-normal">
            Coincidir con stock
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="value" id="value" />
          <Label htmlFor="value" className="font-normal">
            Valor fijo
          </Label>
        </div>
      </RadioGroup>

      {mode === "value" && (
        <Input
          type="number"
          min="0"
          placeholder="Cantidad"
          value={fixedValue}
          onChange={(e) => setFixedValue(e.target.value)}
          className="w-full"
        />
      )}

      <Button onClick={handleApply} className="w-full">
        Aplicar
      </Button>
    </div>
  );
}
