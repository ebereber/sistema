"use client";

import { Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

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
}

export function EditarProductoClient({
  product,
  stockData,
  locations,
  categories,
  suppliers,
}: EditarProductoClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(product);

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

        const productData = {
          name: data.name,
          description: data.description || null,
          product_type: data.product_type || "PRODUCT",
          sku: data.sku,
          barcode: data.barcode || null,
          oem_code: data.oem_code || null,
          category_id: data.category_id || null,
          default_supplier_id: data.default_supplier_id || null,
          cost: data.cost || null,
          margin_percentage: data.margin_percentage || null,
          price: data.price,
          tax_rate: data.tax_rate || 21,
          currency: data.currency || "ARS",
          track_stock: data.track_stock ?? true,
          min_stock: data.min_stock || null,
          visibility: data.visibility || "SALES_AND_PURCHASES",
          image_url: data.image_url || null,
          active: data.active ?? true,
        };

        const updatedProduct = await updateProductAction(currentProduct.id, {
          product: productData,
          stockByLocation: stock.map((s) => ({
            location_id: s.location_id,
            quantity: s.quantity,
          })),
          userId: user.id,
        });

        toast.success("Producto actualizado", {
          description: `${updatedProduct.name} se actualizo correctamente`,
        });

        router.refresh();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        toast.error("Error al actualizar producto", {
          description: errorMessage,
        });
      } finally {
        setIsSaving(false);
      }
    },
    [currentProduct, router],
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

  const productTypeLabel =
    currentProduct.product_type === "SERVICE" ? "Servicio" : "Producto";

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
        />
      </div>
    </div>
  );
}
