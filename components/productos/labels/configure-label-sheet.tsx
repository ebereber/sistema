"use client";

import { ALargeSmall, Plus, Printer, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

import { LabelPreview } from "@/components/productos/labels/label-preview";
import { printLabels } from "@/components/productos/labels/print-labels";
import type {
  LabelProduct,
  LabelSettings,
} from "@/components/productos/labels/types";

// ─── Types ────────────────────────────────────────────

interface ConfigureLabelSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: LabelSettings;
  onSettingsChange: (settings: LabelSettings) => void;
  products?: LabelProduct[];
}

const LINE_TYPES = [
  { value: "name", label: "Nombre" },
  { value: "sku", label: "SKU" },
  { value: "price", label: "Precio" },
  { value: "custom", label: "Texto personalizado" },
] as const;

const FONT_SIZES = [
  { value: "small", label: "Chico", px: 8 },
  { value: "medium", label: "Mediano", px: 10 },
  { value: "large", label: "Grande", px: 12 },
] as const;

// ─── Component ────────────────────────────────────────

export function ConfigureLabelSheet({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  products = [],
}: ConfigureLabelSheetProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [productSearchOpen, setProductSearchOpen] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const updateSettings = (updates: Partial<LabelSettings>) => {
    setLocalSettings((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    onOpenChange(false);
  };

  const handleLabelSizeChange = (
    field: "labelWidth" | "labelHeight",
    value: string,
  ) => {
    const numValue = parseInt(value) || 0;
    if (numValue < 10 || numValue > 300) {
      updateSettings({ [field]: field === "labelWidth" ? 60 : 30 });
    } else {
      updateSettings({ [field]: numValue });
    }
  };

  const handleBlur = (field: "labelWidth" | "labelHeight") => {
    const currentValue = localSettings[field];
    if (!currentValue || currentValue < 10) {
      updateSettings({ [field]: field === "labelWidth" ? 60 : 30 });
    }
  };

  // ─── Lines ─────────────────────────────────────────

  const addLine = () => {
    if (localSettings.lines.length >= 3) return;
    const usedTypes = localSettings.lines.map((line) => line.type);
    const availableType =
      LINE_TYPES.find((type) => !usedTypes.includes(type.value))?.value ||
      "name";
    updateSettings({
      lines: [
        ...localSettings.lines,
        { type: availableType, fontSize: "small" },
      ],
    });
  };

  const removeLine = (index: number) => {
    updateSettings({
      lines: localSettings.lines.filter((_, i) => i !== index),
    });
  };

  const updateLine = (
    index: number,
    updates: Partial<LabelSettings["lines"][0]>,
  ) => {
    const newLines = [...localSettings.lines];
    if (updates.type) {
      const existingIndex = newLines.findIndex(
        (line, i) => i !== index && line.type === updates.type,
      );
      if (existingIndex !== -1) {
        newLines[existingIndex] = {
          ...newLines[existingIndex],
          type: newLines[index].type,
        };
      }
    }
    newLines[index] = { ...newLines[index], ...updates };
    updateSettings({ lines: newLines });
  };

  const getAvailableTypes = (currentIndex: number) => {
    const usedTypes = localSettings.lines
      .map((line, index) => (index !== currentIndex ? line.type : null))
      .filter(Boolean);
    return LINE_TYPES.map((type) => ({
      ...type,
      inUse: usedTypes.includes(type.value),
      lineNumber:
        localSettings.lines.findIndex((line) => line.type === type.value) + 1,
    }));
  };

  const calculateA4Labels = () => {
    const labelsPerRow = Math.floor(210 / localSettings.labelWidth);
    const labelsPerCol = Math.floor(297 / localSettings.labelHeight);
    return labelsPerRow * labelsPerCol;
  };

  // ─── Preview product ──────────────────────────────

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id === selectedProductId) || null;
  }, [selectedProductId, products]);

  const previewProductData = useMemo(() => {
    if (selectedProduct) {
      return {
        name: selectedProduct.name,
        sku: selectedProduct.sku,
        price: selectedProduct.price,
        barcode: selectedProduct.barcode || selectedProduct.sku,
      };
    }
    return undefined; // Use default from LabelPreview
  }, [selectedProduct]);

  // ─── Test print ────────────────────────────────────

  const handleTestPrint = () => {
    const product = selectedProduct || {
      id: "test",
      name: "Producto de prueba",
      sku: "TEST-001",
      barcode: "TEST-001",
      price: 15000,
      stock: 0,
      categoryId: null,
      printQuantity: 1,
    };

    printLabels([{ ...product, printQuantity: 1 }], localSettings);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="!max-w-4xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configurar etiqueta</SheetTitle>
          <SheetDescription>
            Configurá el diseño de las etiquetas para tus productos
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">
          <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-5 lg:gap-6">
            {/* Left Column - Configuration */}
            <div className="lg:col-span-3">
              <div className="space-y-6">
                {/* Paper Size Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tamaño de etiqueta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border px-3">
                      <div className="flex w-full flex-row items-center gap-2 border-b py-3">
                        <Label className="flex-auto">Tipo de papel</Label>
                        <RadioGroup
                          value={localSettings.paperSize}
                          onValueChange={(value) =>
                            updateSettings({
                              paperSize: value as "a4" | "custom",
                            })
                          }
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="a4" id="paper-a4" />
                            <Label htmlFor="paper-a4" className="font-normal">
                              Hoja A4
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="custom" id="paper-custom" />
                            <Label
                              htmlFor="paper-custom"
                              className="font-normal"
                            >
                              Personalizado
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="flex w-full flex-row items-center gap-2 py-3">
                        <div className="flex flex-1 flex-col gap-0.5">
                          <Label>
                            {localSettings.paperSize === "a4"
                              ? "Tamaño de cada etiqueta individual"
                              : "Dimensiones (mm)"}
                          </Label>
                          <p className="text-muted-foreground text-sm">
                            {localSettings.paperSize === "a4"
                              ? `${calculateA4Labels()} etiquetas por hoja A4`
                              : "Tamaño del papel de etiquetas"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="10"
                            max="300"
                            step="1"
                            value={localSettings.labelWidth}
                            onChange={(e) =>
                              handleLabelSizeChange(
                                "labelWidth",
                                e.target.value,
                              )
                            }
                            onBlur={() => handleBlur("labelWidth")}
                            className="w-20"
                          />
                          <span className="text-muted-foreground">×</span>
                          <Input
                            type="number"
                            min="10"
                            max="300"
                            step="1"
                            value={localSettings.labelHeight}
                            onChange={(e) =>
                              handleLabelSizeChange(
                                "labelHeight",
                                e.target.value,
                              )
                            }
                            onBlur={() => handleBlur("labelHeight")}
                            className="w-20"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Barcode Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Código de barras</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border px-3">
                      <div className="flex w-full flex-row items-center gap-2 py-3">
                        <div className="flex flex-1 flex-col gap-0.5">
                          <Label htmlFor="showBarcode">
                            Mostrar código de barras
                          </Label>
                          <p className="text-muted-foreground text-sm">
                            Se muestra en la parte superior de la etiqueta
                          </p>
                        </div>
                        <Switch
                          id="showBarcode"
                          checked={localSettings.showBarcode}
                          onCheckedChange={(checked) =>
                            updateSettings({ showBarcode: checked })
                          }
                        />
                      </div>

                      <div className="flex w-full flex-row items-center gap-2 border-t py-3">
                        <Label className="flex-auto">Campo a usar</Label>
                        <RadioGroup
                          value={localSettings.barcodeSource}
                          onValueChange={(value) =>
                            updateSettings({
                              barcodeSource: value as "sku" | "barcode",
                            })
                          }
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sku" id="barcode-sku" />
                            <Label
                              htmlFor="barcode-sku"
                              className="font-normal"
                            >
                              SKU
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="barcode"
                              id="barcode-barcode"
                            />
                            <Label
                              htmlFor="barcode-barcode"
                              className="font-normal"
                            >
                              Código de barras
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Content Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contenido</CardTitle>
                    <CardDescription>
                      Configurá el contenido de las etiquetas y su tamaño. Podés
                      agregar hasta 3 líneas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {localSettings.lines.map((line, index) => (
                        <div key={index} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-medium text-muted-foreground text-sm">
                              Línea {index + 1}
                            </span>
                            <Button
                              variant="ghost"
                              size="default"
                              onClick={() => removeLine(index)}
                              disabled={localSettings.lines.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="mt-3 space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <Select
                                value={line.type}
                                onValueChange={(value) =>
                                  updateLine(index, {
                                    type: value as LabelSettings["lines"][0]["type"],
                                    customText:
                                      value === "custom" ? "" : undefined,
                                  })
                                }
                              >
                                <SelectTrigger className="w-[220px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableTypes(index).map((type) => (
                                    <SelectItem
                                      key={type.value}
                                      value={type.value}
                                    >
                                      {type.label}
                                      {type.inUse &&
                                        ` (En línea ${type.lineNumber})`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select
                                value={line.fontSize}
                                onValueChange={(value) =>
                                  updateLine(index, {
                                    fontSize: value as
                                      | "small"
                                      | "medium"
                                      | "large",
                                  })
                                }
                              >
                                <SelectTrigger className="w-[140px]">
                                  <ALargeSmall className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FONT_SIZES.map((size) => (
                                    <SelectItem
                                      key={size.value}
                                      value={size.value}
                                    >
                                      {size.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {line.type === "custom" && (
                              <div className="space-y-2">
                                <Input
                                  placeholder="Ej: Precio: {precio}"
                                  value={line.customText || ""}
                                  onChange={(e) =>
                                    updateLine(index, {
                                      customText: e.target.value,
                                    })
                                  }
                                />
                                <p className="text-muted-foreground text-xs">
                                  Usá {"{precio}"}, {"{sku}"}, {"{nombre}"},{" "}
                                  {"{codigo}"} o fórmulas como {"{precio / 12}"}
                                  , {"{precio * 0.8}"}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {localSettings.lines.length < 3 && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={addLine}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar línea
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button onClick={handleSave}>Guardar configuración</Button>
                </div>
              </div>
            </div>

            {/* Right Column - Preview */}
            <div className="col-span-2">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Vista previa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <LabelPreview
                    settings={localSettings}
                    product={previewProductData}
                  />

                  <div className="text-center text-muted-foreground text-sm">
                    <p>
                      Tamaño: {localSettings.labelWidth}mm ×{" "}
                      {localSettings.labelHeight}mm
                    </p>
                    {localSettings.paperSize === "a4" && (
                      <p className="mt-1">
                        {Math.floor(210 / localSettings.labelWidth)} ×{" "}
                        {Math.floor(297 / localSettings.labelHeight)} ={" "}
                        {calculateA4Labels()} etiquetas por hoja A4
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    {/* Product selector */}
                    <Popover
                      open={productSearchOpen}
                      onOpenChange={setProductSearchOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between font-normal"
                        >
                          <span className="truncate text-left">
                            {selectedProduct
                              ? selectedProduct.name
                              : "Probar con un producto…"}
                          </span>
                          <Search className="ml-2 size-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] p-0"
                        align="start"
                      >
                        <Command>
                          <CommandInput placeholder="Buscar producto..." />
                          <CommandList>
                            <CommandEmpty>
                              No se encontraron productos
                            </CommandEmpty>
                            <CommandGroup>
                              {products.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={`${product.name} ${product.sku}`}
                                  onSelect={() => {
                                    setSelectedProductId(
                                      product.id === selectedProductId
                                        ? null
                                        : product.id,
                                    );
                                    setProductSearchOpen(false);
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span className="text-sm">
                                      {product.name}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                      SKU: {product.sku || "—"} · Código:{" "}
                                      {product.barcode || "—"}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Test print button */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleTestPrint}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir etiqueta de prueba
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
