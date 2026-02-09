"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import {
  ComboItemsSection,
  type ComboItem,
} from "@/components/productos/combo-items-section";
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
import { type Category } from "@/lib/services/categories";
import { type Product } from "@/lib/services/products";
import { type LocationForProducts } from "@/lib/services/products-cached";
import { type Supplier } from "@/lib/services/suppliers";
import { createClient } from "@/lib/supabase/client";

import type {
  ProductFormInput,
  StockByLocationData,
} from "@/lib/validations/product";

interface NuevoProductoClientProps {
  locations: LocationForProducts[];
  duplicateProduct: Product | null;
  categories: Category[];
  suppliers: Supplier[];
  productType?: "COMBO";
  comboProducts?: Product[];
}

export function NuevoProductoClient({
  locations,
  duplicateProduct,
  categories,
  suppliers,
  productType,
  comboProducts = [],
}: NuevoProductoClientProps) {
  const router = useRouter();
  const isCombo = productType === "COMBO";
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

  // Combo state
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [priceAdjustment, setPriceAdjustment] = useState<number>(-10);

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
          toast.error("Error de autenticación", {
            description: "No se pudo obtener el usuario actual",
          });
          setIsLoading(false);
          return;
        }

        // Combo: validate items
        if (isCombo && comboItems.length === 0) {
          toast.error("Combo vacío", {
            description: "Agregá al menos un producto al combo",
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
            toast.error("Código de barras duplicado", {
              description: "Ya existe un producto con este código de barras",
            });
            setIsLoading(false);
            return;
          }
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

        const product = await createProductAction({
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

        toast.success(isCombo ? "Combo creado" : "Producto creado", {
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
          if (isCombo) {
            setComboItems([]);
            setPriceAdjustment(-10);
          }
          setFormKey((k) => k + 1);
        } else {
          router.push("/productos");
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        toast.error(
          isCombo ? "Error al crear combo" : "Error al crear producto",
          { description: errorMessage },
        );
      } finally {
        setIsLoading(false);
      }
    },
    [router, locations, isCombo, comboItems, priceAdjustment],
  );

  const pageTitle = isCombo
    ? "Nuevo Combo"
    : isDuplicating
      ? "Duplicar Producto"
      : "Nuevo Producto";

  const buttonLabel = isCombo ? "Crear Combo" : "Crear Producto";

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
            <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{pageTitle}</h1>
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
              buttonLabel
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
        isCombo={isCombo}
        comboContent={
          isCombo ? (
            <ComboItemsSection
              items={comboItems}
              onItemsChange={setComboItems}
              priceAdjustment={priceAdjustment}
              onPriceAdjustmentChange={setPriceAdjustment}
              products={comboProducts}
              disabled={isLoading}
            />
          ) : undefined
        }
      />
    </div>
  );
}

/* import { type Category } from "@/lib/services/categories";
import { type Product } from "@/lib/services/products";
import { type LocationForProducts } from "@/lib/services/products-cached";
import { type Supplier } from "@/lib/services/suppliers"; */
