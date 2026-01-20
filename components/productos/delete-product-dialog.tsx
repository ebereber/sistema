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

import { deleteProduct, type Product } from "@/lib/services/products";

interface DeleteProductDialogProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteProductDialog({
  product,
  onClose,
  onSuccess,
}: DeleteProductDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleConfirm() {
    setIsLoading(true);
    try {
      await deleteProduct(product.id);

      toast.success("Producto eliminado", {
        description: `${product.name} fue eliminado correctamente`,
      });

      onSuccess();
    } catch (error: unknown) {
      console.error("Error deleting product:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";

      // If it has references, it was archived instead
      if (errorMessage.includes("referencias") || errorMessage.includes("archivado")) {
        toast.success("Producto archivado", {
          description:
            "El producto tiene referencias y fue archivado en su lugar",
        });
        onSuccess();
      } else {
        toast.error("Error", {
          description: "No se pudo eliminar el producto",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Estás seguro que querés eliminar este producto?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Esta acción eliminará permanentemente el producto &quot;
                {product.name}&quot;.
              </p>
              <p>Si el producto se usó en alguna operación, será archivado.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Eliminando..." : "Eliminar producto"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
