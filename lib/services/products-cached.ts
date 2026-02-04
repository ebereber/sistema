import "server-only"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { cacheLife, cacheTag } from "next/cache"
import type { Category } from "./categories"
import type {
  BulkFilters,
  GetProductsParams,
  Product,
} from "./products"

export async function getCachedProducts(
  params: GetProductsParams = {},
): Promise<{
  data: Product[]
  count: number
  totalPages: number
}> {
  "use cache"
  cacheTag("products")
  cacheLife("minutes")

  const {
    search,
    active,
    categoryId,
    visibility,
    stockFilter,
    page = 1,
    pageSize = 20,
  } = params

  let query = supabaseAdmin
    .from("products")
    .select(
      `
      *,
      category:categories(id, name)
    `,
      { count: "exact" },
    )

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
  }

  if (active !== undefined) {
    query = query.eq("active", active)
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId)
  }

  if (visibility && visibility.length > 0) {
    query = query.in("visibility", visibility)
  }

  if (stockFilter === "WITH_STOCK") {
    query = query.gt("stock_quantity", 0)
  } else if (stockFilter === "WITHOUT_STOCK") {
    query = query.eq("stock_quantity", 0)
  } else if (stockFilter === "NEGATIVE_STOCK") {
    query = query.lt("stock_quantity", 0)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await query
    .range(from, to)
    .order("created_at", { ascending: false })

  if (error) throw error

  return {
    data: (data || []) as unknown as Product[],
    count: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
}

export async function getCachedProductById(
  id: string,
): Promise<Product | null> {
  "use cache"
  cacheTag("products", `product-${id}`)
  cacheLife("minutes")

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(`
      *,
      category:categories(id, name),
      supplier:suppliers(id, name),
      stock(
        id,
        location_id,
        quantity,
        location:locations(id, name, is_main)
      )
    `)
    .eq("id", id)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }

  return data as unknown as Product
}

export async function getCachedCategories(): Promise<Category[]> {
  "use cache"
  cacheTag("categories")
  cacheLife("minutes")

  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true })

  if (error) throw error
  return data || []
}

export async function getCachedLocationsForProducts(): Promise<
  { id: string; name: string; is_main: boolean | null; active: boolean | null }[]
> {
  "use cache"
  cacheTag("locations")
  cacheLife("minutes")

  const { data, error } = await supabaseAdmin
    .from("locations")
    .select("id, name, is_main, active")
    .eq("active", true)
    .order("is_main", { ascending: false })
    .order("name")

  if (error) throw error
  return data || []
}

export async function getCachedAllProductIds(
  filters: BulkFilters,
): Promise<string[]> {
  "use cache"
  cacheTag("products")
  cacheLife("minutes")

  let query = supabaseAdmin.from("products").select("id")

  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`,
    )
  }

  if (filters.active !== undefined) {
    query = query.eq("active", filters.active)
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId)
  }

  if (filters.visibility && filters.visibility.length > 0) {
    query = query.in("visibility", filters.visibility)
  }

  if (filters.stockFilter === "WITH_STOCK") {
    query = query.gt("stock_quantity", 0)
  } else if (filters.stockFilter === "WITHOUT_STOCK") {
    query = query.eq("stock_quantity", 0)
  } else if (filters.stockFilter === "NEGATIVE_STOCK") {
    query = query.lt("stock_quantity", 0)
  }

  const { data, error } = await query

  if (error) throw error
  return data?.map((p) => p.id) || []
}
