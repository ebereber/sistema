import { z } from "zod"

export const pointOfSaleSchema = z
  .object({
    number: z.number().int().positive("El número debe ser positivo"),
    name: z.string().min(1, "El nombre es requerido"),
    is_digital: z.boolean().optional().default(false),
    location_id: z.string().uuid().optional().nullable(),
    enabled_for_arca: z.boolean().optional().default(false),
    active: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      // Si es físico, requiere location_id
      if (!data.is_digital && !data.location_id) {
        return false
      }
      return true
    },
    {
      message: "Los puntos de venta físicos requieren una ubicación asignada",
      path: ["location_id"],
    }
  )
  .refine(
    (data) => {
      // Si es digital, no debe tener location_id
      if (data.is_digital && data.location_id) {
        return false
      }
      return true
    },
    {
      message: "Los puntos de venta digitales no pueden tener ubicación asignada",
      path: ["location_id"],
    }
  )

export type PointOfSaleFormData = z.infer<typeof pointOfSaleSchema>
export type PointOfSaleFormInput = z.input<typeof pointOfSaleSchema>
