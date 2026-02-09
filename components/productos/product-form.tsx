import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { CategoryCombobox } from "@/components/productos/category-combobox";
import { ImageUpload } from "@/components/productos/image-upload";
import { PriceHistoryDialog } from "@/components/productos/price-history-dialog";
import { StockMovementsDialog } from "@/components/productos/stock-movements-dialog";
import { StockTable } from "@/components/productos/stock-table";
import { SupplierCombobox } from "@/components/productos/supplier-combobox";

/* import type { LocationForProducts } from "@/lib/services/locations"; */

import { type Category } from "@/lib/services/categories";
import { type Product } from "@/lib/services/products";
import { type LocationForProducts } from "@/lib/services/products-cached";
import { type Supplier } from "@/lib/services/suppliers";
import {
  productSchema,
  TAX_RATES,
  VISIBILITY_OPTIONS,
  type ProductFormInput,
  type StockByLocationData,
} from "@/lib/validations/product";

interface ProductFormProps {
  mode: "create" | "edit";
  initialData?: Product | null;
  stockData?: StockByLocationData[];
  onSubmit: (data: ProductFormInput, stock: StockByLocationData[]) => void;
  onArchive?: () => void;
  onActivate?: () => void;
  isLoading?: boolean;
  categories?: Category[];
  suppliers?: Supplier[];
  locations?: LocationForProducts[];
  isCombo?: boolean;
  comboContent?: ReactNode;
}

export function ProductForm({
  mode,
  initialData,
  stockData = [],
  onSubmit,
  onArchive,
  onActivate,
  isLoading,
  categories = [],
  suppliers = [],
  locations = [],
  isCombo = false,
  comboContent,
}: ProductFormProps) {
  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      product_type: isCombo ? "COMBO" : "PRODUCT",
      sku: "",
      barcode: "",
      oem_code: "",
      category_id: null,
      default_supplier_id: null,
      cost: undefined,
      margin_percentage: undefined,
      price: 0,
      tax_rate: 21,
      currency: "ARS",
      track_stock: isCombo ? false : true,
      min_stock: null,
      visibility: "SALES_AND_PURCHASES",
      image_url: null,
      active: true,
    },
  });

  // Watch for price calculation
  const cost = form.watch("cost") ?? 0;
  const marginPercentage = form.watch("margin_percentage") ?? 0;
  const taxRate = form.watch("tax_rate") ?? 21;

  // Calculate derived values
  const priceCalculations = useMemo(() => {
    const precioSinIVA = cost * (1 + marginPercentage / 100);
    const precioConIVA = precioSinIVA * (1 + taxRate / 100);
    const ganancia = precioSinIVA - cost;
    const porcentajeGanancia = cost > 0 ? (ganancia / cost) * 100 : 0;

    return {
      precioSinIVA,
      precioConIVA,
      ganancia,
      porcentajeGanancia,
    };
  }, [cost, marginPercentage, taxRate]);

  // Update price when calculations change
  useEffect(() => {
    if (!isCombo) {
      form.setValue("price", priceCalculations.precioConIVA);
    }
  }, [priceCalculations.precioConIVA, form, isCombo]);

  // Load initial data (for edit mode or duplication)
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description || "",
        product_type: initialData.product_type as
          | "PRODUCT"
          | "SERVICE"
          | "COMBO",
        sku: initialData.sku,
        barcode: initialData.barcode || "",
        oem_code: initialData.oem_code || "",
        category_id: initialData.category_id,
        default_supplier_id: initialData.default_supplier_id,
        cost: initialData.cost ?? undefined,
        margin_percentage: initialData.margin_percentage ?? undefined,
        price: initialData.price,
        tax_rate: initialData.tax_rate,
        currency: initialData.currency,
        track_stock: initialData.track_stock ?? false,
        min_stock: initialData.min_stock,
        visibility: initialData.visibility as
          | "SALES_AND_PURCHASES"
          | "SALES_ONLY"
          | "PURCHASES_ONLY",
        image_url: initialData.image_url,
        active: initialData.active ?? true,
      });
    }
  }, [initialData, form]);

  // Stock state - managed internally, initialized from props
  const [internalStock, setInternalStock] =
    useState<StockByLocationData[]>(stockData);

  // Sync internal stock with props when they change
  useEffect(() => {
    if (stockData.length > 0) {
      setInternalStock(stockData);
    }
  }, [stockData]);

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  }

  function handleFormSubmit(data: ProductFormInput) {
    onSubmit(data, internalStock);
  }

  const visibilityLabels: Record<string, string> = {
    SALES_AND_PURCHASES: "Ventas y Compras",
    SALES_ONLY: "Solo Ventas",
    PURCHASES_ONLY: "Solo Compras",
  };

  return (
    <Form {...form}>
      <form
        id="product-form"
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-6"
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nombre <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            isCombo ? "Ej: Combo Limpieza" : "Ej: Tornillo M8"
                          }
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* SKU and Barcode */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          SKU <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={isCombo ? "COMBO-001" : "SKU-001"}
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de Barras</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="7890123456789"
                            {...field}
                            value={field.value ?? ""}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <FormControl>
                        <CategoryCombobox
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isLoading}
                          categories={categories}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description - solo producto */}
                {!isCombo && (
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descripción del producto (opcional)"
                            className="resize-none"
                            rows={3}
                            {...field}
                            value={field.value ?? ""}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Supplier - solo producto */}
                {!isCombo && (
                  <FormField
                    control={form.control}
                    name="default_supplier_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proveedor principal</FormLabel>
                        <FormControl>
                          <SupplierCombobox
                            value={field.value}
                            onChange={field.onChange}
                            disabled={isLoading}
                            suppliers={suppliers}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Combo Content - productos del combo + precio */}
            {isCombo && comboContent}

            {/* Prices Card - solo producto */}
            {!isCombo && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Precios</CardTitle>
                  {mode === "edit" && initialData && (
                    <PriceHistoryDialog
                      productId={initialData.id}
                      productName={initialData.name}
                    />
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cost and Margin */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Costo sin IVA</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder="0"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(
                                  val === "" ? undefined : parseFloat(val),
                                );
                              }}
                              disabled={isLoading}
                              className="[&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="margin_percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Margen</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                step={0.01}
                                placeholder="0"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  field.onChange(
                                    val === "" ? undefined : parseFloat(val),
                                  );
                                }}
                                disabled={isLoading}
                                className="pr-8 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                %
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Price and Tax */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio con IVA</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={priceCalculations.precioConIVA.toFixed(2)}
                              disabled
                              className="bg-muted [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tax_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IVA</FormLabel>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(parseFloat(value))
                            }
                            value={field.value?.toString()}
                            disabled={isLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar IVA" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TAX_RATES.map((rate) => (
                                <SelectItem key={rate} value={rate.toString()}>
                                  {rate}%
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Calculated Info */}
                  <Separator />
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">
                      {formatCurrency(priceCalculations.precioSinIVA)} sin IVA
                    </p>
                    <p
                      className={
                        priceCalculations.ganancia < 0
                          ? "text-red-600 font-medium"
                          : "text-green-600 font-medium"
                      }
                    >
                      Ganancia: {formatCurrency(priceCalculations.ganancia)} (
                      {priceCalculations.porcentajeGanancia.toFixed(2)}%)
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Inventory Card - solo producto */}
            {!isCombo && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Inventario</CardTitle>
                  {mode === "edit" && initialData && (
                    <StockMovementsDialog
                      productId={initialData.id}
                      productName={initialData.name}
                    />
                  )}
                </CardHeader>
                <CardContent>
                  <StockTable
                    value={internalStock}
                    onChange={setInternalStock}
                    disabled={isLoading}
                    locations={locations}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {isCombo ? (
              /* ─── Combo: solo switch Activo ─── */
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="combo-active" className="text-sm">
                      Combo Activo
                    </Label>
                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <Switch
                          id="combo-active"
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* ─── Producto: Visibilidad + Imagen + Estado ─── */
              <>
                {/* Visibility Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Visibilidad</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="visibility"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar visibilidad" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {VISIBILITY_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {visibilityLabels[option]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Define en qué contextos aparece el producto
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Image Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Imagen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="image_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <ImageUpload
                              value={field.value}
                              onChange={field.onChange}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Status Card (only in edit mode) */}
                {mode === "edit" && initialData && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Estado</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Badge
                        variant={initialData.active ? "default" : "secondary"}
                        className="text-sm"
                      >
                        {initialData.active ? "Activo" : "Archivado"}
                      </Badge>
                      {initialData.active ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full text-destructive hover:text-destructive"
                          onClick={onArchive}
                          disabled={isLoading}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archivar producto
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={onActivate}
                          disabled={isLoading}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Activar producto
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
