"use client";

import { Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  ComboItemsSection,
  type ComboItem,
} from "@/components/productos/combo-items-section";
import { ProductForm } from "@/components/productos/product-form";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  activateProductAction,
  archiveProductAction,
  isBarcodeUniqueAction,
  isSkuUniqueAction,
  updateProductAction,
} from "@/lib/actions/products";
import { type Category } from "@/lib/services/categories";
import { type Location } from "@/lib/services/locations";
import type { Product } from "@/lib/services/products";
import { type Supplier } from "@/lib/services/suppliers-cached";
import type { PriceRoundingType } from "@/types/types";
import { createClient } from "@/lib/supabase/client";
import type {
  ProductFormInput,
  StockByLocationData,
} from "@/lib/validations/product";

interface EditarProductoClientProps {
  product: Product;
  stockData: StockByLocationData[];
  locations: Location[];
  categories: Category[];
  suppliers: Supplier[];
  comboItems?: ComboItem[];
  comboProducts?: Product[];
  priceRounding: PriceRoundingType;
}

export function EditarProductoClient({
  product,
  stockData,
  locations,
  categories,
  suppliers,
  comboItems: initialComboItems,
  comboProducts = [],
  priceRounding,
}: EditarProductoClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(product);

  const isCombo = currentProduct.product_type === "COMBO";

  // Combo state
  const [comboItems, setComboItems] = useState<ComboItem[]>(
    initialComboItems ?? [],
  );

  const initialPriceAdjustment = useMemo(() => {
    if (!isCombo || !initialComboItems || initialComboItems.length === 0)
      return -10;
    const basePrice = initialComboItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    if (basePrice === 0) return 0;
    return Math.round(((product.price / basePrice - 1) * 100) * 100) / 100;
  }, [isCombo, initialComboItems, product.price]);

  const [priceAdjustment, setPriceAdjustment] =
    useState<number>(initialPriceAdjustment);

  const handleSubmit = useCallback(
    async (data: ProductFormInput, stock: StockByLocationData[]) => {
      setIsSaving(true);

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          toast.error("Error de autenticacion", {
            description: "No se pudo obtener el usuario actual",
          });
          setIsSaving(false);
          return;
        }

        // Validate SKU uniqueness (excluding current product)
        if (data.sku !== currentProduct.sku) {
          const skuIsUnique = await isSkuUniqueAction(
            data.sku,
            currentProduct.id,
          );
          if (!skuIsUnique) {
            toast.error("SKU duplicado", {
              description: "Ya existe un producto con este SKU",
            });
            setIsSaving(false);
            return;
          }
        }

        // Validate barcode uniqueness if provided and changed
        if (data.barcode && data.barcode !== currentProduct.barcode) {
          const barcodeIsUnique = await isBarcodeUniqueAction(
            data.barcode,
            currentProduct.id,
          );
          if (!barcodeIsUnique) {
            toast.error("Codigo de barras duplicado", {
              description: "Ya existe un producto con este codigo de barras",
            });
            setIsSaving(false);
            return;
          }
        }

        // Combo: validate items
        if (isCombo && comboItems.length === 0) {
          toast.error("Combo vacío", {
            description: "Agregá al menos un producto al combo",
          });
          setIsSaving(false);
          return;
        }

        // Combo: calculate final price from items
        let finalPrice = data.price;
        if (isCombo) {
          const basePrice = comboItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0,
          );
          finalPrice = basePrice + (basePrice * priceAdjustment) / 100;
          finalPrice = Math.round(finalPrice * 100) / 100;
        }

        const productData = {
          name: data.name,
          description: isCombo ? null : data.description || null,
          product_type: isCombo
            ? ("COMBO" as const)
            : data.product_type || "PRODUCT",
          sku: data.sku,
          barcode: data.barcode || null,
          oem_code: isCombo ? null : data.oem_code || null,
          category_id: data.category_id || null,
          default_supplier_id: isCombo
            ? null
            : data.default_supplier_id || null,
          cost: isCombo ? null : data.cost || null,
          margin_percentage: isCombo ? null : data.margin_percentage || null,
          price: finalPrice,
          tax_rate: data.tax_rate || 21,
          currency: data.currency || "ARS",
          track_stock: isCombo ? false : (data.track_stock ?? true),
          min_stock: isCombo ? null : data.min_stock || null,
          visibility: data.visibility || "SALES_AND_PURCHASES",
          image_url: isCombo ? null : data.image_url || null,
          active: data.active ?? true,
        };

        const updatedProduct = await updateProductAction(currentProduct.id, {
          product: productData,
          stockByLocation: isCombo
            ? []
            : stock.map((s) => ({
                location_id: s.location_id,
                quantity: s.quantity,
              })),
          userId: user.id,
          comboItems: isCombo
            ? comboItems.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
              }))
            : undefined,
        });

        toast.success(
          isCombo ? "Combo actualizado" : "Producto actualizado",
          {
            description: `${updatedProduct.name} se actualizo correctamente`,
          },
        );

        router.refresh();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        toast.error(
          isCombo
            ? "Error al actualizar combo"
            : "Error al actualizar producto",
          { description: errorMessage },
        );
      } finally {
        setIsSaving(false);
      }
    },
    [currentProduct, router, isCombo, comboItems, priceAdjustment],
  );

  const handleArchive = useCallback(async () => {
    setIsSaving(true);

    try {
      await archiveProductAction(currentProduct.id);
      setCurrentProduct({ ...currentProduct, active: false });
      toast.success("Producto archivado");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al archivar producto", { description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  }, [currentProduct]);

  const handleActivate = useCallback(async () => {
    setIsSaving(true);

    try {
      await activateProductAction(currentProduct.id);
      setCurrentProduct({ ...currentProduct, active: true });
      toast.success("Producto activado");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al activar producto", { description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  }, [currentProduct]);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  }

  const productTypeLabel = isCombo
    ? "Combo"
    : currentProduct.product_type === "SERVICE"
      ? "Servicio"
      : "Producto";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/productos">Productos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{currentProduct.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{currentProduct.name}</h1>
            <Badge variant="secondary">{productTypeLabel}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => copyToClipboard(currentProduct.sku, "SKU")}
                  >
                    SKU {currentProduct.sku}
                    <Copy className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click para copiar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {currentProduct.barcode && (
              <>
                <span>-</span>
                <span>Codigo de barras: {currentProduct.barcode}</span>
              </>
            )}
          </div>
        </div>
        <Button
          type="submit"
          form="product-form"
          disabled={isSaving}
          onClick={() => {
            const form = document.querySelector("form");
            if (form) {
              form.requestSubmit();
            }
          }}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar"
          )}
        </Button>
      </div>

      <Separator />

      {/* Form */}
      <div id="product-form">
        <ProductForm
          mode="edit"
          initialData={currentProduct}
          stockData={stockData}
          onSubmit={handleSubmit}
          onArchive={handleArchive}
          onActivate={handleActivate}
          isLoading={isSaving}
          categories={categories}
          suppliers={suppliers}
          locations={locations}
          priceRounding={priceRounding}
          isCombo={isCombo}
          comboContent={
            isCombo ? (
              <ComboItemsSection
                items={comboItems}
                onItemsChange={setComboItems}
                priceAdjustment={priceAdjustment}
                onPriceAdjustmentChange={setPriceAdjustment}
                products={comboProducts}
                disabled={isSaving}
              />
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
