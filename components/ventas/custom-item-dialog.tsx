"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toast } from "sonner";
import { CurrencyInput } from "../ui/currency-input";

interface CustomItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem: (
    name: string,
    price: number,
    quantity: number,
    taxRate: number,
    type: string,
  ) => void;
}

export function CustomItemDialog({
  open,
  onOpenChange,
  onAddItem,
}: CustomItemDialogProps) {
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState<number>(0);
  const [customItemQuantity, setCustomItemQuantity] = useState<string>("1");
  const [customItemTaxRate, setCustomItemTaxRate] = useState("21%");
  const [customItemType, setCustomItemType] = useState("product");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (customItemPrice <= 0) {
      toast.error("Por favor, ingrese un precio válido");
      return;
    }

    const quantity = parseInt(customItemQuantity) || 1;
    if (quantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    const taxRate =
      customItemTaxRate === "exento" ? 0 : parseFloat(customItemTaxRate);

    onAddItem(
      customItemName || `Concepto Adicional`,
      customItemPrice,
      quantity,
      taxRate,
      customItemType,
    );

    // Reset form
    setCustomItemName("");
    setCustomItemPrice(0);
    setCustomItemQuantity("1");
    setCustomItemTaxRate("21%");
    setCustomItemType("product");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar ítem personalizado</DialogTitle>
          <DialogDescription className="hidden" />
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="flex select-none items-center gap-2 font-medium text-sm leading-none">
              Nombre (opcional)
            </label>
            <Input
              placeholder="Concepto adicional"
              value={customItemName}
              onChange={(e) => setCustomItemName(e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex select-none items-center gap-2 font-medium text-sm leading-none">
                Precio unitario ($)
              </label>
              <CurrencyInput
                placeholder="$ 0"
                value={customItemPrice} // ← Número
                onValueChange={(value) => setCustomItemPrice(value)}
              />
            </div>

            <div className="space-y-2">
              <label className="flex select-none items-center gap-2 font-medium text-sm leading-none">
                Cantidad
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={customItemQuantity}
                onChange={(e) => {
                  // Solo permitir números
                  const value = e.target.value.replace(/\D/g, "");
                  setCustomItemQuantity(value);
                }}
                onFocus={(e) => e.target.select()}
                required
                className=" [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
              />
            </div>
          </div>

          <div className="space-y-2 w-fit">
            <label className="flex select-none items-center gap-2 font-medium text-sm leading-none">
              Alícuota IVA
            </label>
            <Select
              value={customItemTaxRate}
              onValueChange={setCustomItemTaxRate}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar alícuota" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="27%">27%</SelectItem>
                <SelectItem value="21%">21%</SelectItem>
                <SelectItem value="10.5%">10,5%</SelectItem>
                <SelectItem value="5%">5%</SelectItem>
                <SelectItem value="2.5%">2,5%</SelectItem>
                <SelectItem value="0%">0%</SelectItem>
                <SelectItem value="exento">Exento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 w-fit">
            <label className="flex select-none items-center gap-2 font-medium text-sm leading-none">
              Tipo de concepto
            </label>
            <Select value={customItemType} onValueChange={setCustomItemType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Producto</SelectItem>
                <SelectItem value="service">Servicio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Agregar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
