"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
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

import {
  createProductAction,
  isBarcodeUniqueAction,
  isSkuUniqueAction,
} from "@/lib/actions/products";
import type { Category } from "@/lib/services/categories";
import type { Product } from "@/lib/services/products";
import type { Supplier } from "@/lib/services/suppliers-cached";
import { createClient } from "@/lib/supabase/client";
import type {
  ProductFormInput,
  StockByLocationData,
} from "@/lib/validations/product";

import type { LocationForProducts } from "@/lib/services/products-cached";

interface NuevoProductoClientProps {
  locations: LocationForProducts[];
  duplicateProduct: Product | null;
  categories: Category[];
  suppliers: Supplier[];
}

export function NuevoProductoClient({
  locations,
  duplicateProduct,
  categories,
  suppliers,
}: NuevoProductoClientProps) {
  const router = useRouter();
  const isDuplicating = !!duplicateProduct;
  const [formKey, setFormKey] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const submitActionRef = useRef<"create" | "save-and-create">("create");
  const [stockData, setStockData] = useState<StockByLocationData[]>(
    locations.map((loc) => ({
      location_id: loc.id,
      location_name: loc.name,
      is_main: loc.is_main ?? false,
      quantity: 0,
    })),
  );

  // Prepare initial data for duplicating
  const initialData = duplicateProduct
    ? {
        ...duplicateProduct,
        id: "",
        name: `${duplicateProduct.name} (copia)`,
        sku: "",
        barcode: null,
        stock_quantity: 0,
        created_at: "",
        updated_at: "",
      }
    : null;

  const handleSubmit = useCallback(
    async (data: ProductFormInput, stock: StockByLocationData[]) => {
      const action = submitActionRef.current;
      setIsLoading(true);

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          toast.error("Error de autenticacion", {
            description: "No se pudo obtener el usuario actual",
          });
          setIsLoading(false);
          return;
        }

        // Validate SKU uniqueness
        const skuIsUnique = await isSkuUniqueAction(data.sku);
        if (!skuIsUnique) {
          toast.error("SKU duplicado", {
            description: "Ya existe un producto con este SKU",
          });
          setIsLoading(false);
          return;
        }

        // Validate barcode uniqueness if provided
        if (data.barcode) {
          const barcodeIsUnique = await isBarcodeUniqueAction(data.barcode);
          if (!barcodeIsUnique) {
            toast.error("Codigo de barras duplicado", {
              description: "Ya existe un producto con este codigo de barras",
            });
            setIsLoading(false);
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

        const product = await createProductAction({
          product: productData,
          stockByLocation: stock.map((s) => ({
            location_id: s.location_id,
            quantity: s.quantity,
          })),
          userId: user.id,
        });

        toast.success("Producto creado", {
          description: `${product.name} se creó correctamente`,
        });

        if (action === "save-and-create") {
          setStockData(
            locations.map((loc) => ({
              location_id: loc.id,
              location_name: loc.name,
              is_main: loc.is_main ?? false,
              quantity: 0,
            })),
          );
          setFormKey((k) => k + 1);
        } else {
          router.push("/productos");
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        toast.error("Error al crear producto", { description: errorMessage });
      } finally {
        setIsLoading(false);
      }
    },
    [router, locations],
  );

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
              Completa el SKU y ajusta los datos necesarios
            </p>
          )}
        </div>
        <div className="flex items-center md:flex-row flex-col gap-2">
          <Button
            type="submit"
            form="product-form"
            variant="outline"
            onClick={() => {
              submitActionRef.current = "save-and-create";
            }}
            disabled={isLoading}
          >
            Guardar y crear otro
          </Button>
          <Button
            type="submit"
            form="product-form"
            disabled={isLoading}
            onClick={() => {
              submitActionRef.current = "create";
            }}
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
      <ProductForm
        key={formKey}
        mode="create"
        initialData={initialData}
        stockData={stockData}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        categories={categories}
        suppliers={suppliers}
        locations={locations}
      />
    </div>
  );
}
