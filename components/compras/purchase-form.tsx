"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";

import { getLocations, type Location } from "@/lib/services/locations";
import { getProducts, type Product } from "@/lib/services/products";
import { type PurchaseOrderWithDetails } from "@/lib/services/purchase-orders";
import {
  checkDuplicatePurchase,
  createPurchase,
  updatePurchase,
  uploadPurchaseAttachment,
  type CreatePurchaseItemData,
  type Purchase,
} from "@/lib/services/purchases";
import { getSuppliers, type Supplier } from "@/lib/services/suppliers";
import {
  usePurchaseFormStore,
  type PurchaseItem,
} from "@/lib/store/purchase-form-store";
import { SupplierDialog } from "../proveedores/supplier-dialog";
import { FileUpload } from "../ui/file-upload";
import { ProductSearchDialog } from "./product-search-dialog";

interface PurchaseFormProps {
  mode: "create" | "edit";
  initialData?: Purchase;
  duplicateFrom?: Purchase;
  fromPurchaseOrder?: PurchaseOrderWithDetails;
  initialSuppliers?: Supplier[];
  initialProducts?: Product[];
  initialLocations?: Location[];
}

export function PurchaseForm({
  mode,
  initialData,
  duplicateFrom,
  fromPurchaseOrder,
  initialSuppliers,
  initialProducts,
  initialLocations,
}: PurchaseFormProps) {
  const router = useRouter();

  // Data from DB
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Store state
  const store = usePurchaseFormStore();

  // UI state
  const [openSupplier, setOpenSupplier] = useState(false);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);

  // Populate form with initial data (edit mode) or duplicate data
  const populateForm = useCallback(
    (data: Purchase) => {
      store.setSupplierId(data.supplier_id);
      store.setLocationId(data.location_id || "");
      store.setVoucherType(data.voucher_type);
      store.setVoucherNumber(mode === "edit" ? data.voucher_number : ""); // Clear voucher number when duplicating
      store.setInvoiceDate(new Date(data.invoice_date));
      store.setDueDate(data.due_date ? new Date(data.due_date) : undefined);
      store.setProductsReceived(data.products_received);
      store.setNotes(data.notes || "");
      store.setAccountingDate(
        data.accounting_date ? new Date(data.accounting_date) : new Date(),
      );
      store.setTaxCategory(data.tax_category || "");
      store.setAttachmentUrl(data.attachment_url || null);

      // Populate items
      if (data.items && data.items.length > 0) {
        const formItems: PurchaseItem[] = data.items.map((item) => ({
          id: item.id,
          productId: item.product_id,
          name: item.name,
          sku: item.sku || "",
          quantity: item.quantity,
          unitCost: Number(item.unit_cost),
          type: item.type as "product" | "custom",
        }));
        store.setItems(formItems);
      }
    },
    [mode, store],
  );

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use server-provided data if available, otherwise fetch from client
      const [suppliersData, productsResult, locationsData] = await Promise.all([
        initialSuppliers
          ? Promise.resolve(initialSuppliers)
          : getSuppliers({ active: true }),
        initialProducts ? Promise.resolve(initialProducts) : getProducts(),
        initialLocations ? Promise.resolve(initialLocations) : getLocations(),
      ]);

      setSuppliers(suppliersData);
      setProducts(
        Array.isArray(productsResult)
          ? productsResult
          : productsResult.data || [],
      );
      setLocations(locationsData);

      // Set default location (only if no persisted state and not editing/duplicating)
      if (
        !initialData &&
        !duplicateFrom &&
        !fromPurchaseOrder &&
        !store.selectedLocationId
      ) {
        const mainLocation = locationsData.find((l) => l.is_main);
        if (mainLocation) {
          store.setLocationId(mainLocation.id);
        } else if (locationsData.length > 0) {
          store.setLocationId(locationsData[0].id);
        }
      }

      // Populate form if editing or duplicating (overrides persisted state)
      if (initialData) {
        populateForm(initialData);
      } else if (duplicateFrom) {
        populateForm(duplicateFrom);
      } else if (fromPurchaseOrder) {
        store.setSupplierId(fromPurchaseOrder.supplier_id);
        store.setLocationId(
          fromPurchaseOrder.location_id ||
            locationsData.find((l) => l.is_main)?.id ||
            "",
        );
        store.setProductsReceived(true);
        store.setNotes(
          fromPurchaseOrder.notes
            ? `OC ${fromPurchaseOrder.order_number} — ${fromPurchaseOrder.notes}`
            : `OC ${fromPurchaseOrder.order_number}`,
        );
        store.setItems(
          fromPurchaseOrder.items.map((item) => ({
            id: `po-${item.id}-${Date.now()}`,
            productId: item.product_id,
            name: item.name,
            sku: item.sku || "",
            quantity: item.quantity,
            unitCost: Number(item.unit_cost),
            type: item.type as "product" | "custom",
          })),
        );
      }
      // If none of the above, the persisted state from the store is used automatically
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  }, [
    initialData,
    duplicateFrom,
    fromPurchaseOrder,
    populateForm,
    store,
    initialLocations,
    initialProducts,
    initialSuppliers,
  ]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculations
  const calculateSubtotal = (item: PurchaseItem) =>
    item.quantity * item.unitCost;
  const calculateTotal = () =>
    store.items.reduce((sum, item) => sum + calculateSubtotal(item), 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);

  // Handlers
  const handleAddSelectedProducts = (selectedProducts: Product[]) => {
    const newItems = selectedProducts
      .filter((p) => !store.items.some((i) => i.productId === p.id))
      .map((p) => ({
        id: `product-${p.id}-${Date.now()}`,
        productId: p.id,
        name: p.name,
        sku: p.sku || "",
        quantity: 1,
        unitCost: Number(p.cost) || 0,
        type: "product" as const,
      }));

    store.addItems(newItems);
  };

  const handleAddCustomItem = () => {
    store.addCustomItem();
  };

  const handleRemoveItem = (itemId: string) => {
    store.removeItem(itemId);
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    store.updateItemQuantity(itemId, quantity);
  };

  const handleCostChange = (itemId: string, cost: string) => {
    const numericCost = parseFloat(cost.replace(/[^0-9.]/g, "")) || 0;
    store.updateItemCost(itemId, numericCost);
  };

  const handleNameChange = (itemId: string, name: string) => {
    store.updateItemName(itemId, name);
  };

  const handleSupplierCreated = (supplier: Supplier) => {
    // Add to list and sort
    setSuppliers((prev) =>
      [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name)),
    );
    // Select it
    store.setSupplierId(supplier.id);
    // Close supplier popover
    setOpenSupplier(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!store.selectedSupplierId) {
      toast.error("Seleccioná un proveedor");
      return;
    }

    if (!store.voucherNumber.trim()) {
      toast.error("Ingresá el número de factura");
      return;
    }

    if (store.items.length === 0) {
      toast.error("Agregá al menos un producto");
      return;
    }

    if (store.productsReceived && !store.selectedLocationId) {
      toast.error("Seleccioná una ubicación para recibir los productos");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check for duplicate (only for create or if voucher number changed in edit)
      const shouldCheckDuplicate =
        mode === "create" ||
        (mode === "edit" &&
          initialData?.voucher_number !== store.voucherNumber);

      if (shouldCheckDuplicate) {
        const isDuplicate = await checkDuplicatePurchase(
          store.selectedSupplierId,
          store.voucherType,
          store.voucherNumber,
          mode === "edit" ? initialData?.id : undefined,
        );

        if (isDuplicate) {
          toast.error(
            "Ya existe una compra con ese número de factura para este proveedor",
          );
          setIsSubmitting(false);
          return;
        }
      }

      const total = calculateTotal();

      const purchaseItems: CreatePurchaseItemData[] = store.items.map(
        (item) => ({
          product_id: item.productId,
          name: item.name,
          sku: item.sku || null,
          quantity: item.quantity,
          unit_cost: item.unitCost,
          subtotal: item.quantity * item.unitCost,
          type: item.type,
        }),
      );

      const purchaseData = {
        supplier_id: store.selectedSupplierId,
        location_id: store.productsReceived ? store.selectedLocationId : null,
        voucher_type: store.voucherType,
        voucher_number: store.voucherNumber,
        invoice_date: format(store.invoiceDate, "yyyy-MM-dd"),
        due_date: store.dueDate ? format(store.dueDate, "yyyy-MM-dd") : null,
        accounting_date: format(store.accountingDate, "yyyy-MM-dd"),
        subtotal: total,
        discount: 0,
        tax: 0,
        total: total,
        products_received: store.productsReceived,
        notes: store.notes || null,
        tax_category: store.taxCategory || null,
        attachment_url: store.attachmentUrl,
        purchase_order_id: fromPurchaseOrder?.id || null,
      };

      if (mode === "edit" && initialData) {
        await updatePurchase(initialData.id, purchaseData, purchaseItems);
        toast.success("Compra actualizada correctamente");
      } else {
        console.log("purchaseData:", purchaseData);
        console.log("purchaseItems:", purchaseItems);
        await createPurchase(purchaseData, purchaseItems);
        toast.success("Compra creada correctamente");
      }

      // Clear store after successful submission
      store.clear();
      router.push("/compras");
    } catch (error) {
      console.error("Error saving purchase:", error);
      toast.error(
        mode === "edit"
          ? "Error al actualizar la compra"
          : "Error al crear la compra",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSupplier = suppliers.find(
    (s) => s.id === store.selectedSupplierId,
  );
  const pageTitle = mode === "edit" ? "Editar compra" : "Nueva compra";
  const submitButtonText =
    mode === "edit"
      ? isSubmitting
        ? "Actualizando..."
        : "Actualizar compra"
      : isSubmitting
        ? "Creando..."
        : "Crear compra";

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="gap-4">
          <Link
            href="/compras"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
          >
            Compras
            <ChevronRight className="h-3 w-3" />
          </Link>
          <h1 className="text-3xl font-bold">{pageTitle}</h1>
        </div>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Cards superiores: Proveedor y Fecha */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Card Proveedor */}
          <Card>
            <CardContent className="space-y-4 px-4 py-4">
              <div className="flex flex-col gap-6">
                <div className="space-y-2">
                  <Label>Proveedor *</Label>
                  <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openSupplier}
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
                                  store.setSupplierId(supplier.id);
                                  setOpenSupplier(false);
                                }}
                              >
                                <div
                                  className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-[4px] border border-input",
                                    store.selectedSupplierId === supplier.id
                                      ? "bg-primary text-primary-foreground"
                                      : "[&_svg]:invisible",
                                  )}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </div>
                                <span className="truncate">
                                  {supplier.name}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>Tipo de comprobante *</Label>
                    <Select
                      value={store.voucherType}
                      onValueChange={store.setVoucherType}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90">Comprobante X</SelectItem>
                        <SelectItem value="95">Nota de Crédito X</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-48 space-y-2">
                    <Label>Nº factura *</Label>
                    <Input
                      placeholder="Ingresá el número"
                      value={store.voucherNumber}
                      onChange={(e) => store.setVoucherNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Fechas */}
          <Card>
            <CardContent className="flex flex-col gap-6 px-4 py-4">
              <div className="space-y-2">
                <Label>Fecha de factura *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal active:scale-100"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(store.invoiceDate, "d 'de' MMMM 'de' yyyy", {
                        locale: es,
                      })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={store.invoiceDate}
                      onSelect={(date) => date && store.setInvoiceDate(date)}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Fecha de vencimiento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal active:scale-100"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {store.dueDate
                        ? format(store.dueDate, "d 'de' MMMM 'de' yyyy", {
                            locale: es,
                          })
                        : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={store.dueDate}
                      onSelect={(date) => store.setDueDate(date)}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de productos */}
        {store.selectedSupplierId && (
          <>
            <Card>
              <CardContent className="space-y-4 px-4 py-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="w-28 text-right">
                        Cantidad
                      </TableHead>
                      <TableHead className="w-32 text-right">
                        Costo unitario
                      </TableHead>
                      <TableHead className="w-32 text-right">
                        Subtotal
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {store.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.type === "product" ? (
                            <div className="font-medium">
                              {item.sku && `${item.sku} - `}
                              {item.name}
                            </div>
                          ) : (
                            <Input
                              className="h-8 w-full max-w-xs"
                              placeholder="Nombre del ítem"
                              value={item.name}
                              onChange={(e) =>
                                handleNameChange(item.id, e.target.value)
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
                              handleQuantityChange(
                                item.id,
                                parseInt(e.target.value) || 1,
                              )
                            }
                            className="h-8 w-20 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={`$${item.unitCost}`}
                            onChange={(e) =>
                              handleCostChange(item.id, e.target.value)
                            }
                            className="h-8 w-28 text-right"
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
                            className="h-7 w-7"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="flex gap-2">
                          <ProductSearchDialog
                            products={products}
                            excludedProductIds={store.items
                              .filter((i) => i.productId)
                              .map((i) => i.productId!)}
                            onProductsSelected={handleAddSelectedProducts}
                            formatCurrency={formatCurrency}
                          />

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={handleAddCustomItem}>
                                Ítem personalizado
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="flex items-center gap-3 pt-4">
                  <Checkbox
                    id="products-received"
                    checked={store.productsReceived}
                    onCheckedChange={(checked) =>
                      store.setProductsReceived(checked as boolean)
                    }
                  />
                  <Label htmlFor="products-received" className="cursor-pointer">
                    Marcar productos como recibidos
                  </Label>
                </div>

                {store.productsReceived && (
                  <div className="space-y-2">
                    <Label>Ubicación de recepción *</Label>
                    <Select
                      value={store.selectedLocationId}
                      onValueChange={store.setLocationId}
                    >
                      <SelectTrigger className="w-64">
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
                )}
              </CardContent>
            </Card>

            {/* Cards inferiores */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Info adicional */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Información adicional
                  </CardTitle>
                  <CardDescription>
                    Agregá notas sobre esta compra y subí el PDF o foto de la
                    factura.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog
                    open={openInfoDialog}
                    onOpenChange={setOpenInfoDialog}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="lg">
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar información
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Información adicional</DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <Label>Fecha contable</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full max-w-[250px] justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(
                                  store.accountingDate,
                                  "d 'de' MMMM 'de' yyyy",
                                  { locale: es },
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={store.accountingDate}
                                onSelect={(date) =>
                                  date && store.setAccountingDate(date)
                                }
                                locale={es}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <Label>Rubro IVA</Label>
                          <Select
                            value={store.taxCategory}
                            onValueChange={store.setTaxCategory}
                          >
                            <SelectTrigger className="w-full max-w-[250px]">
                              <SelectValue placeholder="Seleccioná un rubro" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bienes">Bienes</SelectItem>
                              <SelectItem value="bienes_uso">
                                Bienes de uso
                              </SelectItem>
                              <SelectItem value="locaciones">
                                Locaciones
                              </SelectItem>
                              <SelectItem value="servicios">
                                Servicios
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <Label>Notas</Label>
                          <Textarea
                            placeholder="Agregá notas sobre esta compra…"
                            value={store.notes}
                            onChange={(e) => store.setNotes(e.target.value)}
                            className="max-w-[250px]"
                            rows={2}
                          />
                        </div>

                        <div className="pt-4">
                          <FileUpload
                            value={store.attachmentUrl}
                            onChange={store.setAttachmentUrl}
                            onUpload={uploadPurchaseAttachment}
                            maxSize={5}
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          type="button"
                          onClick={() => setOpenInfoDialog(false)}
                        >
                          Confirmar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* Resumen */}
              <Card>
                <CardContent className="space-y-4 px-4 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Descuento</p>
                    <Button
                      variant="link"
                      className="h-8 p-0 text-muted-foreground"
                    >
                      Agregar
                    </Button>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Importes</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Impuestos</span>
                    <span>$0,00</span>
                  </div>

                  <div className="flex justify-between border-t pt-2 text-lg font-medium">
                    <span>Total</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      size="lg"
                      className="h-12 w-full text-base"
                      disabled={isSubmitting || store.items.length === 0}
                    >
                      {submitButtonText}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
