import { z } from "zod"

export const ADJUSTMENT_TYPES = ["AUMENTO", "DESCUENTO"] as const

export const priceListSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional().nullable(),
  is_automatic: z.boolean().optional().default(true),
  adjustment_type: z.enum(ADJUSTMENT_TYPES).optional().default("AUMENTO"),
  adjustment_percentage: z
    .number()
    .min(0, "El porcentaje debe ser mayor o igual a 0")
    .max(100, "El porcentaje no puede ser mayor a 100")
    .optional()
    .default(0),
  includes_tax: z.boolean().optional().default(true),
  active: z.boolean().optional().default(true),
})

export type PriceListFormData = z.infer<typeof priceListSchema>
export type PriceListFormInput = z.input<typeof priceListSchema>
