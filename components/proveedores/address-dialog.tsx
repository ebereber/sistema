"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

import { addressSchema, type AddressData } from "@/lib/validations/supplier"
import { PROVINCIAS, getCiudadesByProvincia } from "@/lib/constants/argentina-locations"

interface AddressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: Partial<AddressData>
  onSave: (data: AddressData) => void
}

export function AddressDialog({
  open,
  onOpenChange,
  defaultValues,
  onSave,
}: AddressDialogProps) {
  const [provinceOpen, setProvinceOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [ciudades, setCiudades] = useState<string[]>([])

  const form = useForm<AddressData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street_address: defaultValues?.street_address || "",
      apartment: defaultValues?.apartment || "",
      postal_code: defaultValues?.postal_code || "",
      province: defaultValues?.province || "",
      city: defaultValues?.city || "",
    },
  })

  const selectedProvince = form.watch("province")

  useEffect(() => {
    if (selectedProvince) {
      const cities = getCiudadesByProvincia(selectedProvince)
      setCiudades(cities)
      // Reset city if province changes
      if (!cities.includes(form.getValues("city"))) {
        form.setValue("city", "")
      }
    } else {
      setCiudades([])
    }
  }, [selectedProvince, form])

  function onSubmit(data: AddressData) {
    onSave(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Dirección</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="street_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección *</FormLabel>
                  <FormControl>
                    <Input placeholder="Av. Corrientes 1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="apartment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depto/Piso</FormLabel>
                    <FormControl>
                      <Input placeholder="4° B" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Postal</FormLabel>
                    <FormControl>
                      <Input placeholder="1234" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Provincia *</FormLabel>
                  <Popover open={provinceOpen} onOpenChange={setProvinceOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={provinceOpen}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value || "Seleccionar provincia"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar provincia..." />
                        <CommandList>
                          <CommandEmpty>No se encontró la provincia</CommandEmpty>
                          <CommandGroup>
                            {PROVINCIAS.map((provincia) => (
                              <CommandItem
                                key={provincia}
                                value={provincia}
                                onSelect={() => {
                                  form.setValue("province", provincia)
                                  setProvinceOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === provincia
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {provincia}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Ciudad *</FormLabel>
                  <Popover open={cityOpen} onOpenChange={setCityOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={cityOpen}
                          disabled={!selectedProvince || ciudades.length === 0}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value || "Seleccionar ciudad"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar ciudad..." />
                        <CommandList>
                          <CommandEmpty>No se encontró la ciudad</CommandEmpty>
                          <CommandGroup>
                            {ciudades.map((ciudad) => (
                              <CommandItem
                                key={ciudad}
                                value={ciudad}
                                onSelect={() => {
                                  form.setValue("city", ciudad)
                                  setCityOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === ciudad
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {ciudad}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
