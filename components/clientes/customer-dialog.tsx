"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Briefcase,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  User,
} from "lucide-react";
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

// Reutilizar dialogs de proveedores
import { AddressDialog } from "@/components/proveedores/address-dialog";
import { FiscalInfoDialog } from "@/components/proveedores/fiscal-info-dialog";
// Dialog propio de clientes
import { CommercialInfoDialog } from "./commercial-info-dialog";

import {
  createCustomer,
  getCustomerById,
  getSellers,
  updateCustomer,
  type Customer,
  type Seller,
} from "@/lib/services/customers";
import {
  customerSchema,
  type CommercialInfoData,
  type CustomerFormInput,
} from "@/lib/validations/customer";
import {
  type AddressData,
  type FiscalInfoData,
} from "@/lib/validations/supplier";

interface CustomerDialogProps {
  mode: "create" | "edit";
  customerId?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  submitButtonText?: string;
  onSuccess?: (customer: Customer) => void;
}

export function CustomerDialog({
  mode,
  customerId,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  submitButtonText,
  onSuccess,
}: CustomerDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (controlledOnOpenChange) {
      controlledOnOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Nested dialog states
  const [fiscalDialogOpen, setFiscalDialogOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [commercialDialogOpen, setCommercialDialogOpen] = useState(false);

  // State for nested data
  const [fiscalInfo, setFiscalInfo] = useState<FiscalInfoData>({
    tax_id_type: "DNI",
    legal_entity_type: "Física",
    tax_category: "Consumidor Final",
  });
  const [addressInfo, setAddressInfo] = useState<AddressData | null>(null);
  const [commercialInfo, setCommercialInfo] =
    useState<CommercialInfoData | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);

  const form = useForm<CustomerFormInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      tax_id: "",
      email: "",
      phone: "",
      tax_id_type: "DNI",
      legal_entity_type: "Física",
      tax_category: "Consumidor Final",
      active: true,
    },
  });

  // Load customer data in edit mode
  useEffect(() => {
    if (open && mode === "edit" && customerId) {
      loadCustomer();
    }
    if (open) {
      loadSellers();
    }
  }, [open, mode, customerId]);

  async function loadSellers() {
    try {
      const data = await getSellers();
      setSellers(data);
    } catch {
      setSellers([]);
    }
  }

  async function loadCustomer() {
    if (!customerId) return;

    setIsLoading(true);
    try {
      const customer = await getCustomerById(customerId);
      form.reset({
        name: customer.name,
        tax_id: customer.tax_id || "",
        email: customer.email || "",
        phone: customer.phone || "",
        tax_id_type: customer.tax_id_type || "DNI",
        legal_entity_type: customer.legal_entity_type || "Física",
        tax_category: customer.tax_category || "Consumidor Final",
        active: customer.active,
      });
      setFiscalInfo({
        tax_id_type: customer.tax_id_type || "DNI",
        legal_entity_type: customer.legal_entity_type || "Física",
        tax_category: customer.tax_category || "Consumidor Final",
      });
      if (customer.street_address) {
        setAddressInfo({
          street_address: customer.street_address,
          apartment: customer.apartment || "",
          postal_code: customer.postal_code || "",
          province: customer.province || "",
          city: customer.city || "",
        });
      }
      if (
        customer.trade_name ||
        customer.notes ||
        customer.assigned_seller_id ||
        customer.payment_terms
      ) {
        setCommercialInfo({
          trade_name: customer.trade_name || "",
          notes: customer.notes || "",
          assigned_seller_id: customer.assigned_seller_id,
          price_list_id: customer.price_list_id,
          payment_terms: customer.payment_terms || "",
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar el cliente", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearchArca() {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      toast.info("Funcionalidad próximamente", {
        description: "La búsqueda en ARCA estará disponible próximamente.",
      });
    }, 1500);
  }

  async function onSubmit(data: CustomerFormInput) {
    setIsLoading(true);

    try {
      const customerData = {
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
        notes: commercialInfo?.notes || null,
        assigned_seller_id: commercialInfo?.assigned_seller_id || null,
        price_list_id: commercialInfo?.price_list_id || null,
        payment_terms: commercialInfo?.payment_terms || null,
        active: true,
      };

      let customer: Customer;

      if (mode === "create") {
        customer = await createCustomer(customerData);
        toast.success("Cliente creado correctamente");
      } else {
        customer = await updateCustomer(customerId!, customerData);
        toast.success("Cliente actualizado correctamente");
      }

      setOpen(false);
      resetForm();
      onSuccess?.(customer);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(
        mode === "create"
          ? "Error al crear el cliente"
          : "Error al actualizar el cliente",
        { description: errorMessage },
      );
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    form.reset();
    setFiscalInfo({
      tax_id_type: "DNI",
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

  const selectedSeller = sellers.find(
    (s) => s.id === commercialInfo?.assigned_seller_id,
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {controlledOpen === undefined && (
          <DialogTrigger asChild>
            {trigger || (
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo cliente
              </Button>
            )}
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-2xl bg-sidebar sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Crear Cliente" : "Editar Cliente"}
            </DialogTitle>
          </DialogHeader>

          {isLoading && mode === "edit" ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
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

                {/* Email + Phone Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
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
                  commercialInfo.notes ||
                  commercialInfo.assigned_seller_id ||
                  commercialInfo.payment_terms) ? (
                  <Card className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="text-sm space-y-1">
                          {commercialInfo.trade_name && (
                            <p className="font-medium">
                              {commercialInfo.trade_name}
                            </p>
                          )}
                          {commercialInfo.notes && (
                            <p className="text-muted-foreground line-clamp-2">
                              {commercialInfo.notes}
                            </p>
                          )}
                          {selectedSeller && (
                            <p className="text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Vendedor: {selectedSeller.name}
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
                    {submitButtonText || (mode === "create" ? "Crear Cliente" : "Guardar Cambios")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Nested Dialogs - Reutilizando de proveedores */}
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
      {/* Dialog propio de clientes */}
      <CommercialInfoDialog
        open={commercialDialogOpen}
        onOpenChange={setCommercialDialogOpen}
        defaultValues={commercialInfo || undefined}
        onSave={setCommercialInfo}
      />
    </>
  );
}
