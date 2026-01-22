"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ProductForm } from "@/components/productos/product-form";
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

import { getLocations } from "@/lib/services/locations";
import {
  createProduct,
  getProductById,
  isBarcodeUnique,
  isSkuUnique,
  type Product,
} from "@/lib/services/products";
import { createClient } from "@/lib/supabase/client";
import type {
  ProductFormInput,
  StockByLocationData,
} from "@/lib/validations/product";

export default function NuevoProductoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaveAndCreate, setIsSaveAndCreate] = useState(false);
  const [stockData, setStockData] = useState<StockByLocationData[]>([]);
  const [isLoadingStock, setIsLoadingStock] = useState(true);
  const [initialData, setInitialData] = useState<Product | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Load locations and duplicate data if needed
  useEffect(() => {
    async function loadData() {
      try {
        const locations = await getLocations();
        const initialStock = locations.map((loc) => ({
          location_id: loc.id,
          location_name: loc.name,
          is_main: loc.is_main,
          quantity: 0,
        }));
        setStockData(initialStock);

        // If duplicating, load the product data
        if (duplicateId) {
          setIsDuplicating(true);
          try {
            const productToDuplicate = await getProductById(duplicateId);

            // Prepare duplicated data (clear SKU, barcode, change name)
            const duplicatedProduct: Product = {
              ...productToDuplicate,
              id: "", // Clear ID for new product
              name: `${productToDuplicate.name} (copia)`,
              sku: "", // Clear SKU - user must provide new one
              barcode: null, // Clear barcode
              stock_quantity: 0,
              created_at: "",
              updated_at: "",
            };

            setInitialData(duplicatedProduct);
            toast.success("Producto duplicado", {
              description: "Completá el SKU para crear el nuevo producto",
            });
          } catch (error) {
            console.error("Error loading product to duplicate:", error);
            toast.error("Error al duplicar", {
              description: "No se pudo cargar el producto a duplicar",
            });
          }
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        toast.error("Error al cargar ubicaciones", {
          description: errorMessage,
        });
      } finally {
        setIsLoadingStock(false);
      }
    }
    loadData();
  }, [duplicateId]);

  const handleSubmit = useCallback(
    async (data: ProductFormInput, stock: StockByLocationData[]) => {
      setIsLoading(true);

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
          setIsLoading(false);
          return;
        }

        // Validate SKU uniqueness
        const skuIsUnique = await isSkuUnique(data.sku);
        if (!skuIsUnique) {
          toast.error("SKU duplicado", {
            description: "Ya existe un producto con este SKU",
          });
          setIsLoading(false);
          return;
        }

        // Validate barcode uniqueness if provided
        if (data.barcode) {
          const barcodeIsUnique = await isBarcodeUnique(data.barcode);
          if (!barcodeIsUnique) {
            toast.error("Código de barras duplicado", {
              description: "Ya existe un producto con este código de barras",
            });
            setIsLoading(false);
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

        // Create product
        const product = await createProduct({
          product: productData,
          stockByLocation: stock.map((s) => ({
            location_id: s.location_id,
            quantity: s.quantity,
          })),
          userId: user.id,
        });

        if (isSaveAndCreate) {
          toast.success("Producto creado", {
            description: `${product.name} se creó correctamente`,
          });
          // Reset form by reloading locations
          const locations = await getLocations();
          const initialStock = locations.map((loc) => ({
            location_id: loc.id,
            location_name: loc.name,
            is_main: loc.is_main,
            quantity: 0,
          }));
          setStockData(initialStock);
          setIsSaveAndCreate(false);
        } else {
          toast.success("Producto creado", {
            description: `${product.name} se creó correctamente`,
          });
          router.push(`/productos/${product.id}`);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        toast.error("Error al crear producto", { description: errorMessage });
      } finally {
        setIsLoading(false);
      }
    },
    [router, isSaveAndCreate],
  );

  // Handle keyboard shortcut for save and create
  /* useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        setIsSaveAndCreate(true);
        // Trigger form submit
        const form = document.querySelector("form");
        if (form) {
          form.requestSubmit();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []); */

  if (isLoadingStock) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
            <BreadcrumbPage>
              {isDuplicating ? "Duplicar Producto" : "Nuevo Producto"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isDuplicating ? "Duplicar Producto" : "Nuevo Producto"}
          </h1>
          {isDuplicating && (
            <p className="text-sm text-muted-foreground mt-1">
              Completá el SKU y ajustá los datos necesarios
            </p>
          )}
        </div>
        <div className="flex items-center md:flex-row flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsSaveAndCreate(true);
              const form = document.querySelector("form");
              if (form) {
                form.requestSubmit();
              }
            }}
            disabled={isLoading}
          >
            Guardar y crear otro
            {/* <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">&#8984;</span>Enter
            </kbd> */}
          </Button>
          <Button
            type="submit"
            form="product-form"
            disabled={isLoading}
            onClick={() => setIsSaveAndCreate(false)}
            className="w-full md:w-fit"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear Producto"
            )}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Form */}
      <div id="product-form">
        <ProductForm
          mode="create"
          initialData={initialData}
          stockData={stockData}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
