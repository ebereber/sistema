"use client";

import { AlertTriangle, Loader2, Trash } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  bulkDelete,
  checkProductsWithReferences,
  getAllProductIds,
  type BulkFilters,
} from "@/lib/services/products";

interface BulkDeleteDialogProps {
  selectedIds: string[];
  filters?: BulkFilters;
  allSelected: boolean;
  totalCount: number;
  hasFilters: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkDeleteDialog({
  selectedIds,
  filters,
  allSelected,
  totalCount,
  hasFilters,
  open,
  onOpenChange,
  onSuccess,
}: BulkDeleteDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [canDelete, setCanDelete] = useState<number>(0);
  const [hasReferences, setHasReferences] = useState<number>(0);

  const count = allSelected ? totalCount : selectedIds.length;

  const checkReferences = useCallback(async () => {
    setIsChecking(true);
    try {
      let idsToCheck = selectedIds;

      if (allSelected && filters) {
        idsToCheck = await getAllProductIds(filters);
      }

      const result = await checkProductsWithReferences(idsToCheck);
      setCanDelete(result.canDelete.length);
      setHasReferences(result.hasReferences.length);
    } catch (error) {
      console.error("Error checking references:", error);
    } finally {
      setIsChecking(false);
    }
  }, [selectedIds, allSelected, filters]);

  useEffect(() => {
    if (open) {
      checkReferences();
    }
  }, [open, checkReferences]);

  async function handleSubmit() {
    setIsLoading(true);
    try {
      const result = await bulkDelete({
        productIds: allSelected ? undefined : selectedIds,
        filters: allSelected ? filters : undefined,
      });

      const messages: string[] = [];
      if (result.deleted > 0) {
        messages.push(`${result.deleted} eliminado${result.deleted !== 1 ? "s" : ""}`);
      }
      if (result.archived > 0) {
        messages.push(`${result.archived} archivado${result.archived !== 1 ? "s" : ""}`);
      }

      toast.success("Operación completada", {
        description: messages.join(", "),
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting products:", error);
      toast.error("Error al eliminar productos");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setCanDelete(0);
      setHasReferences(0);
    }
    onOpenChange(newOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash className="h-5 w-5" />
            Eliminar productos
          </DialogTitle>
          <DialogDescription>
            Se eliminarán {count} producto{count !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {allSelected && !hasFilters && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Advertencia</AlertTitle>
              <AlertDescription>
                No hay filtros aplicados. Esta acción afectará a{" "}
                <span className="font-semibold">todos los productos</span> del sistema.
              </AlertDescription>
            </Alert>
          )}

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Acción irreversible</AlertTitle>
            <AlertDescription>
              Los productos eliminados no se pueden recuperar. Los productos con
              historial de ventas serán archivados en lugar de eliminados.
            </AlertDescription>
          </Alert>

          {isChecking ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">
                Verificando productos...
              </span>
            </div>
          ) : (
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-medium">Resumen de la operación:</p>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span>
                    <span className="font-medium">{canDelete}</span> producto
                    {canDelete !== 1 ? "s" : ""} se eliminará
                    {canDelete !== 1 ? "n" : ""} permanentemente
                  </span>
                </li>
                {hasReferences > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    <span>
                      <span className="font-medium">{hasReferences}</span> producto
                      {hasReferences !== 1 ? "s" : ""} se archivará
                      {hasReferences !== 1 ? "n" : ""} (tienen historial de ventas)
                    </span>
                  </li>
                )}
              </ul>
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
          <Button
            onClick={handleSubmit}
            disabled={isLoading || isChecking}
            variant="destructive"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              "Eliminar productos"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
