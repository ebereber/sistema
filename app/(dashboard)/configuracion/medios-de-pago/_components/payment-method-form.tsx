// app/(dashboard)/configuracion/medios-de-pago/_components/payment-method-form.tsx

import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  createPaymentMethodAction,
  updatePaymentMethodAction,
} from "@/lib/actions/payment-methods";
import {
  paymentMethodSchema,
  type PaymentMethodFormInput,
} from "@/lib/validations/payment-method";
import type { PaymentMethod, PaymentMethodType } from "@/types/payment-method";
import { PAYMENT_TYPE_CONFIG } from "@/types/payment-method";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface PaymentMethodFormProps {
  type: PaymentMethodType;
  paymentMethod?: PaymentMethod;
  onSuccess: () => void;
  onCancel: () => void;
  onClick: () => void;
}

export function PaymentMethodForm({
  type,
  paymentMethod,
  onSuccess,
  onCancel,
  onClick,
}: PaymentMethodFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentMethodFormInput>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: paymentMethod
      ? {
          // Modo edición: usar datos existentes
          name: paymentMethod.name,
          type: paymentMethod.type,
          availability: paymentMethod.availability,
          fee_percentage: paymentMethod.fee_percentage,
          fee_fixed: paymentMethod.fee_fixed,
          requires_reference: paymentMethod.requires_reference,
          is_active: paymentMethod.is_active,
        }
      : {
          // Modo crear: valores por defecto
          name: "",
          type: type,
          availability: "VENTAS_Y_COMPRAS",
          fee_percentage: 0,
          fee_fixed: 0,
          requires_reference: false,
          is_active: true,
        },
  });

  async function onSubmit(data: PaymentMethodFormInput) {
    setIsSubmitting(true);
    try {
      const icon = PAYMENT_TYPE_CONFIG[data.type].icon;

      if (paymentMethod) {
        // EDITAR
        await updatePaymentMethodAction(paymentMethod.id, {
          name: data.name,
          availability: data.availability ?? "VENTAS_Y_COMPRAS",
          fee_percentage: data.fee_percentage ?? 0,
          fee_fixed: data.fee_fixed ?? 0,
          requires_reference: data.requires_reference ?? false,
          is_active: data.is_active ?? true,
        });
        toast.success("Medio de pago actualizado");
      } else {
        // CREAR
        await createPaymentMethodAction({
          name: data.name,
          type: data.type,
          icon,
          availability: data.availability ?? "VENTAS_Y_COMPRAS",
          fee_percentage: data.fee_percentage ?? 0,
          fee_fixed: data.fee_fixed ?? 0,
          requires_reference: data.requires_reference ?? false,
          is_active: data.is_active ?? true,
          is_system: false,
        });
        toast.success("Medio de pago creado");
      }

      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 ">
        {/* Nombre */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Efectivo, Tarjeta de crédito, Transferencia"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tipo (disabled porque ya se seleccionó) */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="hidden">
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
                  {Object.entries(PAYMENT_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Disponibilidad */}
        <FormField
          control={form.control}
          name="availability"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Disponibilidad</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
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
        <Separator />
        {/* Comisiones */}
        <div className="flex flex-col space-y-4">
          <FormField
            control={form.control}
            name="fee_percentage"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-col gap-2">
                  <FormLabel>Comisión (%)</FormLabel>
                  <span className="font-normal text-muted-foreground text-sm leading-normal">
                    Porcentaje del monto total
                  </span>
                </div>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="[&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                    value={field.value === 0 ? "" : field.value}
                    onChange={(e) => {
                      const value =
                        e.target.value === "" ? 0 : parseFloat(e.target.value);
                      field.onChange(isNaN(value) ? 0 : value);
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
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
                <div className="flex flex-col gap-2">
                  <FormLabel>Comisión Fija ($)</FormLabel>
                  <span className="font-normal text-muted-foreground text-sm leading-normal">
                    Monto fijo por transacción
                  </span>
                </div>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    className="[&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                    value={field.value === 0 ? "" : field.value}
                    onChange={(e) => {
                      const value =
                        e.target.value === "" ? 0 : parseFloat(e.target.value);
                      field.onChange(isNaN(value) ? 0 : value);
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Separator />
        {/* Requiere Referencia */}
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

        {/* Botones de acción */}
        <div className="flex gap-2 pt-4 md:flex-row flex-col justify-end">
          {onClick && ( // Solo mostrar "Atrás" si onClick existe
            <Button
              variant="outline"
              size="sm"
              onClick={onClick}
              className="md:w-fit w-full"
              type="button"
            >
              Atrás
            </Button>
          )}
          {/*   <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancelar
          </Button> */}
          <Button
            type="submit"
            size={"sm"}
            className="md:w-fit w-full"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
            {paymentMethod ? "Guardar Cambios" : "Crear Medio de Pago"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
