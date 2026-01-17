import { z } from "zod"

export const supplierSchema = z.object({
  name: z.string().min(1, "La razón social es requerida"),
  tax_id: z.string().optional().nullable(),
  tax_id_type: z.string().optional().default("CUIT/CUIL"),
  legal_entity_type: z.string().optional().default("Física"),
  tax_category: z.string().optional().default("Consumidor Final"),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  street_address: z.string().optional().nullable(),
  apartment: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  trade_name: z.string().optional().nullable(),
  business_description: z.string().optional().nullable(),
  payment_terms: z.string().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional().default(true),
})

export const fiscalInfoSchema = z.object({
  tax_id_type: z.string(),
  legal_entity_type: z.string(),
  tax_category: z.string(),
})

export const addressSchema = z.object({
  street_address: z.string().min(1, "La dirección es requerida"),
  apartment: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  province: z.string().min(1, "La provincia es requerida"),
  city: z.string().min(1, "La ciudad es requerida"),
})

export const commercialInfoSchema = z.object({
  trade_name: z.string().optional().nullable(),
  business_description: z.string().optional().nullable(),
  payment_terms: z.string().optional().nullable(),
})

export type SupplierFormData = z.infer<typeof supplierSchema>
export type SupplierFormInput = z.input<typeof supplierSchema>
export type FiscalInfoData = z.infer<typeof fiscalInfoSchema>
export type AddressData = z.infer<typeof addressSchema>
export type CommercialInfoData = z.infer<typeof commercialInfoSchema>

// Constants for select options
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
