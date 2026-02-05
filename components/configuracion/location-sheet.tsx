"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

import {
  createLocationAction,
  updateLocationAction,
} from "@/lib/actions/locations";
import { type Location } from "@/lib/services/locations";
import {
  locationSchema,
  type LocationFormInput,
} from "@/lib/validations/location";

interface LocationSheetProps {
  mode: "create" | "edit";
  location?: Location;
  trigger?: React.ReactNode;
  onSuccess?: (location: Location) => void;
}

export function LocationSheet({
  mode,
  location,
  trigger,
  onSuccess,
}: LocationSheetProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LocationFormInput>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
      address: "",
      is_main: false,
      active: true,
    },
  });

  async function onSubmit(data: LocationFormInput) {
    setIsLoading(true);

    try {
      const locationData = {
        name: data.name,
        address: data.address || null,
        is_main: data.is_main ?? false,
        active: data.active ?? true,
      };

      let result: Location;

      if (mode === "create") {
        result = await createLocationAction(locationData);
        toast.success("Ubicación creada correctamente");
      } else {
        result = await updateLocationAction(location!.id, locationData);
        toast.success("Ubicación actualizada correctamente");
      }

      setOpen(false);
      resetForm();
      onSuccess?.(result);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(
        mode === "create"
          ? "Error al crear la ubicación"
          : "Error al actualizar la ubicación",
        { description: errorMessage },
      );
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    form.reset({
      name: "",
      address: "",
      is_main: false,
      active: true,
    });
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (newOpen && mode === "edit" && location) {
      form.reset({
        name: location.name,
        address: location.address || "",
        is_main: location.is_main ?? false,
        active: location.active ?? true,
      });
    }
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
            Agregar ubicación
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="max-w-3/4 sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? "Agregar Ubicación" : "Editar Ubicación"}
          </SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Crea una nueva ubicación para tu negocio."
              : "Modifica los detalles de la ubicación."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4 px-4 flex-1"
            >
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
                      <Input placeholder="Sucursal Centro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dirección */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Av. Corrientes 1234, CABA"
                        className="resize-none"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Es Principal */}
              <FormField
                control={form.control}
                name="is_main"
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
                        Ubicación principal
                      </FormLabel>
                      <FormDescription>
                        La ubicación principal será la seleccionada por defecto
                        en nuevas operaciones.
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
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {mode === "create" ? "Crear" : "Guardar Cambios"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
      </SheetContent>
    </Sheet>
  );
}
