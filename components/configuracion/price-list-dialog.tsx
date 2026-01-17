"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  priceListSchema,
  type PriceListFormInput,
  ADJUSTMENT_TYPES,
} from "@/lib/validations/price-list"
import {
  createPriceList,
  updatePriceList,
  getPriceListById,
  type PriceList,
} from "@/lib/services/price-lists"

interface PriceListDialogProps {
  mode: "create" | "edit"
  priceListId?: string
  trigger?: React.ReactNode
  onSuccess?: (priceList: PriceList) => void
}

export function PriceListDialog({
  mode,
  priceListId,
  trigger,
  onSuccess,
}: PriceListDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<PriceListFormInput>({
    resolver: zodResolver(priceListSchema),
    defaultValues: {
      name: "",
      description: "",
      is_automatic: true,
      adjustment_type: "AUMENTO",
      adjustment_percentage: 0,
      includes_tax: true,
      active: true,
    },
  })

  const isAutomatic = form.watch("is_automatic")
  const includesTax = form.watch("includes_tax")

  // Load price list data in edit mode
  useEffect(() => {
    if (open && mode === "edit" && priceListId) {
      loadPriceList()
    }
  }, [open, mode, priceListId])

  async function loadPriceList() {
    if (!priceListId) return

    setIsLoading(true)
    try {
      const priceList = await getPriceListById(priceListId)
      form.reset({
        name: priceList.name,
        description: priceList.description || "",
        is_automatic: priceList.is_automatic,
        adjustment_type: priceList.adjustment_type as "AUMENTO" | "DESCUENTO",
        adjustment_percentage: priceList.adjustment_percentage,
        includes_tax: priceList.includes_tax,
        active: priceList.active,
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error al cargar la lista de precios", { description: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  async function onSubmit(data: PriceListFormInput) {
    setIsLoading(true)

    try {
      const priceListData = {
        name: data.name,
        description: data.description || null,
        is_automatic: data.is_automatic ?? true,
        adjustment_type: data.adjustment_type ?? "AUMENTO",
        adjustment_percentage: data.adjustment_percentage ?? 0,
        includes_tax: data.includes_tax ?? true,
        active: data.active ?? true,
      }

      let priceList: PriceList

      if (mode === "create") {
        priceList = await createPriceList(priceListData)
        toast.success("Lista de precios creada correctamente")
      } else {
        priceList = await updatePriceList(priceListId!, priceListData)
        toast.success("Lista de precios actualizada correctamente")
      }

      setOpen(false)
      resetForm()
      onSuccess?.(priceList)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      toast.error(
        mode === "create" ? "Error al crear la lista" : "Error al actualizar la lista",
        { description: errorMessage }
      )
    } finally {
      setIsLoading(false)
    }
  }

  function resetForm() {
    form.reset({
      name: "",
      description: "",
      is_automatic: true,
      adjustment_type: "AUMENTO",
      adjustment_percentage: 0,
      includes_tax: true,
      active: true,
    })
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen)
    if (!newOpen) {
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Agregar lista de precios
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Agregar Lista de Precios" : "Editar Lista de Precios"}
          </DialogTitle>
        </DialogHeader>

        {isLoading && mode === "edit" ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <Input placeholder="Lista de precios mayorista" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Lista Automática */}
              <FormField
                control={form.control}
                name="is_automatic"
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
                        Lista de precios automática
                      </FormLabel>
                      <FormDescription>
                        Las listas automáticas aplican un porcentaje de ajuste sobre el precio base.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Porcentaje de Ajuste (solo si es automática) */}
              {isAutomatic && (
                <div className="space-y-2">
                  <FormLabel>Porcentaje de Ajuste</FormLabel>
                  <div className="flex gap-2 items-center">
                    <FormField
                      control={form.control}
                      name="adjustment_type"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ADJUSTMENT_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type === "AUMENTO" ? "Aumento" : "Descuento"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="adjustment_percentage"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              )}

              {/* IVA Incluido */}
              <FormField
                control={form.control}
                name="includes_tax"
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
                        Precios con IVA incluido
                      </FormLabel>
                      <FormDescription>
                        {includesTax
                          ? "Ejemplo: $100 (IVA 21% incluido) = $82,64 + $17,36."
                          : "Ejemplo: $100 + IVA = $121."}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

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
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "create" ? "Crear Lista" : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
