import { z } from "zod"

export const locationSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  address: z.string().optional().nullable(),
  is_main: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
})

export type LocationFormData = z.infer<typeof locationSchema>
export type LocationFormInput = z.input<typeof locationSchema>
