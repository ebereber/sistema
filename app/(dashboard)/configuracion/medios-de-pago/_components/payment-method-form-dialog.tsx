"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter, DialogTitle } from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import {
  createPaymentMethod,
  updatePaymentMethod,
} from "@/lib/services/payment-methods";
import {
  paymentMethodSchema,
  type PaymentMethodFormInput,
} from "@/lib/validations/payment-method";
import type { PaymentMethod, PaymentMethodType } from "@/types/payment-method";
import { PAYMENT_TYPE_CONFIG } from "@/types/payment-method";

interface PaymentMethodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: PaymentMethodType;
  paymentMethod?: PaymentMethod;
  onSuccess: () => void;
  onBack?: () => void;
}

export function PaymentMethodFormDialog({
  open,
  onOpenChange,
  type,
  paymentMethod,
  onSuccess,
  onBack,
}: PaymentMethodFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!paymentMethod;

  const form = useForm<PaymentMethodFormInput>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      name: paymentMethod?.name || "",
      type: paymentMethod?.type || type,
      availability: paymentMethod?.availability || "VENTAS_Y_COMPRAS",
      fee_percentage: paymentMethod?.fee_percentage || 0,
      fee_fixed: paymentMethod?.fee_fixed || 0,
      requires_reference: paymentMethod?.requires_reference || false,
      is_active: paymentMethod?.is_active ?? true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: paymentMethod?.name || "",
        type: paymentMethod?.type || type,
        availability: paymentMethod?.availability || "VENTAS_Y_COMPRAS",
        fee_percentage: paymentMethod?.fee_percentage || 0,
        fee_fixed: paymentMethod?.fee_fixed || 0,
        requires_reference: paymentMethod?.requires_reference || false,
        is_active: paymentMethod?.is_active ?? true,
      });
    }
  }, [open, paymentMethod, type, form]);

  async function onSubmit(data: PaymentMethodFormInput) {
    setIsSubmitting(true);
    try {
      const icon = PAYMENT_TYPE_CONFIG[data.type].icon;

      const payload = {
        name: data.name,
        type: data.type,
        icon,
        availability: data.availability ?? ("VENTAS_Y_COMPRAS" as const),
        fee_percentage: data.fee_percentage ?? 0,
        fee_fixed: data.fee_fixed ?? 0,
        requires_reference: data.requires_reference ?? false,
        is_active: data.is_active ?? true,
      };

      if (isEditing) {
        await updatePaymentMethod(paymentMethod!.id, {
          ...payload,
          is_system: paymentMethod!.is_system,
        });
        toast.success("Medio de pago actualizado");
      } else {
        await createPaymentMethod({
          ...payload,
          is_system: false,
        });
        toast.success("Medio de pago creado");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al guardar";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <DialogTitle>
            {isEditing ? "Editar Medio de Pago" : "Agregar Medio de Pago"}
          </DialogTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 p-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Efectivo USD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PAYMENT_TYPE_CONFIG).map(
                        ([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disponibilidad</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="VENTAS_Y_COMPRAS">
                        Ventas y Compras
                      </SelectItem>
                      <SelectItem value="VENTAS">Solo Ventas</SelectItem>
                      <SelectItem value="COMPRAS">Solo Compras</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fee_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comisión (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fee_fixed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comisión Fija ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="requires_reference"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">
                      Requiere Referencia
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Solicitar nro. de referencia al registrar el pago
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        Activo
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Disponible para seleccionar en ventas y compras
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              {!isEditing && onBack && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="mr-auto"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Atrás
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
