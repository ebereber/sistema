"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Image as ImageIcon,
  Plus,
  Search,
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
import {
  checkDuplicatePurchase,
  createPurchase,
  updatePurchase,
  uploadPurchaseAttachment,
  type CreatePurchaseItemData,
  type Purchase,
} from "@/lib/services/purchases";
import { getSuppliers, type Supplier } from "@/lib/services/suppliers";
import { FileUpload } from "../ui/file-upload";

// Types
interface PurchaseItem {
  id: string;
  productId: string | null;
  name: string;
  sku: string;
  quantity: number;
  unitCost: number;
  type: "product" | "custom";
}

interface PurchaseFormProps {
  mode: "create" | "edit";
  initialData?: Purchase;
  duplicateFrom?: Purchase;
}

export function PurchaseForm({
  mode,
  initialData,
  duplicateFrom,
}: PurchaseFormProps) {
  const router = useRouter();

  // Data from DB
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [voucherType, setVoucherType] = useState("90");
  const [voucherNumber, setVoucherNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productsReceived, setProductsReceived] = useState(false);
  const [notes, setNotes] = useState("");
  const [accountingDate, setAccountingDate] = useState<Date>(new Date());
  const [taxCategory, setTaxCategory] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  // UI state
  const [openSupplier, setOpenSupplier] = useState(false);
  const [openProducts, setOpenProducts] = useState(false);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);

  // Populate form with initial data (edit mode) or duplicate data
  const populateForm = useCallback(
    (data: Purchase) => {
      setSelectedSupplierId(data.supplier_id);
      setSelectedLocationId(data.location_id || "");
      setVoucherType(data.voucher_type);
      setVoucherNumber(mode === "edit" ? data.voucher_number : ""); // Clear voucher number when duplicating
      setInvoiceDate(new Date(data.invoice_date));
      setDueDate(data.due_date ? new Date(data.due_date) : undefined);
      setProductsReceived(data.products_received);
      setNotes(data.notes || "");
      setAccountingDate(
        data.accounting_date ? new Date(data.accounting_date) : new Date(),
      );
      setTaxCategory(data.tax_category || "");
      setAttachmentUrl(data.attachment_url || null);

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
        setItems(formItems);
      }
    },
    [mode],
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
          : productsResult.data || [],
      );
      setLocations(locationsData);

      // Set default location
      const mainLocation = locationsData.find((l) => l.is_main);
      if (mainLocation && !initialData && !duplicateFrom) {
        setSelectedLocationId(mainLocation.id);
      } else if (locationsData.length > 0 && !initialData && !duplicateFrom) {
        setSelectedLocationId(locationsData[0].id);
      }

      // Populate form if editing or duplicating
      if (initialData) {
        populateForm(initialData);
      } else if (duplicateFrom) {
        populateForm(duplicateFrom);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  }, [initialData, duplicateFrom, populateForm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper for product stock
  const getProductStock = (product: Product): number => {
    if (Array.isArray(product.stock)) {
      return product.stock.reduce((sum, s) => sum + (s.quantity || 0), 0);
    }
    return typeof product.stock === "number" ? product.stock : 0;
  };

  // Calculations
  const calculateSubtotal = (item: PurchaseItem) =>
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
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleAddSelectedProducts = () => {
    const newItems = products
      .filter(
        (p) =>
          selectedProductIds.has(p.id) &&
          !items.some((i) => i.productId === p.id),
      )
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
    setSelectedProductIds(new Set());
    setOpenProducts(false);
  };

  const handleAddCustomItem = () => {
    const newId = `custom-${Date.now()}`;
    setItems([
      ...items,
      {
        id: newId,
        productId: null,
        name: "",
        sku: "",
        quantity: 1,
        unitCost: 0,
        type: "custom",
      },
    ]);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setItems(
      items.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item,
      ),
    );
  };

  const handleCostChange = (itemId: string, cost: string) => {
    const numericCost = parseFloat(cost.replace(/[^0-9.]/g, "")) || 0;
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, unitCost: numericCost } : item,
      ),
    );
  };

  const handleNameChange = (itemId: string, name: string) => {
    setItems(
      items.map((item) => (item.id === itemId ? { ...item, name } : item)),
    );
  };

  // Handlers (agregar junto a los otros handlers)
  const handleSupplierCreated = (supplier: Supplier) => {
    // Agregar el nuevo proveedor a la lista
    setSuppliers((prev) =>
      [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name)),
    );
    // Seleccionarlo automáticamente
    setSelectedSupplierId(supplier.id);
    setSupplierDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplierId) {
      toast.error("Seleccioná un proveedor");
      return;
    }

    if (!voucherNumber.trim()) {
      toast.error("Ingresá el número de factura");
      return;
    }

    if (items.length === 0) {
      toast.error("Agregá al menos un producto");
      return;
    }

    if (productsReceived && !selectedLocationId) {
      toast.error("Seleccioná una ubicación para recibir los productos");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check for duplicate (only for create or if voucher number changed in edit)
      const shouldCheckDuplicate =
        mode === "create" ||
        (mode === "edit" && initialData?.voucher_number !== voucherNumber);

      if (shouldCheckDuplicate) {
        const isDuplicate = await checkDuplicatePurchase(
          selectedSupplierId,
          voucherType,
          voucherNumber,
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

      const purchaseItems: CreatePurchaseItemData[] = items.map((item) => ({
        product_id: item.productId,
        name: item.name,
        sku: item.sku || null,
        quantity: item.quantity,
        unit_cost: item.unitCost,
        subtotal: item.quantity * item.unitCost,
        type: item.type,
      }));

      const purchaseData = {
        supplier_id: selectedSupplierId,
        location_id: productsReceived ? selectedLocationId : null,
        voucher_type: voucherType,
        voucher_number: voucherNumber,
        invoice_date: format(invoiceDate, "yyyy-MM-dd"),
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        accounting_date: format(accountingDate, "yyyy-MM-dd"),
        subtotal: total,
        discount: 0,
        tax: 0,
        total: total,
        products_received: productsReceived,
        notes: notes || null,
        tax_category: taxCategory || null,
        attachment_url: attachmentUrl,
      };

      if (mode === "edit" && initialData) {
        await updatePurchase(initialData.id, purchaseData, purchaseItems);
        toast.success("Compra actualizada correctamente");
      } else {
        await createPurchase(purchaseData, purchaseItems);
        toast.success("Compra creada correctamente");
      }

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

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
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
                            <CommandItem
                              onSelect={() => {
                                setOpenSupplier(false);
                                setSupplierDialogOpen(true);
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              <span className="font-medium">
                                Crear nuevo proveedor
                              </span>
                            </CommandItem>
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
                    <Select value={voucherType} onValueChange={setVoucherType}>
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
                      value={voucherNumber}
                      onChange={(e) => setVoucherNumber(e.target.value)}
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
                      {format(invoiceDate, "d 'de' MMMM 'de' yyyy", {
                        locale: es,
                      })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={invoiceDate}
                      onSelect={(date) => date && setInvoiceDate(date)}
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
                      {dueDate
                        ? format(dueDate, "d 'de' MMMM 'de' yyyy", {
                            locale: es,
                          })
                        : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(date) => setDueDate(date)}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de productos */}
        {selectedSupplierId && (
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
                    {items.map((item) => (
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
                          <Dialog
                            open={openProducts}
                            onOpenChange={setOpenProducts}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Search className="mr-2 h-4 w-4" />
                                Agregar productos
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="flex h-[80vh] max-w-2xl flex-col overflow-hidden p-0">
                              <DialogHeader className="px-4 pt-4">
                                <DialogTitle>Agregar productos</DialogTitle>
                              </DialogHeader>
                              <Command className="flex h-full w-full flex-col overflow-hidden">
                                <CommandInput placeholder="Buscá productos por nombre o SKU…" />
                                <CommandList className="relative flex-1 overflow-y-auto">
                                  <div className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background px-3 py-2 text-sm font-medium text-muted-foreground">
                                    <div className="flex-1">Producto</div>
                                    <div className="hidden min-w-20 text-right sm:block">
                                      Stock
                                    </div>
                                    <div className="hidden min-w-28 text-right sm:block">
                                      Costo
                                    </div>
                                  </div>
                                  <CommandEmpty>
                                    No se encontraron productos
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {products.map((product) => {
                                      const alreadyAdded = items.some(
                                        (item) => item.productId === product.id,
                                      );
                                      const isSelected = selectedProductIds.has(
                                        product.id,
                                      );

                                      return (
                                        <CommandItem
                                          key={product.id}
                                          value={`${product.name} ${product.sku}`}
                                          onSelect={() =>
                                            !alreadyAdded &&
                                            toggleProductSelection(product.id)
                                          }
                                          disabled={alreadyAdded}
                                          className="flex cursor-pointer items-center gap-3 px-3 py-1.5"
                                        >
                                          <Checkbox
                                            checked={isSelected || alreadyAdded}
                                            disabled={alreadyAdded}
                                          />
                                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted">
                                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium">
                                                {product.name}
                                              </span>
                                              {alreadyAdded && (
                                                <span className="text-sm text-muted-foreground">
                                                  (ya agregado)
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                              SKU: {product.sku || "-"}
                                            </div>
                                          </div>
                                          <div className="hidden items-center gap-1 sm:flex">
                                            <div className="min-w-20 text-right">
                                              {getProductStock(product)}
                                            </div>
                                            <div className="min-w-28 text-right font-semibold">
                                              {formatCurrency(
                                                Number(product.cost) || 0,
                                              )}
                                            </div>
                                          </div>
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                              {selectedProductIds.size > 0 && (
                                <DialogFooter className="border-t p-4">
                                  <Button
                                    onClick={handleAddSelectedProducts}
                                    className="w-full"
                                  >
                                    Agregar {selectedProductIds.size} producto
                                    {selectedProductIds.size > 1 ? "s" : ""}
                                  </Button>
                                </DialogFooter>
                              )}
                            </DialogContent>
                          </Dialog>

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
                    checked={productsReceived}
                    onCheckedChange={(checked) =>
                      setProductsReceived(checked as boolean)
                    }
                  />
                  <Label htmlFor="products-received" className="cursor-pointer">
                    Marcar productos como recibidos
                  </Label>
                </div>

                {productsReceived && (
                  <div className="space-y-2">
                    <Label>Ubicación de recepción *</Label>
                    <Select
                      value={selectedLocationId}
                      onValueChange={setSelectedLocationId}
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
                                  accountingDate,
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
                                selected={accountingDate}
                                onSelect={(date) =>
                                  date && setAccountingDate(date)
                                }
                                locale={es}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <Label>Rubro IVA</Label>
                          <Select
                            value={taxCategory}
                            onValueChange={setTaxCategory}
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
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="max-w-[250px]"
                            rows={2}
                          />
                        </div>

                        <div className="pt-4">
                          <FileUpload
                            value={attachmentUrl}
                            onChange={setAttachmentUrl}
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
                      disabled={isSubmitting || items.length === 0}
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
