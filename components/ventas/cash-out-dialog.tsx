"use client";

import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Minus } from "lucide-react";
import { useState } from "react";

interface CashOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amount: number, notes?: string) => Promise<void>;
  maxAmount?: number;
}

export function CashOutDialog({
  open,
  onOpenChange,
  onConfirm,
  maxAmount,
}: CashOutDialogProps) {
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (amount <= 0) return;

    setIsSubmitting(true);
    try {
      await onConfirm(amount, notes || undefined);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount(0);
    setNotes("");
    onOpenChange(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Minus className="h-5 w-5 text-red-600" />
            Retirar efectivo
          </DialogTitle>
          <DialogDescription>
            Ingresá el monto de efectivo que vas a retirar de la caja.
            {maxAmount !== undefined && (
              <span className="block mt-1">
                Monto disponible: {formatCurrency(maxAmount)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Monto</Label>
            <CurrencyInput
              id="amount"
              value={amount}
              onValueChange={setAmount}
              placeholder="0"
              className="w-full"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Nota</Label>
            <Textarea
              id="notes"
              placeholder="Opcional: agregá una nota sobre este retiro"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={amount <= 0 || isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? "Retirando..." : "Retirar efectivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
