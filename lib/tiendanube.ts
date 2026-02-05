import "server-only"

import { supabaseAdmin } from "@/lib/supabase/admin"

const TIENDANUBE_API_BASE = "https://api.tiendanube.com/v1"
const USER_AGENT = "MiPOS (contacto@lemar.com.ar)"
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 600

interface TiendanubeRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
}

/**
 * Get the access token for a Tiendanube store from the database.
 */
async function getAccessToken(storeId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("tiendanube_stores")
    .select("access_token")
    .eq("store_id", storeId)
    .single()

  if (error || !data) {
    throw new Error(`No se encontró el token para la tienda ${storeId}`)
  }

  return data.access_token
}

/**
 * Sleep helper for retry backoff.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Call the Tiendanube API with proper headers, rate limit handling, and retry logic.
 *
 * Headers:
 * - Authentication: bearer {token} (NOT "Authorization")
 * - User-Agent: required by Tiendanube
 * - Content-Type: application/json
 *
 * Rate limit: 2 req/s (leaky bucket). On 429, retries with exponential backoff.
 */
export async function tiendanubeFetch<T>(
  storeId: string,
  endpoint: string,
  options: TiendanubeRequestOptions = {},
): Promise<T> {
  const { method = "GET", body } = options
  const accessToken = await getAccessToken(storeId)
  const url = `${TIENDANUBE_API_BASE}/${storeId}/${endpoint}`

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method,
      headers: {
        Authentication: `bearer ${accessToken}`,
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (response.status === 429) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt)
        await sleep(delay)
        continue
      }
      throw new Error(
        `Tiendanube rate limit excedido después de ${MAX_RETRIES} reintentos`,
      )
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "")
      throw new Error(
        `Tiendanube API error ${response.status}: ${response.statusText}. ${errorBody}`,
      )
    }

    return (await response.json()) as T
  }

  throw new Error("Tiendanube: reintentos agotados")
}

/**
 * Fetch all pages of a paginated Tiendanube endpoint.
 * Tiendanube supports ?page=N&per_page=M (max 200).
 */
export async function tiendanubeFetchAll<T>(
  storeId: string,
  endpoint: string,
  perPage = 200,
): Promise<T[]> {
  const allItems: T[] = []
  let page = 1

  while (true) {
    const separator = endpoint.includes("?") ? "&" : "?"
    const items = await tiendanubeFetch<T[]>(
      storeId,
      `${endpoint}${separator}page=${page}&per_page=${perPage}`,
    )

    allItems.push(...items)

    if (items.length < perPage) break
    page++
  }

  return allItems
}

/**
 * Extract text from a Tiendanube i18n field.
 * Prioritizes "es" (Spanish), then first available key.
 */
export function extractI18n(
  field: Record<string, string> | null | undefined,
): string {
  if (!field) return ""
  return field.es || field.pt || Object.values(field)[0] || ""
}

/**
 * Parse a Tiendanube price string to a number.
 * Tiendanube returns prices as strings like "1500.00".
 */
export function parsePrice(price: string | null | undefined): number | null {
  if (!price) return null
  const parsed = Number.parseFloat(price)
  return Number.isNaN(parsed) ? null : parsed
}
