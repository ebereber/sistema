"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InventoryHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
}

export function InventoryHistoryDialog({
  open,
  onOpenChange,
  itemName,
}: InventoryHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historial de movimientos</DialogTitle>
          <DialogDescription>{itemName}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-muted-foreground text-sm text-center">
            No hay movimientos registrados para este producto.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
