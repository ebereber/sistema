"use client";

import { AlertTriangle, Archive, Info, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";

import {
  bulkArchive,
  getProductStatusCounts,
  type BulkFilters,
} from "@/lib/services/products";

interface BulkArchiveDialogProps {
  selectedIds: string[];
  filters?: BulkFilters;
  allSelected: boolean;
  totalCount: number;
  hasFilters: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkArchiveDialog({
  selectedIds,
  filters,
  allSelected,
  totalCount,
  hasFilters,
  open,
  onOpenChange,
  onSuccess,
}: BulkArchiveDialogProps) {
  const [action, setAction] = useState<"archive" | "activate">("archive");
  const [isLoading, setIsLoading] = useState(false);
  const [isCountingLoading, setIsCountingLoading] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  // Load counts when dialog opens
  useEffect(() => {
    if (!open) return;

    async function loadCounts() {
      setIsCountingLoading(true);
      try {
        const counts = await getProductStatusCounts({
          productIds: allSelected ? undefined : selectedIds,
          filters: allSelected ? filters : undefined,
        });
        setActiveCount(counts.active);
        setInactiveCount(counts.inactive);
      } catch (error) {
        console.error("Error loading product counts:", error);
        toast.error("Error al cargar información de productos");
      } finally {
        setIsCountingLoading(false);
      }
    }

    loadCounts();
  }, [open, allSelected, selectedIds, filters]);

  const count = allSelected ? totalCount : selectedIds.length;

  // Determine if action can be performed
  const canPerformAction =
    (action === "archive" && activeCount > 0) ||
    (action === "activate" && inactiveCount > 0);

  // Get the count for the selected action
  const actionCount = action === "archive" ? activeCount : inactiveCount;

  async function handleSubmit() {
    if (!canPerformAction) return;

    setIsLoading(true);
    try {
      const updated = await bulkArchive({
        productIds: allSelected ? undefined : selectedIds,
        filters: allSelected ? filters : undefined,
        archive: action === "archive",
      });

      toast.success(
        action === "archive" ? "Productos archivados" : "Productos activados",
        {
          description: `Se ${action === "archive" ? "archivaron" : "activaron"} ${updated} producto${updated !== 1 ? "s" : ""}`,
        },
      );

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error archiving products:", error);
      toast.error(
        `Error al ${action === "archive" ? "archivar" : "activar"} productos`,
      );
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setAction("archive");
    setActiveCount(0);
    setInactiveCount(0);
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
            <Archive className="h-5 w-5" />
            Archivar/Activar productos
          </DialogTitle>
          <DialogDescription asChild>
            {isCountingLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <span>
                {count} producto{count !== 1 ? "s" : ""} en la selección (
                {activeCount} activo{activeCount !== 1 ? "s" : ""},{" "}
                {inactiveCount} archivado{inactiveCount !== 1 ? "s" : ""})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {allSelected && !hasFilters && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No hay filtros aplicados. Esta acción afectará a{" "}
                <span className="font-semibold">todos los productos</span> del
                sistema.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Acción</Label>
            <RadioGroup
              value={action}
              onValueChange={(v: "archive" | "activate") => setAction(v)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="archive" id="archive" />
                <Label htmlFor="archive" className="font-normal cursor-pointer">
                  Archivar productos
                  <span className="block text-xs text-muted-foreground">
                    Los productos archivados no aparecerán en el listado
                    principal
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="activate" id="activate" />
                <Label
                  htmlFor="activate"
                  className="font-normal cursor-pointer"
                >
                  Activar productos
                  <span className="block text-xs text-muted-foreground">
                    Los productos activos estarán disponibles para la venta
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Status message based on action and counts */}
          {isCountingLoading ? (
            <Skeleton className="h-14 w-full rounded-lg" />
          ) : (
            <div className="rounded-lg bg-muted p-3 text-sm">
              {action === "archive" ? (
                activeCount > 0 ? (
                  <p>
                    Se{" "}
                    <span className="text-orange-600 font-medium">
                      archivarán
                    </span>{" "}
                    <span className="font-medium">{activeCount}</span> producto
                    {activeCount !== 1 ? "s" : ""} activo
                    {activeCount !== 1 ? "s" : ""}
                  </p>
                ) : (
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No hay productos activos que se puedan archivar en la
                      selección actual
                    </p>
                  </div>
                )
              ) : inactiveCount > 0 ? (
                <p>
                  Se{" "}
                  <span className="text-green-600 font-medium">activarán</span>{" "}
                  <span className="font-medium">{inactiveCount}</span> producto
                  {inactiveCount !== 1 ? "s" : ""} archivado
                  {inactiveCount !== 1 ? "s" : ""}
                </p>
              ) : (
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No hay productos archivados que se puedan activar en la
                    selección actual
                  </p>
                </div>
              )}
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
            disabled={isLoading || isCountingLoading || !canPerformAction}
            variant={action === "archive" ? "destructive" : "default"}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {action === "archive" ? "Archivando..." : "Activando..."}
              </>
            ) : action === "archive" ? (
              `Archivar ${actionCount > 0 ? actionCount : ""} producto${actionCount !== 1 ? "s" : ""}`
            ) : (
              `Activar ${actionCount > 0 ? actionCount : ""} producto${actionCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
