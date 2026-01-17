import { z } from "zod"

export const categorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
})

export const createCategoryWithSubsSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  subcategories: z.array(z.string().min(1, "El nombre de la subcategoría es requerido")).optional(),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
})

export type CategoryFormData = z.infer<typeof categorySchema>
export type CreateCategoryWithSubsData = z.infer<typeof createCategoryWithSubsSchema>
export type UpdateCategoryData = z.infer<typeof updateCategorySchema>
