// Tiendanube API response types
// Docs: https://tiendanube.github.io/api-documentation/

/** i18n field — Tiendanube returns text fields as { "es": "value", "pt": "value" } */
export type TiendanubeI18n = Record<string, string>

/** Image from Tiendanube product */
export interface TiendanubeImage {
  id: number
  product_id: number
  src: string
  position: number
  created_at: string
  updated_at: string
}

/** Variant of a Tiendanube product */
export interface TiendanubeVariant {
  id: number
  product_id: number
  sku: string | null
  barcode: string | null
  price: string // "1500.00" — string, must parse
  compare_at_price: string | null
  cost: string | null // "800.00"
  promotional_price: string | null
  stock_management: boolean
  stock: number | null
  weight: string | null
  width: string | null
  height: string | null
  depth: string | null
  values: TiendanubeI18n[]
  created_at: string
  updated_at: string
}

/** Tiendanube product (from GET /products) */
export interface TiendanubeProduct {
  id: number
  name: TiendanubeI18n
  description: TiendanubeI18n
  handle: TiendanubeI18n
  published: boolean
  free_shipping: boolean
  requires_shipping: boolean
  canonical_url: string
  brand: string | null
  created_at: string
  updated_at: string
  variants: TiendanubeVariant[]
  images: TiendanubeImage[]
  categories: TiendanubeCategory[]
  tags: string
}

/** Tiendanube category */
export interface TiendanubeCategory {
  id: number
  name: TiendanubeI18n
  description: TiendanubeI18n
  handle: TiendanubeI18n
  parent: number | null
  subcategories: number[]
  created_at: string
  updated_at: string
}

/** Order product item */
export interface TiendanubeOrderProduct {
  product_id: number
  variant_id: number
  name: string
  sku: string | null
  price: string
  quantity: number
  free_shipping: boolean
  weight: string
  width: string
  height: string
  depth: string
}

/** Order payment */
export interface TiendanubePaymentDetail {
  method: string
  status: string
  installments: number
  total: string
}

/** Tiendanube order */
export interface TiendanubeOrder {
  id: number
  number: string
  token: string
  store_id: string
  status: string // "open" | "closed" | "cancelled"
  payment_status: string // "pending" | "authorized" | "paid" | "abandoned" | "refunded" | "voided"
  shipping_status: string // "unpacked" | "shipped" | "unshipped" | "delivered"
  subtotal: string
  discount: string
  total: string
  total_usd: string
  currency: string
  language: string
  gateway: string
  gateway_id: string | null
  shipping: string
  shipping_option: string
  shipping_option_code: string | null
  shipping_option_reference: string | null
  note: string | null
  created_at: string
  updated_at: string
  products: TiendanubeOrderProduct[]
  payment_details: TiendanubePaymentDetail
  customer: {
    id: number
    name: string
    email: string
    phone: string | null
    identification: string | null
  }
}

/** Data needed to create an order in Tiendanube */
export interface TiendanubeCreateOrder {
  currency: string
  language: string
  gateway: string
  status: string
  payment_status: string
  products: Array<{
    product_id: number
    variant_id: number
    quantity: number
    price: string
  }>
  customer?: {
    name: string
    email: string
    phone?: string
    identification?: string
  }
  note?: string
}

/** Webhook payload from Tiendanube */
export interface TiendanubeWebhookPayload {
  store_id: number
  event: string // "orders/created" | "orders/paid" | "products/updated" | "app/uninstalled"
  id: number // entity ID
}

/** OAuth token exchange response */
export interface TiendanubeTokenResponse {
  access_token: string
  token_type: string
  scope: string
  user_id: string // This is actually the store_id
}
