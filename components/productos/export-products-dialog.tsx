"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { exportProductsAction } from "@/lib/actions/products";
import type { BulkFilters } from "@/lib/services/products";

interface ExportProductsDialogProps {
  selectedIds: Set<string>;
  allSelected: boolean;
  filters: BulkFilters;
  totalCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportProductsDialog({
  selectedIds,
  allSelected,
  filters,
  totalCount,
  open,
  onOpenChange,
}: ExportProductsDialogProps) {
  const hasSelection = selectedIds.size > 0;
  const selectionCount = allSelected ? totalCount : selectedIds.size;

  const [mode, setMode] = useState<"all" | "selected">(
    hasSelection ? "selected" : "all",
  );
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const base64 = await exportProductsAction({
        mode,
        productIds:
          mode === "selected" && !allSelected
            ? Array.from(selectedIds)
            : undefined,
        filters:
          mode === "all" || (mode === "selected" && allSelected)
            ? filters
            : undefined,
      });

      // Create download
      const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `productos-${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Exportación completada");
      onOpenChange(false);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al exportar", { description: msg });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar productos</DialogTitle>
          <DialogDescription>
            Exporta los productos a un archivo Excel (.xlsx)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {hasSelection ? (
            <RadioGroup
              value={mode}
              onValueChange={(v: "all" | "selected") => setMode(v)}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3">
                <RadioGroupItem
                  value="selected"
                  id="export-selected"
                  className="mt-0.5"
                />
                <Label
                  htmlFor="export-selected"
                  className="cursor-pointer font-normal"
                >
                  Productos seleccionados ({selectionCount})
                  <span className="block text-xs text-muted-foreground">
                    Solo los productos que seleccionaste
                  </span>
                </Label>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem
                  value="all"
                  id="export-all"
                  className="mt-0.5"
                />
                <Label
                  htmlFor="export-all"
                  className="cursor-pointer font-normal"
                >
                  Todos los productos
                  <span className="block text-xs text-muted-foreground">
                    Exportar todos los productos de la organización
                  </span>
                </Label>
              </div>
            </RadioGroup>
          ) : (
            <div className="flex items-center gap-3 rounded-md border p-3">
              <Download className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Todos los productos</p>
                <p className="text-xs text-muted-foreground">
                  Se exportarán todos los productos de la organización
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
