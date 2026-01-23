import { z } from "zod"

export const PAYMENT_METHOD_TYPES = [
  "EFECTIVO",
  "CHEQUE",
  "TARJETA",
  "TRANSFERENCIA",
  "OTRO",
] as const

export const PAYMENT_METHOD_AVAILABILITY = [
  "VENTAS",
  "COMPRAS",
  "VENTAS_Y_COMPRAS",
] as const

export const paymentMethodSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no puede exceder 100 caracteres"),

  type: z.enum(PAYMENT_METHOD_TYPES),

  availability: z.enum(PAYMENT_METHOD_AVAILABILITY).optional().default("VENTAS_Y_COMPRAS"),

  fee_percentage: z
    .number()
    .min(0, "La comisión no puede ser negativa")
    .max(100, "La comisión no puede exceder 100%")
    .optional()
    .default(0),

  fee_fixed: z
    .number()
    .min(0, "La comisión fija no puede ser negativa")
    .optional()
    .default(0),

  requires_reference: z.boolean().optional().default(false),

  is_active: z.boolean().optional().default(true),
})

export type PaymentMethodFormData = z.infer<typeof paymentMethodSchema>
export type PaymentMethodFormInput = z.input<typeof paymentMethodSchema>
