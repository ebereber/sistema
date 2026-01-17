import { z } from "zod"

export const customerSchema = z.object({
  name: z.string().min(1, "La razón social es requerida"),
  trade_name: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  tax_id_type: z.string().optional().default("DNI"),
  legal_entity_type: z.string().optional().default("Física"),
  tax_category: z.string().optional().default("Consumidor Final"),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  street_address: z.string().optional().nullable(),
  apartment: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  assigned_seller_id: z.string().uuid().optional().nullable(),
  price_list_id: z.string().uuid().optional().nullable(),
  payment_terms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional().default(true),
})

export const commercialInfoSchema = z.object({
  trade_name: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assigned_seller_id: z.string().uuid().optional().nullable(),
  price_list_id: z.string().uuid().optional().nullable(),
  payment_terms: z.string().optional().nullable(),
})

export type CustomerFormData = z.infer<typeof customerSchema>
export type CustomerFormInput = z.input<typeof customerSchema>
export type CommercialInfoData = z.infer<typeof commercialInfoSchema>

// Reutilizar constantes de supplier (o definir aquí)
export const TAX_ID_TYPES = ["DNI", "CUIT/CUIL"] as const
export const LEGAL_ENTITY_TYPES = ["Física", "Jurídica"] as const
export const TAX_CATEGORIES = [
  "Responsable Inscripto",
  "Consumidor Final",
  "Monotributista",
  "Exento",
  "IVA no alcanzado",
] as const
export const PAYMENT_TERMS = [
  "Contado",
  "7 días",
  "15 días",
  "30 días",
  "45 días",
  "60 días",
  "90 días",
  "120 días",
] as const
