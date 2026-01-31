"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Loader2, MapPin, Pencil, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { AddressDialog } from "./address-dialog";
import { CommercialInfoDialog } from "./commercial-info-dialog";
import { FiscalInfoDialog } from "./fiscal-info-dialog";

import {
  createSupplier,
  getSupplierById,
  updateSupplier,
  type Supplier,
} from "@/lib/services/suppliers";
import {
  supplierSchema,
  type AddressData,
  type CommercialInfoData,
  type FiscalInfoData,
  type SupplierFormInput,
} from "@/lib/validations/supplier";

interface SupplierDialogProps {
  mode: "create" | "edit";
  supplierId?: string;
  trigger?: React.ReactNode;
  onSuccess?: (supplier: Supplier) => void;
}

export function SupplierDialog({
  mode,
  supplierId,
  trigger,
  onSuccess,
}: SupplierDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Nested dialog states
  const [fiscalDialogOpen, setFiscalDialogOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [commercialDialogOpen, setCommercialDialogOpen] = useState(false);

  // State for nested data
  const [fiscalInfo, setFiscalInfo] = useState<FiscalInfoData>({
    tax_id_type: "CUIT/CUIL",
    legal_entity_type: "Física",
    tax_category: "Consumidor Final",
  });
  const [addressInfo, setAddressInfo] = useState<AddressData | null>(null);
  const [commercialInfo, setCommercialInfo] =
    useState<CommercialInfoData | null>(null);

  const form = useForm<SupplierFormInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      tax_id: "",
      email: "",
      phone: "",
      tax_id_type: "CUIT/CUIL",
      legal_entity_type: "Física",
      tax_category: "Consumidor Final",
      active: true,
    },
  });

  // Load supplier data in edit mode
  useEffect(() => {
    if (open && mode === "edit" && supplierId) {
      loadSupplier();
    }
  }, [open, mode, supplierId]);

  async function loadSupplier() {
    if (!supplierId) return;

    setIsLoading(true);
    try {
      const supplier = await getSupplierById(supplierId);
      form.reset({
        name: supplier.name,
        tax_id: supplier.tax_id || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        tax_id_type: supplier.tax_id_type || "CUIT/CUIL",
        legal_entity_type: supplier.legal_entity_type || "Física",
        tax_category: supplier.tax_category || "Consumidor Final",
        active: supplier.active ?? true,
      });
      setFiscalInfo({
        tax_id_type: supplier.tax_id_type || "CUIT/CUIL",
        legal_entity_type: supplier.legal_entity_type || "Física",
        tax_category: supplier.tax_category || "Consumidor Final",
      });
      if (supplier.street_address) {
        setAddressInfo({
          street_address: supplier.street_address,
          apartment: supplier.apartment || "",
          postal_code: supplier.postal_code || "",
          province: supplier.province || "",
          city: supplier.city || "",
        });
      }
      if (
        supplier.trade_name ||
        supplier.business_description ||
        supplier.payment_terms
      ) {
        setCommercialInfo({
          trade_name: supplier.trade_name || "",
          business_description: supplier.business_description || "",
          payment_terms: supplier.payment_terms || "",
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar el proveedor", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearchArca() {
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setIsSearching(false);
      toast.info("Funcionalidad próximamente", {
        description: "La búsqueda en ARCA estará disponible próximamente.",
      });
    }, 1500);
  }

  async function onSubmit(data: SupplierFormInput) {
    setIsLoading(true);

    try {
      const supplierData = {
        name: data.name,
        tax_id: data.tax_id || null,
        tax_id_type: fiscalInfo.tax_id_type,
        legal_entity_type: fiscalInfo.legal_entity_type,
        tax_category: fiscalInfo.tax_category,
        email: data.email || null,
        phone: data.phone || null,
        street_address: addressInfo?.street_address || null,
        apartment: addressInfo?.apartment || null,
        postal_code: addressInfo?.postal_code || null,
        province: addressInfo?.province || null,
        city: addressInfo?.city || null,
        trade_name: commercialInfo?.trade_name || null,
        business_description: commercialInfo?.business_description || null,
        payment_terms: commercialInfo?.payment_terms || null,
        contact_person: null,
        notes: null,
        active: true,
      };

      let supplier: Supplier;

      if (mode === "create") {
        supplier = await createSupplier(supplierData);
        toast.success("Proveedor creado correctamente");
      } else {
        supplier = await updateSupplier(supplierId!, supplierData);
        toast.success("Proveedor actualizado correctamente");
      }

      setOpen(false);
      resetForm();
      onSuccess?.(supplier);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(
        mode === "create"
          ? "Error al crear el proveedor"
          : "Error al actualizar el proveedor",
        {
          description: errorMessage,
        },
      );
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    form.reset();
    setFiscalInfo({
      tax_id_type: "CUIT/CUIL",
      legal_entity_type: "Física",
      tax_category: "Consumidor Final",
    });
    setAddressInfo(null);
    setCommercialInfo(null);
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo proveedor
            </Button>
          )}
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-2xl bg-sidebar
         sm:max-h-[90vh]  overflow-y-auto "
        >
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Crear Proveedor" : "Editar Proveedor"}
            </DialogTitle>
          </DialogHeader>

          {isLoading && mode === "edit" ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit(onSubmit)(e);
                }}
                className="space-y-4"
              >
                {/* ARCA Search */}
                <div className="space-y-2">
                  <FormLabel>Número de Documento</FormLabel>
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="tax_id"
                      render={({ field }) => (
                        <FormControl>
                          <Input
                            placeholder="Ingresá CUIT o DNI..."
                            {...field}
                            value={field.value || ""}
                            className="flex-1"
                          />
                        </FormControl>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSearchArca}
                      disabled={isSearching}
                      className="bg-gray-200"
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline ml-2">
                        Buscar en ARCA
                      </span>
                    </Button>
                  </div>
                </div>

                {/* Razón Social */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Razón Social <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Juan Pérez" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contact Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="correo@ejemplo.com"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="11-1234-5678"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Fiscal Info Card */}
                <Card className="p-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="grid grid-cols-3 gap-4 flex-1 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Tipo</p>
                        <p className="font-medium">{fiscalInfo.tax_id_type}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Personería
                        </p>
                        <p className="font-medium">
                          {fiscalInfo.legal_entity_type}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Categoría
                        </p>
                        <p className="font-medium">{fiscalInfo.tax_category}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFiscalDialogOpen(true)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>

                {/* Address Button/Summary */}
                {addressInfo ? (
                  <Card className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium">
                            {addressInfo.street_address}
                            {addressInfo.apartment &&
                              `, ${addressInfo.apartment}`}
                          </p>
                          <p className="text-muted-foreground">
                            {addressInfo.city}, {addressInfo.province}
                            {addressInfo.postal_code &&
                              ` - CP: ${addressInfo.postal_code}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setAddressDialogOpen(true)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start border border-gray-300"
                    onClick={() => setAddressDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar dirección
                  </Button>
                )}

                {/* Commercial Info Button/Summary */}
                {commercialInfo &&
                (commercialInfo.trade_name ||
                  commercialInfo.business_description ||
                  commercialInfo.payment_terms) ? (
                  <Card className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="text-sm">
                          {commercialInfo.trade_name && (
                            <p className="font-medium">
                              {commercialInfo.trade_name}
                            </p>
                          )}
                          {commercialInfo.business_description && (
                            <p className="text-muted-foreground line-clamp-2">
                              {commercialInfo.business_description}
                            </p>
                          )}
                          {commercialInfo.payment_terms && (
                            <p className="text-muted-foreground">
                              Pago: {commercialInfo.payment_terms}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setCommercialDialogOpen(true)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start border border-gray-300"
                    onClick={() => setCommercialDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar información comercial
                  </Button>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {mode === "create" ? "Crear Proveedor" : "Guardar Cambios"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Nested Dialogs */}
      <FiscalInfoDialog
        open={fiscalDialogOpen}
        onOpenChange={setFiscalDialogOpen}
        defaultValues={fiscalInfo}
        onSave={setFiscalInfo}
      />
      <AddressDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        defaultValues={addressInfo || undefined}
        onSave={setAddressInfo}
      />
      <CommercialInfoDialog
        open={commercialDialogOpen}
        onOpenChange={setCommercialDialogOpen}
        defaultValues={commercialInfo || undefined}
        onSave={setCommercialInfo}
      />
    </>
  );
}
