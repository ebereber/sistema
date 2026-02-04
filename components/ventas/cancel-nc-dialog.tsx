"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cancelCreditNoteAction } from "@/lib/actions/sales";
import type { SaleListItem } from "@/lib/services/sales";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CancelNCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditNote: SaleListItem | null;
  onSuccess: () => void;
}

export function CancelNCDialog({
  open,
  onOpenChange,
  creditNote,
  onSuccess,
}: CancelNCDialogProps) {
  const [stockOption, setStockOption] = useState<"revert" | "keep">("revert");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = async () => {
    if (!creditNote) return;

    try {
      setIsSubmitting(true);

      await cancelCreditNoteAction(creditNote.id, stockOption === "revert");

      toast.success("Nota de crédito anulada correctamente");
      onSuccess();
    } catch (error) {
      console.error("Error al anular nota de crédito:", error);
      toast.error("Error al anular la nota de crédito");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anular nota de crédito</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Se creará un comprobante interno que anula esta nota de crédito.
          </p>

          <div className="space-y-3">
            <Label className="text-sm font-medium">
              ¿Qué querés hacer con el stock?
            </Label>
            <RadioGroup
              value={stockOption}
              onValueChange={(value) =>
                setStockOption(value as "revert" | "keep")
              }
              className="space-y-3"
            >
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="revert" id="revert" className="mt-1" />
                <Label htmlFor="revert" className="cursor-pointer">
                  <div className="font-medium">
                    Revertir movimiento de stock
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Deshace el ajuste de stock que hizo la nota de crédito
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="keep" id="keep" className="mt-1" />
                <Label htmlFor="keep" className="cursor-pointer">
                  <div className="font-medium">Mantener stock actual</div>
                  <div className="text-sm text-muted-foreground">
                    No modifica el stock, solo anula los valores contables
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Anular nota de crédito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
