"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { deletePurchase } from "@/lib/services/purchases";

interface DeletePurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId: string;
  voucherNumber: string;
  hasReceivedProducts?: boolean;
  onSuccess?: () => void;
}

export function DeletePurchaseDialog({
  open,
  onOpenChange,
  purchaseId,
  voucherNumber,
  hasReceivedProducts,
  onSuccess,
}: DeletePurchaseDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePurchase(purchaseId);
      toast.success("Compra eliminada correctamente");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error deleting purchase:", error);
      const message =
        error instanceof Error ? error.message : "Error al eliminar la compra";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Estás seguro que querés eliminar esta compra?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente la compra {voucherNumber}.
            {hasReceivedProducts && (
              <span className="block mt-2 text-amber-600">
                ⚠️ Los productos recibidos serán descontados del stock.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
