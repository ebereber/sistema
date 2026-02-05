"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { createPOSAction, updatePOSAction } from "@/lib/actions/point-of-sale";
import type { Location } from "@/lib/services/locations";
import type { PointOfSale } from "@/lib/services/point-of-sale";
import {
  pointOfSaleSchema,
  type PointOfSaleFormInput,
} from "@/lib/validations/point-of-sale";

interface POSSheetProps {
  mode: "create" | "edit";
  pos?: PointOfSale;
  locations?: Location[];
  trigger?: React.ReactNode;
  onSuccess?: (pos: PointOfSale) => void;
}

export function POSSheet({
  mode,
  pos,
  locations = [],
  trigger,
  onSuccess,
}: POSSheetProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PointOfSaleFormInput>({
    resolver: zodResolver(pointOfSaleSchema),
    defaultValues: {
      number: 1,
      name: "",
      is_digital: false,
      location_id: null,
      enabled_for_arca: false,
      active: true,
    },
  });

  const isDigital = form.watch("is_digital");

  // Reset form with pos data when opening in edit mode
  useEffect(() => {
    if (open && mode === "edit" && pos) {
      form.reset({
        number: pos.number,
        name: pos.name,
        is_digital: pos.is_digital ?? false,
        location_id: pos.location_id,
        enabled_for_arca: pos.enabled_for_arca ?? false,
        active: pos.active ?? true,
      });
    }
  }, [open, mode, pos]);

  // Clear location_id when switching to digital
  useEffect(() => {
    if (isDigital) {
      form.setValue("location_id", null);
    }
  }, [isDigital, form]);

  async function onSubmit(data: PointOfSaleFormInput) {
    setIsLoading(true);

    try {
      const posData = {
        number: data.number,
        name: data.name,
        is_digital: data.is_digital ?? false,
        location_id: data.is_digital ? null : (data.location_id ?? null),
        enabled_for_arca: data.enabled_for_arca ?? false,
        active: data.active ?? true,
      };

      let result: PointOfSale;

      if (mode === "create") {
        result = await createPOSAction(posData);
        toast.success("Punto de venta creado correctamente");
      } else {
        result = await updatePOSAction(pos!.id, posData);
        toast.success("Punto de venta actualizado correctamente");
      }

      setOpen(false);
      resetForm();
      onSuccess?.(result);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(
        mode === "create"
          ? "Error al crear el punto de venta"
          : "Error al actualizar el punto de venta",
        { description: errorMessage },
      );
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    form.reset({
      number: 1,
      name: "",
      is_digital: false,
      location_id: null,
      enabled_for_arca: false,
      active: true,
    });
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Agregar punto de venta
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="max-w-3/4 sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "create"
              ? "Agregar Punto de Venta"
              : "Editar Punto de Venta"}
          </SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Crea un nuevo punto de venta para tu negocio."
              : "Modifica los detalles del punto de venta."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4 px-4 flex-1"
          >
            {/* Número */}
            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Número <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="1"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? "" : parseInt(val));
                      }}
                      onBlur={(e) => {
                        // Al salir del input, si está vacío poner 1
                        if (!e.target.value) field.onChange(1);
                        field.onBlur();
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Número único del punto de venta (ej: 1, 2, 3...)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nombre */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Caja Principal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Es Digital */}
            <FormField
              control={form.control}
              name="is_digital"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      Punto de venta digital
                    </FormLabel>
                    <FormDescription>
                      Los puntos de venta digitales no requieren ubicación
                      física (ej: tienda online).
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Ubicación (solo para físicos) */}
            {!isDigital && (
              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Ubicación <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar ubicación" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.length === 0 ? (
                          <SelectItem value="no-locations" disabled>
                            No hay ubicaciones disponibles
                          </SelectItem>
                        ) : (
                          locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                              {location.is_main && " (Principal)"}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Habilitado para ARCA */}
            <FormField
              control={form.control}
              name="enabled_for_arca"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      Habilitado para ARCA
                    </FormLabel>
                    <FormDescription>
                      Permite emitir comprobantes fiscales desde este punto de
                      venta.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <SheetFooter className="mt-auto px-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Crear" : "Guardar Cambios"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
