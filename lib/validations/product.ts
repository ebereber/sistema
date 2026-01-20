import { z } from "zod"

export const TAX_RATES = [0, 10.5, 21, 27] as const
export const VISIBILITY_OPTIONS = [
  "SALES_AND_PURCHASES",
  "SALES_ONLY",
  "PURCHASES_ONLY",
] as const
export const PRODUCT_TYPES = ["PRODUCT", "SERVICE"] as const

export const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional().nullable(),
  product_type: z.enum(PRODUCT_TYPES).optional().default("PRODUCT"),
  sku: z.string().min(1, "El SKU es requerido"),
  barcode: z.string().optional().nullable(),
  oem_code: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  default_supplier_id: z.string().uuid().optional().nullable(),
  cost: z.number().min(0, "El costo debe ser mayor o igual a 0").optional().nullable(),
  margin_percentage: z.number().optional().nullable(),
  price: z.number().min(0, "El precio debe ser mayor o igual a 0"),
  tax_rate: z.number().min(0).max(100).optional().default(21),
  currency: z.string().optional().default("ARS"),
  track_stock: z.boolean().optional().default(true),
  min_stock: z.number().int().min(0).optional().nullable(),
  visibility: z.enum(VISIBILITY_OPTIONS).optional().default("SALES_AND_PURCHASES"),
  image_url: z.string().url().optional().nullable(),
  active: z.boolean().optional().default(true),
})

export const stockByLocationSchema = z.object({
  location_id: z.string().uuid(),
  location_name: z.string().optional(),
  is_main: z.boolean().optional(),
  quantity: z.number().int().min(0, "La cantidad no puede ser negativa"),
})

export const createProductSchema = z.object({
  product: productSchema,
  stockByLocation: z.array(stockByLocationSchema),
})

export type ProductFormData = z.infer<typeof productSchema>
export type ProductFormInput = z.input<typeof productSchema>
export type StockByLocationData = z.infer<typeof stockByLocationSchema>
export type CreateProductData = z.infer<typeof createProductSchema>
