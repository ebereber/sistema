"use client";

import { DollarSign, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { bulkUpdatePricesAction } from "@/lib/actions/products";
import type { BulkFilters } from "@/lib/services/products";
import { createClient } from "@/lib/supabase/client";

interface BulkPriceUpdateDialogProps {
  selectedIds: string[];
  filters?: BulkFilters;
  allSelected: boolean;
  totalCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkPriceUpdateDialog({
  selectedIds,
  filters,
  allSelected,
  totalCount,
  open,
  onOpenChange,
  onSuccess,
}: BulkPriceUpdateDialogProps) {
  const [operation, setOperation] = useState<"increase" | "decrease">(
    "increase",
  );
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const count = allSelected ? totalCount : selectedIds.length;

  async function handleSubmit() {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error("Ingresá un valor válido mayor a 0");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Error de autenticación");
        return;
      }

      const updated = await bulkUpdatePricesAction({
        productIds: allSelected ? undefined : selectedIds,
        filters: allSelected ? filters : undefined,
        operation,
        type,
        value: numValue,
        userId: user.id,
      });

      toast.success(`Precios actualizados`, {
        description: `Se actualizaron ${updated} producto${updated !== 1 ? "s" : ""}`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error updating prices:", error);
      toast.error("Error al actualizar precios");
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setOperation("increase");
    setType("percentage");
    setValue("");
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Actualizar precios
          </DialogTitle>
          <DialogDescription>
            Se actualizarán los precios de {count} producto
            {count !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Operación</Label>
            <Select
              value={operation}
              onValueChange={(v) => setOperation(v as "increase" | "decrease")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">Aumentar</SelectItem>
                <SelectItem value="decrease">Disminuir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de ajuste</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as "percentage" | "fixed")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                <SelectItem value="fixed">Monto fijo ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor</Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                step={type === "percentage" ? "0.1" : "0.01"}
                placeholder={type === "percentage" ? "10" : "100.00"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="pr-8 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {type === "percentage" ? "%" : "$"}
              </span>
            </div>
          </div>

          {value && !isNaN(parseFloat(value)) && parseFloat(value) > 0 && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p>
                Se{" "}
                <span
                  className={
                    operation === "increase" ? "text-green-600" : "text-red-600"
                  }
                >
                  {operation === "increase" ? "aumentarán" : "disminuirán"}
                </span>{" "}
                los precios en{" "}
                <span className="font-medium">
                  {type === "percentage" ? `${value}%` : `$${value}`}
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !value}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              "Actualizar precios"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
