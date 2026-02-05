import "server-only"

import { tiendanubeFetch, tiendanubeFetchAll } from "@/lib/tiendanube"
import type {
  TiendanubeCategory,
  TiendanubeCreateOrder,
  TiendanubeOrder,
  TiendanubeProduct,
} from "@/types/tiendanube"

// ============================================================================
// PRODUCTS
// ============================================================================

/**
 * Get products from Tiendanube (paginated).
 */
export async function getTiendanubeProducts(
  storeId: string,
  params?: { page?: number; per_page?: number },
): Promise<TiendanubeProduct[]> {
  const page = params?.page || 1
  const perPage = params?.per_page || 50
  return tiendanubeFetch<TiendanubeProduct[]>(
    storeId,
    `products?page=${page}&per_page=${perPage}`,
  )
}

/**
 * Get all products from Tiendanube (all pages).
 */
export async function getAllTiendanubeProducts(
  storeId: string,
): Promise<TiendanubeProduct[]> {
  return tiendanubeFetchAll<TiendanubeProduct>(storeId, "products")
}

/**
 * Get a single product from Tiendanube by ID.
 */
export async function getTiendanubeProduct(
  storeId: string,
  productId: number,
): Promise<TiendanubeProduct> {
  return tiendanubeFetch<TiendanubeProduct>(storeId, `products/${productId}`)
}

// ============================================================================
// ORDERS
// ============================================================================

/**
 * Get orders from Tiendanube (paginated, with optional status filter).
 */
export async function getTiendanubeOrders(
  storeId: string,
  params?: { status?: string; page?: number; per_page?: number },
): Promise<TiendanubeOrder[]> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set("status", params.status)
  searchParams.set("page", String(params?.page || 1))
  searchParams.set("per_page", String(params?.per_page || 50))

  return tiendanubeFetch<TiendanubeOrder[]>(
    storeId,
    `orders?${searchParams.toString()}`,
  )
}

/**
 * Get a single order from Tiendanube by ID.
 */
export async function getTiendanubeOrder(
  storeId: string,
  orderId: number,
): Promise<TiendanubeOrder> {
  return tiendanubeFetch<TiendanubeOrder>(storeId, `orders/${orderId}`)
}

/**
 * Create an order in Tiendanube.
 */
export async function createTiendanubeOrder(
  storeId: string,
  orderData: TiendanubeCreateOrder,
): Promise<TiendanubeOrder> {
  return tiendanubeFetch<TiendanubeOrder>(storeId, "orders", {
    method: "POST",
    body: orderData,
  })
}

// ============================================================================
// STOCK
// ============================================================================

/**
 * Update stock for a specific variant in Tiendanube.
 */
export async function updateTiendanubeVariantStock(
  storeId: string,
  productId: number,
  variantId: number,
  stock: number,
): Promise<void> {
  await tiendanubeFetch(
    storeId,
    `products/${productId}/variants/${variantId}`,
    {
      method: "PUT",
      body: { stock },
    },
  )
}

// ============================================================================
// CATEGORIES
// ============================================================================

/**
 * Get all categories from Tiendanube.
 */
export async function getTiendanubeCategories(
  storeId: string,
): Promise<TiendanubeCategory[]> {
  return tiendanubeFetchAll<TiendanubeCategory>(storeId, "categories")
}

// ============================================================================
// WEBHOOKS
// ============================================================================

interface TiendanubeWebhook {
  id: number
  event: string
  url: string
  created_at: string
  updated_at: string
}

/**
 * List all registered webhooks for a store.
 */
export async function getTiendanubeWebhooks(
  storeId: string,
): Promise<TiendanubeWebhook[]> {
  return tiendanubeFetch<TiendanubeWebhook[]>(storeId, "webhooks")
}

/**
 * Register a webhook in Tiendanube.
 */
export async function createTiendanubeWebhook(
  storeId: string,
  event: string,
  url: string,
): Promise<TiendanubeWebhook> {
  return tiendanubeFetch<TiendanubeWebhook>(storeId, "webhooks", {
    method: "POST",
    body: { event, url },
  })
}

/**
 * Delete a webhook from Tiendanube.
 */
export async function deleteTiendanubeWebhook(
  storeId: string,
  webhookId: number,
): Promise<void> {
  await tiendanubeFetch(storeId, `webhooks/${webhookId}`, {
    method: "DELETE",
  })
}
