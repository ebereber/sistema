"use client";

import { FolderTree, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CategoryCombobox } from "@/components/productos/category-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { bulkAssignCategoryAction } from "@/lib/actions/products";
import type { Category } from "@/lib/services/categories";
import type { BulkFilters } from "@/lib/services/products";

interface BulkCategoryAssignDialogProps {
  selectedIds: string[];
  filters?: BulkFilters;
  allSelected: boolean;
  totalCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categories: Category[];
}

export function BulkCategoryAssignDialog({
  selectedIds,
  filters,
  allSelected,
  totalCount,
  open,
  onOpenChange,
  onSuccess,
  categories,
}: BulkCategoryAssignDialogProps) {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const count = allSelected ? totalCount : selectedIds.length;

  async function handleSubmit() {
    setIsLoading(true);
    try {
      const updated = await bulkAssignCategoryAction({
        productIds: allSelected ? undefined : selectedIds,
        filters: allSelected ? filters : undefined,
        categoryId,
      });

      toast.success(`Categoría ${categoryId ? "asignada" : "removida"}`, {
        description: `Se actualizaron ${updated} producto${updated !== 1 ? "s" : ""}`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error assigning category:", error);
      toast.error("Error al asignar categoría");
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setCategoryId(null);
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
            <FolderTree className="h-5 w-5" />
            Asignar categoría
          </DialogTitle>
          <DialogDescription>
            Se asignará la categoría a {count} producto{count !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Categoría</Label>
            <CategoryCombobox value={categoryId} onChange={setCategoryId} categories={categories} />
            <p className="text-xs text-muted-foreground">
              Dejá vacío para quitar la categoría de los productos seleccionados
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Asignando...
              </>
            ) : categoryId ? (
              "Asignar categoría"
            ) : (
              "Quitar categoría"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
