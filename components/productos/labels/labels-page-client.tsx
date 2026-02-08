"use client";

import { CirclePlus, Printer, Search, Settings2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ChangeLabelQuantitiesPopover } from "@/components/productos/labels/change-quantities-popover";
import { ConfigureLabelSheet } from "@/components/productos/labels/configure-label-sheet";
import { PrintPreviewSheet } from "@/components/productos/labels/print-preview-sheet";

import type {
  LabelProduct,
  LabelSettings,
} from "@/components/productos/labels/types";
import { saveLabelSettingsAction } from "@/lib/actions/settings";
import { type Category } from "@/lib/services/categories";
import { printLabels } from "./print-labels";

// ─── Types ────────────────────────────────────────────

interface LabelsPageClientProps {
  products: LabelProduct[];
  categories: Category[];
  totalPages: number;
  count: number;
  initialSettings: LabelSettings;
  currentFilters: {
    search: string;
    category: string;
    filter: string;
    page: number;
  };
}

// ─── Component ────────────────────────────────────────

export function LabelsPageClient({
  products: initialProducts,
  categories,
  totalPages,
  count,
  initialSettings,
  currentFilters,
}: LabelsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state
  const [products, setProducts] = useState(initialProducts);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(currentFilters.search);
  const [configureOpen, setConfigureOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [changeQuantitiesOpen, setChangeQuantitiesOpen] = useState(false);
  const [labelSettings, setLabelSettings] =
    useState<LabelSettings>(initialSettings);

  // Sync products when server data changes
  useMemo(() => {
    setProducts(
      initialProducts.map((p) => {
        const existing = products.find((e) => e.id === p.id);
        return existing ? { ...p, printQuantity: existing.printQuantity } : p;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProducts]);

  // ─── URL-based navigation ──────────────────────────

  const updateUrl = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    params.delete("page"); // Reset page on filter change
    startTransition(() => {
      router.push(`/productos/etiquetas?${params.toString()}`);
    });
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleSearchSubmit = () => {
    updateUrl({ search: searchQuery || undefined });
  };

  const handleFilterChange = (value: string) => {
    updateUrl({ filter: value === "all" ? undefined : value });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) {
      params.set("page", String(page));
    } else {
      params.delete("page");
    }
    startTransition(() => {
      router.push(`/productos/etiquetas?${params.toString()}`);
    });
  };

  // ─── Selection ─────────────────────────────────────

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const toggleAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map((p) => p.id));
    }
  };

  // ─── Quantities ────────────────────────────────────

  const handleQuantityChange = (productId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, printQuantity: numValue } : p,
      ),
    );
  };

  const handleBulkQuantityChange = (quantities: Record<string, number>) => {
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        printQuantity: quantities[p.id] ?? p.printQuantity,
      })),
    );
  };

  // ─── Computed ──────────────────────────────────────

  const totalLabels = selectedProducts.reduce((sum, id) => {
    const product = products.find((p) => p.id === id);
    return sum + (product?.printQuantity || 0);
  }, 0);

  const selectedProductsData = products.filter((p) =>
    selectedProducts.includes(p.id),
  );

  // ─── Settings ──────────────────────────────────────

  const handleSettingsChange = async (newSettings: LabelSettings) => {
    setLabelSettings(newSettings);
    try {
      await saveLabelSettingsAction(newSettings);
    } catch {
      toast.error("Error al guardar configuración de etiquetas");
    }
  };

  // ─── Print ─────────────────────────────────────────

  const handlePrint = () => {
    const productsToPrint = selectedProductsData.filter(
      (p) => p.printQuantity > 0,
    );
    if (productsToPrint.length === 0) {
      toast.error("No hay etiquetas para imprimir");
      return;
    }
    printLabels(productsToPrint, labelSettings);
  };

  // ─── Filter display ───────────────────────────────

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (currentFilters.filter === "with_barcode") {
      filtered = filtered.filter((p) => p.barcode);
    } else if (currentFilters.filter === "with_sku") {
      filtered = filtered.filter((p) => p.sku);
    } else if (currentFilters.filter === "with_both") {
      filtered = filtered.filter((p) => p.barcode && p.sku);
    }
    return filtered;
  }, [products, currentFilters.filter]);

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl">Imprimir etiquetas</h1>
        <p className="text-muted-foreground">
          Seleccioná los productos y la cantidad de etiquetas a imprimir
        </p>
      </div>

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute top-2 left-2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, SKU o código…"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchSubmit();
                }}
                className="h-8 w-full pl-8 sm:w-[200px] lg:w-[300px]"
              />
            </div>

            {/* Filter */}
            <Select
              value={currentFilters.filter || "all"}
              onValueChange={handleFilterChange}
            >
              <SelectTrigger className="h-8 w-full sm:w-[220px]">
                <SelectValue placeholder="Todos los productos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los productos</SelectItem>
                <SelectItem value="with_barcode">
                  Con código de barras
                </SelectItem>
                <SelectItem value="with_sku">Con SKU</SelectItem>
                <SelectItem value="with_both">
                  Con código de barra y SKU
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Category filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-8 justify-start border-dashed"
                >
                  <CirclePlus className="mr-2 h-4 w-4" />
                  Categoría
                  {currentFilters.category && (
                    <Badge variant="secondary" className="ml-2">
                      {categories.find((c) => c.id === currentFilters.category)
                        ?.name || ""}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2" align="start">
                <div className="space-y-1">
                  <Button
                    variant={!currentFilters.category ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => updateUrl({ category: undefined })}
                  >
                    Todas
                  </Button>
                  {categories
                    .filter((c) => !c.parent_id)
                    .map((cat) => (
                      <Button
                        key={cat.id}
                        variant={
                          currentFilters.category === cat.id
                            ? "secondary"
                            : "ghost"
                        }
                        className="w-full justify-start"
                        size="sm"
                        onClick={() => updateUrl({ category: cat.id })}
                      >
                        {cat.name}
                      </Button>
                    ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Configure button */}
          <Button variant="outline" onClick={() => setConfigureOpen(true)}>
            <Settings2 className="mr-1 h-4 w-4" />
            Configurar etiqueta
          </Button>
        </div>

        {/* Table */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow
                  className={selectedProducts.length > 0 ? "bg-muted/50" : ""}
                >
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredProducts.length > 0 &&
                        selectedProducts.length === filteredProducts.length
                      }
                      onCheckedChange={toggleAll}
                      aria-label="Seleccionar todos"
                    />
                  </TableHead>
                  {selectedProducts.length > 0 ? (
                    <TableHead colSpan={5}>
                      <div className="flex items-center gap-2">
                        <span className="font-normal text-sm">
                          {selectedProducts.length} producto
                          {selectedProducts.length !== 1 ? "s" : ""}{" "}
                          seleccionado
                          {selectedProducts.length !== 1 ? "s" : ""}
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          <Popover
                            open={changeQuantitiesOpen}
                            onOpenChange={setChangeQuantitiesOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-8">
                                Cambiar cantidades
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                              <ChangeLabelQuantitiesPopover
                                selectedProducts={selectedProducts}
                                products={products}
                                onSave={handleBulkQuantityChange}
                                onClose={() => setChangeQuantitiesOpen(false)}
                              />
                            </PopoverContent>
                          </Popover>
                          <Button onClick={handlePrint}>
                            <Printer className="mr-1 h-4 w-4" />
                            Imprimir {totalLabels} etiqueta
                            {totalLabels !== 1 ? "s" : ""}
                          </Button>
                        </div>
                      </div>
                    </TableHead>
                  ) : (
                    <>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="w-40 text-center">
                        Cant. a imprimir
                      </TableHead>
                      <TableHead>Código de barras</TableHead>
                      <TableHead>SKU</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No se encontraron productos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => toggleProduct(product.id)}
                          aria-label={`Seleccionar ${product.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="line-clamp-1 max-w-md font-medium">
                          {product.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {product.stock}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={product.printQuantity}
                          onChange={(e) =>
                            handleQuantityChange(product.id, e.target.value)
                          }
                          className="mx-auto flex h-8 w-16 rounded-md border text-center text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        {product.barcode ? (
                          <Badge variant="outline">{product.barcode}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.sku ? (
                          <span className="font-mono text-sm">
                            {product.sku}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2">
            <div className="hidden flex-1 text-muted-foreground text-sm md:block">
              Mostrando {filteredProducts.length} de {count} resultados
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentFilters.page <= 1}
                onClick={() => handlePageChange(currentFilters.page - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm">
                Página {currentFilters.page} de {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentFilters.page >= totalPages}
                onClick={() => handlePageChange(currentFilters.page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Configure Label Sheet */}
      <ConfigureLabelSheet
        open={configureOpen}
        onOpenChange={setConfigureOpen}
        settings={labelSettings}
        onSettingsChange={handleSettingsChange}
        products={products} // ← agregar esto
      />

      {/* Print Preview Sheet */}
      <PrintPreviewSheet
        open={printPreviewOpen}
        onOpenChange={setPrintPreviewOpen}
        products={selectedProductsData}
        settings={labelSettings}
        totalLabels={totalLabels}
        onOpenConfigure={() => {
          setPrintPreviewOpen(false);
          setConfigureOpen(true);
        }}
        onPrint={handlePrint}
      />
    </div>
  );
}
