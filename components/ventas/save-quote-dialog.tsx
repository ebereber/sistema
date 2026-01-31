"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createQuote } from "@/lib/services/quotes";
import type {
  CartItem,
  CartTotals,
  GlobalDiscount,
  SelectedCustomer,
} from "@/lib/validations/sale";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface SaveQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  customer: SelectedCustomer;
  globalDiscount: GlobalDiscount | null;
  note: string;
  totals: CartTotals;
  onSaved: () => void;
}

export function SaveQuoteDialog({
  open,
  onOpenChange,
  items,
  customer,
  globalDiscount,
  note,
  totals,
  onSaved,
}: SaveQuoteDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }

    setIsLoading(true);
    try {
      const quote = await createQuote({
        items,
        customer,
        globalDiscount,
        note,
        totals,
      });

      onOpenChange(false);
      onSaved();

      toast.success("Presupuesto guardado", {
        description: quote.quote_number,
        action: {
          label: "Ver",
          onClick: () => router.push(`/presupuestos/${quote.id}`),
        },
      });
    } catch (error) {
      console.error("Error saving quote:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al guardar presupuesto",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Guardar como presupuesto</DialogTitle>
          <DialogDescription>
            Se guardará el carrito actual ({items.length}{" "}
            {items.length === 1 ? "producto" : "productos"}) como presupuesto
            para{" "}
            <span className="font-medium text-foreground">{customer.name}</span>
            .
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || items.length === 0}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar presupuesto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
