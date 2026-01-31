"use client";

import { Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
  activateProduct,
  archiveProduct,
  getProductById,
  isBarcodeUnique,
  isSkuUnique,
  updateProduct,
  type Product,
} from "@/lib/services/products";
import { createClient } from "@/lib/supabase/client";
import type {
  ProductFormInput,
  StockByLocationData,
} from "@/lib/validations/product";

export default function ProductoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [stockData, setStockData] = useState<StockByLocationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load product data
  useEffect(() => {
    async function loadProduct() {
      setIsLoading(true);
      try {
        const data = await getProductById(productId);
        setProduct(data);

        // Map stock data
        if (data.stock && data.stock.length > 0) {
          const stock = data.stock.map((s) => ({
            location_id: s.location_id,
            location_name: s.location.name,
            is_main: s.location.is_main ?? false,
            quantity: s.quantity,
          }));
          setStockData(stock);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        toast.error("Error al cargar producto", { description: errorMessage });
        router.push("/productos");
      } finally {
        setIsLoading(false);
      }
    }

    if (productId) {
      loadProduct();
    }
  }, [productId, router]);

  const handleSubmit = useCallback(
    async (data: ProductFormInput, stock: StockByLocationData[]) => {
      if (!product) return;

      setIsSaving(true);

      try {
        // Get current user
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          toast.error("Error de autenticación", {
            description: "No se pudo obtener el usuario actual",
          });
          setIsSaving(false);
          return;
        }

        // Validate SKU uniqueness (excluding current product)
        if (data.sku !== product.sku) {
          const skuIsUnique = await isSkuUnique(data.sku, product.id);
          if (!skuIsUnique) {
            toast.error("SKU duplicado", {
              description: "Ya existe un producto con este SKU",
            });
            setIsSaving(false);
            return;
          }
        }

        // Validate barcode uniqueness if provided and changed
        if (data.barcode && data.barcode !== product.barcode) {
          const barcodeIsUnique = await isBarcodeUnique(
            data.barcode,
            product.id,
          );
          if (!barcodeIsUnique) {
            toast.error("Código de barras duplicado", {
              description: "Ya existe un producto con este código de barras",
            });
            setIsSaving(false);
            return;
          }
        }

        // Prepare product data
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

        // Update product
        const updatedProduct = await updateProduct(product.id, {
          product: productData,
          stockByLocation: stock.map((s) => ({
            location_id: s.location_id,
            quantity: s.quantity,
          })),
          userId: user.id,
        });

        // Reload product data
        const freshProduct = await getProductById(product.id);
        setProduct(freshProduct);

        if (freshProduct.stock && freshProduct.stock.length > 0) {
          const newStock = freshProduct.stock.map((s) => ({
            location_id: s.location_id,
            location_name: s.location.name,
            is_main: s.location.is_main ?? false,
            quantity: s.quantity,
          }));
          setStockData(newStock);
        }

        toast.success("Producto actualizado", {
          description: `${updatedProduct.name} se actualizó correctamente`,
        });
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
    [product],
  );

  const handleArchive = useCallback(async () => {
    if (!product) return;

    setIsSaving(true);

    try {
      await archiveProduct(product.id);
      setProduct({ ...product, active: false });
      toast.success("Producto archivado");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al archivar producto", { description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  }, [product]);

  const handleActivate = useCallback(async () => {
    if (!product) return;

    setIsSaving(true);

    try {
      await activateProduct(product.id);
      setProduct({ ...product, active: true });
      toast.success("Producto activado");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al activar producto", { description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  }, [product]);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Producto no encontrado</p>
        <Button asChild className="mt-4">
          <Link href="/productos">Volver a productos</Link>
        </Button>
      </div>
    );
  }

  const productTypeLabel =
    product.product_type === "SERVICE" ? "Servicio" : "Producto";

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
            <BreadcrumbPage>{product.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <Badge variant="secondary">{productTypeLabel}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => copyToClipboard(product.sku, "SKU")}
                  >
                    SKU {product.sku}
                    <Copy className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click para copiar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {product.barcode && (
              <>
                <span>•</span>
                <span>Código de barras: {product.barcode}</span>
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
          initialData={product}
          stockData={stockData}
          onSubmit={handleSubmit}
          onArchive={handleArchive}
          onActivate={handleActivate}
          isLoading={isSaving}
        />
      </div>
    </div>
  );
}
