"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import {
  createCategoryWithSubsSchema,
  updateCategorySchema,
  type CreateCategoryWithSubsData,
  type UpdateCategoryData,
} from "@/lib/validations/category"
import {
  createCategory,
  updateCategory,
  type CategoryWithChildren,
} from "@/lib/services/categories"

interface CategoryFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: CategoryWithChildren | null
  onSuccess: () => void
}

export function CategoryFormSheet({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryFormSheetProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isEditMode = !!category

  // Create mode form
  const createForm = useForm<CreateCategoryWithSubsData>({
    resolver: zodResolver(createCategoryWithSubsSchema),
    defaultValues: {
      name: "",
      subcategories: [],
    },
  })

  // Edit mode form
  const editForm = useForm<UpdateCategoryData>({
    resolver: zodResolver(updateCategorySchema),
    defaultValues: {
      name: category?.name || "",
    },
  })

  // Dynamic subcategories for create mode
  const { fields, append, remove } = useFieldArray({
    control: createForm.control,
    name: "subcategories" as never,
  })

  // Reset forms when sheet opens/closes or category changes
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      if (category) {
        editForm.reset({ name: category.name })
      } else {
        createForm.reset({ name: "", subcategories: [] })
      }
    }
    onOpenChange(newOpen)
  }

  async function onCreateSubmit(data: CreateCategoryWithSubsData) {
    setIsLoading(true)

    try {
      await createCategory({
        name: data.name,
        subcategories: data.subcategories?.filter(Boolean),
      })

      toast.success("Categoría creada correctamente")
      createForm.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error al crear la categoría", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function onEditSubmit(data: UpdateCategoryData) {
    if (!category) return

    setIsLoading(true)

    try {
      await updateCategory(category.id, data.name)

      toast.success("Categoría actualizada correctamente")
      editForm.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error al actualizar la categoría", {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? "Editar Categoría" : "Agregar Categoría"}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? "Modificá el nombre de la categoría"
              : "Creá una nueva categoría y agregá subcategorías si necesitás"}
          </SheetDescription>
        </SheetHeader>

        {isEditMode ? (
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="flex flex-col gap-4 px-4 flex-1"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la categoría *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Electricidad"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter className="mt-auto px-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar cambios
                </Button>
              </SheetFooter>
            </form>
          </Form>
        ) : (
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(onCreateSubmit)}
              className="flex flex-col gap-4 px-4 flex-1"
            >
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la categoría *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Electricidad"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel>Subcategorías</FormLabel>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <Input
                      placeholder={`Subcategoría ${index + 1}`}
                      {...createForm.register(`subcategories.${index}` as const)}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append("")}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar subcategoría
                </Button>
              </div>

              <SheetFooter className="mt-auto px-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear categoría
                </Button>
              </SheetFooter>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  )
}
