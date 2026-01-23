import { z } from "zod"

export const DISCOUNT_TYPES = ["percentage", "fixed"] as const

// Schema for item-level discount
export const itemDiscountSchema = z.object({
  type: z.enum(DISCOUNT_TYPES),
  value: z.number().min(0, "El valor debe ser mayor o igual a 0"),
})

// Schema for cart item
export const cartItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid().nullable(), // null for custom items
  name: z.string(),
  sku: z.string(),
  basePrice: z.number().min(0), // Original price without price list adjustments
  price: z.number().min(0),
  quantity: z.number().int().min(1, "La cantidad debe ser al menos 1"),
  taxRate: z.number().min(0).max(100).default(21),
  discount: itemDiscountSchema.optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
})

// Schema for global discount
export const globalDiscountSchema = z.object({
  type: z.enum(DISCOUNT_TYPES),
  value: z.number().min(0, "El valor debe ser mayor o igual a 0"),
})

// Schema for selected customer
export const selectedCustomerSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string(),
  taxId: z.string().optional().nullable(),
  taxCategory: z.string().optional().nullable(),
  priceListId: z.string().uuid().optional().nullable(),
  priceListName: z.string().optional().nullable(),
  priceListAdjustment: z.number().optional().nullable(),
  priceListAdjustmentType: z.enum(["AUMENTO", "DESCUENTO"]).optional().nullable(),
})

// Types derived from schemas
export type DiscountType = z.infer<typeof itemDiscountSchema>["type"]
export type ItemDiscount = z.infer<typeof itemDiscountSchema>
export type CartItem = z.infer<typeof cartItemSchema>
export type GlobalDiscount = z.infer<typeof globalDiscountSchema>
export type SelectedCustomer = z.infer<typeof selectedCustomerSchema>

// Cart totals type (not a schema, calculated)
export interface CartTotals {
  subtotal: number
  itemDiscounts: number
  globalDiscount: number
  taxes: number
  total: number
}

// Default customer for "Consumidor Final"
export const DEFAULT_CUSTOMER: SelectedCustomer = {
  id: null,
  name: "Consumidor Final",
  taxId: null,
  taxCategory: "Consumidor Final",
  priceListId: null,
  priceListName: null,
  priceListAdjustment: null,
  priceListAdjustmentType: null,
}

/**
 * Calculate discount amount for a single item
 */
export function calculateItemDiscount(
  price: number,
  quantity: number,
  discount: ItemDiscount | null | undefined
): number {
  if (!discount) return 0

  const subtotal = price * quantity
  if (discount.type === "percentage") {
    return subtotal * (discount.value / 100)
  }
  return Math.min(discount.value * quantity, subtotal)
}

/**
 * Calculate item total after discount
 */
export function calculateItemTotal(item: CartItem): number {
  const subtotal = item.price * item.quantity
  const discountAmount = calculateItemDiscount(item.price, item.quantity, item.discount)
  return subtotal - discountAmount
}

/**
 * Calculate cart totals
 */
export function calculateCartTotals(
  items: CartItem[],
  globalDiscount: GlobalDiscount | null
): CartTotals {
  // Calculate subtotal (sum of all item subtotals before any discounts)
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Calculate total item discounts
  const itemDiscounts = items.reduce(
    (sum, item) => sum + calculateItemDiscount(item.price, item.quantity, item.discount),
    0
  )

  // Calculate subtotal after item discounts
  const afterItemDiscounts = subtotal - itemDiscounts

  // Calculate global discount
  let globalDiscountAmount = 0
  if (globalDiscount) {
    if (globalDiscount.type === "percentage") {
      globalDiscountAmount = afterItemDiscounts * (globalDiscount.value / 100)
    } else {
      globalDiscountAmount = Math.min(globalDiscount.value, afterItemDiscounts)
    }
  }

  // Calculate taxes (simplified - assuming prices include tax for now)
  // In a real implementation, you might want to calculate this based on each item's tax rate
  const taxes = 0

  // Calculate total
  const total = afterItemDiscounts - globalDiscountAmount + taxes

  return {
    subtotal,
    itemDiscounts,
    globalDiscount: globalDiscountAmount,
    taxes,
    total: Math.max(0, total),
  }
}

/**
 * Format price in ARS currency
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Generate a unique cart item ID
 */
export function generateCartItemId(): string {
  return crypto.randomUUID()
}
