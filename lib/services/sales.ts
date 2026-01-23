import { createClient } from "@/lib/supabase/client"
import type { Product } from "./products"
import type { CartItem, GlobalDiscount, SelectedCustomer } from "@/lib/validations/sale"

export interface ProductForSale {
  id: string
  name: string
  sku: string
  barcode: string | null
  price: number
  taxRate: number
  stockQuantity: number
  imageUrl: string | null
  categoryId: string | null
  categoryName: string | null
}

export interface SearchProductsParams {
  search?: string
  categoryId?: string
  limit?: number
}

/**
 * Search products optimized for POS (only active products visible in sales)
 */
export async function searchProductsForSale(
  params: SearchProductsParams = {}
): Promise<ProductForSale[]> {
  const supabase = createClient()

  const { search, categoryId, limit = 50 } = params

  let query = supabase
    .from("products")
    .select(
      `
      id,
      name,
      sku,
      barcode,
      price,
      tax_rate,
      stock_quantity,
      image_url,
      category_id,
      category:categories(name)
    `
    )
    .eq("active", true)
    .in("visibility", ["SALES_AND_PURCHASES", "SALES_ONLY"])
    .order("name", { ascending: true })
    .limit(limit)

  // Search by name, SKU, or barcode
  if (search && search.trim()) {
    const searchTerm = search.trim()
    query = query.or(
      `name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`
    )
  }

  // Filter by category
  if (categoryId) {
    query = query.eq("category_id", categoryId)
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []).map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    price: product.price,
    taxRate: product.tax_rate,
    stockQuantity: product.stock_quantity,
    imageUrl: product.image_url,
    categoryId: product.category_id,
    categoryName: (product.category as { name: string } | null)?.name || null,
  }))
}

/**
 * Get adjusted price based on customer's price list
 */
export function getAdjustedPrice(
  basePrice: number,
  adjustmentType: "AUMENTO" | "DESCUENTO" | null | undefined,
  adjustmentPercentage: number | null | undefined
): number {
  if (!adjustmentType || adjustmentPercentage == null) {
    return basePrice
  }

  if (adjustmentType === "AUMENTO") {
    return basePrice * (1 + adjustmentPercentage / 100)
  } else {
    return basePrice * (1 - adjustmentPercentage / 100)
  }
}

/**
 * Get product by barcode (for barcode scanner)
 */
export async function getProductByBarcode(
  barcode: string
): Promise<ProductForSale | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      sku,
      barcode,
      price,
      tax_rate,
      stock_quantity,
      image_url,
      category_id,
      category:categories(name)
    `
    )
    .eq("barcode", barcode)
    .eq("active", true)
    .in("visibility", ["SALES_AND_PURCHASES", "SALES_ONLY"])
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null
    }
    throw error
  }

  return {
    id: data.id,
    name: data.name,
    sku: data.sku,
    barcode: data.barcode,
    price: data.price,
    taxRate: data.tax_rate,
    stockQuantity: data.stock_quantity,
    imageUrl: data.image_url,
    categoryId: data.category_id,
    categoryName: (data.category as { name: string } | null)?.name || null,
  }
}

/**
 * Get price list adjustment for a customer
 */
export async function getCustomerPriceListAdjustment(customerId: string): Promise<{
  priceListId: string | null
  priceListName: string | null
  adjustmentType: "AUMENTO" | "DESCUENTO" | null
  adjustmentPercentage: number | null
} | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("customers")
    .select(
      `
      price_list_id,
      price_list:price_lists!price_list_id(
        id,
        name,
        adjustment_type,
        adjustment_percentage
      )
    `
    )
    .eq("id", customerId)
    .single()

  if (error) throw error

  if (!data || !data.price_list) {
    return null
  }

  const priceList = data.price_list as {
    id: string
    name: string
    adjustment_type: string
    adjustment_percentage: number
  }

  return {
    priceListId: priceList.id,
    priceListName: priceList.name,
    adjustmentType: priceList.adjustment_type as "AUMENTO" | "DESCUENTO",
    adjustmentPercentage: priceList.adjustment_percentage,
  }
}

// Session storage key for cart data
export const CART_STORAGE_KEY = "pos_cart_data"

export interface CartStorageData {
  items: CartItem[]
  customer: SelectedCustomer
  globalDiscount: GlobalDiscount | null
  note?: string
  saleDate?: string
  savedAt: string
}

/**
 * Save cart data to session storage
 */
export function saveCartToStorage(data: CartStorageData): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data))
  }
}

/**
 * Load cart data from session storage
 */
export function loadCartFromStorage(): CartStorageData | null {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(CART_STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return null
      }
    }
  }
  return null
}

/**
 * Clear cart data from session storage
 */
export function clearCartStorage(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(CART_STORAGE_KEY)
  }
}
