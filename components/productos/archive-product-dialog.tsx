"use client";

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

import {
  archiveProduct,
  activateProduct,
  type Product,
} from "@/lib/services/products";

interface ArchiveProductDialogProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export function ArchiveProductDialog({
  product,
  onClose,
  onSuccess,
}: ArchiveProductDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isActive = product.active;

  async function handleConfirm() {
    setIsLoading(true);
    try {
      if (isActive) {
        await archiveProduct(product.id);
        toast.success("Producto archivado", {
          description: `${product.name} fue archivado correctamente`,
        });
      } else {
        await activateProduct(product.id);
        toast.success("Producto activado", {
          description: `${product.name} fue activado correctamente`,
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error", {
        description: `No se pudo ${isActive ? "archivar" : "activar"} el producto`,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Estás seguro que querés {isActive ? "archivar" : "activar"} este
            producto?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción {isActive ? "archivará" : "activará"} el producto &quot;
            {product.name}&quot;.
            {isActive && " Podés desarchivarlo en cualquier momento."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              isActive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {isLoading
              ? isActive
                ? "Archivando..."
                : "Activando..."
              : isActive
                ? "Archivar producto"
                : "Activar producto"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
