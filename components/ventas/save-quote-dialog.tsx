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
import { toast } from "sonner";

interface SaveQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveQuoteDialog({ open, onOpenChange }: SaveQuoteDialogProps) {
  const handleSave = () => {
    toast.info("Funcionalidad próximamente", {
      description: "Guardar como presupuesto estará disponible pronto",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Guardar como presupuesto</DialogTitle>
          <DialogDescription>
            El carrito actual se guardará como presupuesto. Podrás convertirlo a
            venta más tarde.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar presupuesto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
