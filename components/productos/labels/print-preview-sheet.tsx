"use client";

import { LabelPreview } from "@/components/productos/labels/label-preview";
import type {
  LabelProduct,
  LabelSettings,
} from "@/components/productos/labels/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Pencil, Printer } from "lucide-react";

interface PrintPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: LabelProduct[];
  settings: LabelSettings;
  totalLabels: number;
  onOpenConfigure: () => void;
  onPrint: () => void;
}

export function PrintPreviewSheet({
  open,
  onOpenChange,
  products,
  settings,
  totalLabels,
  onOpenConfigure,
  onPrint,
}: PrintPreviewSheetProps) {
  const previewProduct = products[0];

  const calculateA4Labels = () => {
    const labelsPerRow = Math.floor(210 / settings.labelWidth);
    const labelsPerCol = Math.floor(297 / settings.labelHeight);
    return `${labelsPerRow} × ${labelsPerCol} = ${labelsPerRow * labelsPerCol}`;
  };

  const getContentText = () => {
    return settings.lines
      .map((line) => {
        switch (line.type) {
          case "name":
            return "Nombre";
          case "sku":
            return "SKU";
          case "price":
            return "Precio";
          case "custom":
            return "Personalizado";
          default:
            return "";
        }
      })
      .join(", ");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Imprimir etiquetas</SheetTitle>
          <SheetDescription>
            Vas a imprimir {totalLabels} etiqueta{totalLabels !== 1 ? "s" : ""}{" "}
            de {products.length} producto{products.length !== 1 ? "s" : ""}.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4">
          {/* Preview Section */}
          {previewProduct && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center rounded-lg border bg-white p-4">
                  <LabelPreview
                    settings={settings}
                    product={{
                      name: previewProduct.name,
                      sku: previewProduct.sku,
                      price: previewProduct.price,
                      barcode: previewProduct.barcode || previewProduct.sku,
                    }}
                  />
                </div>
                <div className="flex-1 space-y-1 text-sm">
                  <div className="font-medium">Vista previa</div>
                  <div className="text-muted-foreground">
                    Tamaño: {settings.labelWidth}mm × {settings.labelHeight}mm
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Summary */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Configuración</span>
              <Button variant="ghost" size="default" onClick={onOpenConfigure}>
                <Pencil className="mr-1 h-3 w-3" />
                Editar
              </Button>
            </div>
            <dl className="mt-2 space-y-1 text-muted-foreground text-sm">
              <div className="flex justify-between">
                <dt>Tamaño:</dt>
                <dd>
                  {settings.labelWidth}mm × {settings.labelHeight}mm
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Papel:</dt>
                <dd>
                  {settings.paperSize === "a4"
                    ? `Hoja A4 (${calculateA4Labels()} etiquetas)`
                    : "Individual"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Código de barras:</dt>
                <dd>{settings.showBarcode ? "Sí" : "No"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Contenido:</dt>
                <dd>{getContentText()}</dd>
              </div>
            </dl>
          </div>

          {/* Products Summary */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <span className="font-medium text-sm">Productos</span>
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between text-muted-foreground text-sm"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="ml-2 shrink-0">×{p.printQuantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button className="w-full" onClick={onPrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir {totalLabels} etiqueta{totalLabels !== 1 ? "s" : ""}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
