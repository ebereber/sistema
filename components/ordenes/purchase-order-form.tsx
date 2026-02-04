"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  Check,
  ChevronRight,
  ChevronsUpDown,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ProductSearchDialog } from "@/components/compras/product-search-dialog";
import { SupplierDialog } from "@/components/proveedores/supplier-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { getLocations, type Location } from "@/lib/services/locations";
import { getProducts, type Product } from "@/lib/services/products";
import {
  createPurchaseOrderAction,
  updatePurchaseOrderAction,
} from "@/lib/actions/purchase-orders";
import type {
  CreatePurchaseOrderItemData,
  PurchaseOrderWithDetails,
} from "@/lib/services/purchase-orders";
import { usePurchaseOrderFormStore } from "@/lib/store/purchase-order-store";
import { getSuppliers, type Supplier } from "@/lib/services/suppliers";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PurchaseOrderFormProps {
  mode: "create" | "edit";
  initialData?: PurchaseOrderWithDetails;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PurchaseOrderForm({
  mode,
  initialData,
}: PurchaseOrderFormProps) {
  const router = useRouter();

  // Data from DB
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state (from store)
  const {
    selectedSupplierId,
    setSupplierId: setSelectedSupplierId,
    selectedLocationId,
    setLocationId: setSelectedLocationId,
    orderDate,
    setOrderDate,
    expectedDeliveryDate,
    setExpectedDeliveryDate,
    items,
    setItems,
    addCustomItem,
    removeItem,
    updateItemQuantity,
    updateItemCost,
    updateItemName,
    notes,
    setNotes,
    clear,
  } = usePurchaseOrderFormStore();

  // UI state
  const [openSupplier, setOpenSupplier] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form with initial data (edit mode)
  const populateForm = useCallback(
    (data: PurchaseOrderWithDetails) => {
      setSelectedSupplierId(data.supplier_id);
      setSelectedLocationId(data.location_id || "");
      setOrderDate(new Date(data.order_date));
      setExpectedDeliveryDate(
        data.expected_delivery_date
          ? new Date(data.expected_delivery_date)
          : undefined,
      );
      setNotes(data.notes || "");

      if (data.items?.length > 0) {
        setItems(
          data.items.map((item) => ({
            id: item.id,
            productId: item.product_id,
            name: item.name,
            sku: item.sku || "",
            quantity: item.quantity,
            unitCost: Number(item.unit_cost),
            type: item.type as "product" | "custom",
          })),
        );
      }
    },
    [
      setSelectedSupplierId,
      setSelectedLocationId,
      setOrderDate,
      setExpectedDeliveryDate,
      setNotes,
      setItems,
    ],
  );

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [suppliersData, productsResult, locationsData] = await Promise.all([
        getSuppliers({ active: true }),
        getProducts(),
        getLocations(),
      ]);

      setSuppliers(suppliersData);
      setProducts(
        Array.isArray(productsResult)
          ? productsResult
          : (productsResult as { data?: Product[] }).data || [],
      );
      setLocations(locationsData);

      if (initialData) {
        populateForm(initialData);
      } else if (!selectedLocationId) {
        const mainLocation = locationsData.find((l) => l.is_main);
        if (mainLocation) setSelectedLocationId(mainLocation.id);
        else if (locationsData.length > 0)
          setSelectedLocationId(locationsData[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  }, [initialData, populateForm, selectedLocationId, setSelectedLocationId]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculations
  const calculateSubtotal = (item: { quantity: number; unitCost: number }) =>
    item.quantity * item.unitCost;
  const calculateTotal = () =>
    items.reduce((sum, item) => sum + calculateSubtotal(item), 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);

  // Handlers
  const handleAddSelectedProducts = (selectedProducts: Product[]) => {
    const newItems = selectedProducts
      .filter((p) => !items.some((i) => i.productId === p.id))
      .map((p) => ({
        id: `product-${p.id}-${Date.now()}`,
        productId: p.id,
        name: p.name,
        sku: p.sku || "",
        quantity: 1,
        unitCost: Number(p.cost) || 0,
        type: "product" as const,
      }));
    setItems([...items, ...newItems]);
  };

  const handleCostChange = (itemId: string, cost: string) => {
    const numericCost = parseFloat(cost.replace(/[^0-9.]/g, "")) || 0;
    updateItemCost(itemId, numericCost);
  };

  const handleSupplierCreated = (supplier: Supplier) => {
    setSuppliers((prev) =>
      [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setSelectedSupplierId(supplier.id);
    setOpenSupplier(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplierId) {
      toast.error("Seleccioná un proveedor");
      return;
    }
    if (items.length === 0) {
      toast.error("Agregá al menos un producto");
      return;
    }

    setIsSubmitting(true);

    try {
      const orderItems: CreatePurchaseOrderItemData[] = items.map((item) => ({
        product_id: item.productId,
        name: item.name,
        sku: item.sku || null,
        quantity: item.quantity,
        unit_cost: item.unitCost,
        subtotal: item.quantity * item.unitCost,
        type: item.type,
      }));

      const orderData = {
        supplier_id: selectedSupplierId,
        location_id: selectedLocationId || null,
        order_date: format(orderDate, "yyyy-MM-dd"),
        expected_delivery_date: expectedDeliveryDate
          ? format(expectedDeliveryDate, "yyyy-MM-dd")
          : null,
        notes: notes || null,
      };

      if (mode === "edit" && initialData) {
        await updatePurchaseOrderAction(initialData.id, orderData, orderItems);
        toast.success("Orden actualizada");
        clear();
        router.push(`/ordenes/${initialData.id}`);
      } else {
        const order = await createPurchaseOrderAction(orderData, orderItems);
        toast.success("Orden creada");
        clear();
        router.push(`/ordenes/${order.id}`);
      }
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error(
        mode === "edit"
          ? "Error al actualizar la orden"
          : "Error al crear la orden",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const pageTitle =
    mode === "edit" ? "Editar orden de compra" : "Nueva orden de compra";
  const submitText =
    mode === "edit"
      ? isSubmitting
        ? "Actualizando…"
        : "Guardar cambios"
      : isSubmitting
        ? "Creando…"
        : "Guardar borrador";

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="h-48 animate-pulse rounded bg-muted" />
          <div className="h-48 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="gap-4">
        <Link
          href="/ordenes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
        >
          Órdenes de Compra
          <ChevronRight className="size-3" />
        </Link>
        <h1 className="text-3xl font-bold">{pageTitle}</h1>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Proveedor + Ubicación */}
          <Card>
            <CardContent className="space-y-4 px-4 py-4">
              <div className="space-y-2">
                <Label>Proveedor *</Label>
                <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-start text-left active:scale-100"
                    >
                      <span className="truncate">
                        {selectedSupplier?.name || "Seleccionar proveedor"}
                      </span>
                      <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar proveedor…" />
                      <CommandList>
                        <CommandEmpty>
                          No se encontraron proveedores
                        </CommandEmpty>
                        <CommandGroup>
                          <SupplierDialog
                            mode="create"
                            onSuccess={handleSupplierCreated}
                            trigger={
                              <div className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground">
                                <Plus className="h-4 w-4" />
                                <span className="font-medium">
                                  Crear nuevo proveedor
                                </span>
                              </div>
                            }
                          />
                        </CommandGroup>
                        <CommandGroup heading="Proveedores">
                          {suppliers.map((supplier) => (
                            <CommandItem
                              key={supplier.id}
                              value={supplier.name}
                              onSelect={() => {
                                setSelectedSupplierId(supplier.id);
                                setOpenSupplier(false);
                              }}
                            >
                              <div
                                className={cn(
                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-[4px] border border-input",
                                  selectedSupplierId === supplier.id
                                    ? "bg-primary text-primary-foreground"
                                    : "[&_svg]:invisible",
                                )}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </div>
                              <span className="truncate">{supplier.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Ubicación de entrega *</Label>
                <Select
                  value={selectedLocationId}
                  onValueChange={setSelectedLocationId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                        {location.is_main && " (Principal)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Fechas */}
          <Card>
            <CardContent className="flex flex-col gap-6 px-4 py-4">
              <div className="space-y-2">
                <Label>Fecha de orden *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal active:scale-100"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(orderDate, "d 'de' MMMM 'de' yyyy", {
                        locale: es,
                      })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={orderDate}
                      onSelect={(date) => date && setOrderDate(date)}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Fecha de entrega estimada</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal active:scale-100",
                        !expectedDeliveryDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expectedDeliveryDate
                        ? format(
                            expectedDeliveryDate,
                            "d 'de' MMMM 'de' yyyy",
                            { locale: es },
                          )
                        : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expectedDeliveryDate}
                      onSelect={(date) => setExpectedDeliveryDate(date)}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Productos (visible después de seleccionar proveedor) */}
        {selectedSupplierId && (
          <>
            <Card>
              <CardContent className="space-y-4 px-4 py-4">
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="w-28 text-right">
                          Cantidad
                        </TableHead>
                        <TableHead className="w-32 text-right">
                          Costo s/IVA
                        </TableHead>
                        <TableHead className="w-32 text-right">
                          Subtotal
                        </TableHead>
                        <TableHead className="w-16" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id} className="group">
                          <TableCell>
                            {item.type === "product" ? (
                              <div>
                                <div className="max-w-xl whitespace-normal font-medium">
                                  {item.name}
                                </div>
                                {item.sku && (
                                  <div className="text-sm text-muted-foreground">
                                    SKU: {item.sku}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Input
                                className="h-8 w-full max-w-xs"
                                placeholder="Nombre del ítem"
                                value={item.name}
                                onChange={(e) =>
                                  updateItemName(item.id, e.target.value)
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItemQuantity(
                                  item.id,
                                  parseInt(e.target.value) || 1,
                                )
                              }
                              className="h-8 text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              value={`$${item.unitCost}`}
                              onChange={(e) =>
                                handleCostChange(item.id, e.target.value)
                              }
                              className="h-8 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(calculateSubtotal(item))}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 transition-all group-hover:opacity-100"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex gap-2">
                  <ProductSearchDialog
                    products={products}
                    excludedProductIds={items
                      .filter((i) => i.productId)
                      .map((i) => i.productId!)}
                    onProductsSelected={handleAddSelectedProducts}
                    formatCurrency={formatCurrency}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomItem}
                  >
                    Ítem personalizado
                  </Button>
                </div>

                <div className="flex justify-end text-sm text-muted-foreground">
                  {items.reduce((s, i) => s + i.quantity, 0)} unidades
                </div>
              </CardContent>
            </Card>

            {/* Notas + Total */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="px-4 py-4">
                  <div className="space-y-2">
                    <Label>Notas</Label>
                    <Textarea
                      placeholder="Notas adicionales (opcional)"
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-16"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 px-4 py-4">
                  <div className="flex justify-between text-lg font-medium">
                    <span>Total</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 w-full text-base"
                    disabled={isSubmitting || items.length === 0}
                  >
                    {submitText}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
