import { createClient } from "@/lib/supabase/client"

export interface Product {
  id: string
  name: string
  description: string | null
  product_type: string
  sku: string
  barcode: string | null
  oem_code: string | null
  category_id: string | null
  default_supplier_id: string | null
  price: number
  cost: number | null
  margin_percentage: number | null
  tax_rate: number
  currency: string
  track_stock: boolean
  min_stock: number | null
  visibility: string
  image_url: string | null
  stock_quantity: number
  active: boolean
  created_at: string
  updated_at: string
  category?: { id: string; name: string } | null
  supplier?: { id: string; name: string } | null
  stock?: StockByLocation[]
}

export interface StockByLocation {
  id: string
  location_id: string
  quantity: number
  location: {
    id: string
    name: string
    is_main: boolean
  }
}

export interface PriceHistory {
  id: string
  product_id: string
  cost: number | null
  price: number
  margin_percentage: number | null
  tax_rate: number | null
  reason: string | null
  created_by: string | null
  created_at: string
  user?: { name: string } | null
}

export interface StockMovement {
  id: string
  product_id: string
  location_from_id: string | null
  location_to_id: string | null
  quantity: number
  reason: string | null
  reference_type: string | null
  reference_id: string | null
  created_by: string | null
  created_at: string
  location_from?: { id: string; name: string } | null
  location_to?: { id: string; name: string } | null
  user?: { name: string } | null
}

export type ProductInsert = Omit<Product, "id" | "created_at" | "updated_at" | "category" | "supplier" | "stock" | "stock_quantity">
export type ProductUpdate = Partial<ProductInsert> & { stock_quantity?: number }

export interface GetProductsParams {
  search?: string
  active?: boolean
  categoryId?: string
  visibility?: string[]
  stockFilter?: "WITH_STOCK" | "WITHOUT_STOCK" | "NEGATIVE_STOCK"
  page?: number
  pageSize?: number
}

export interface BulkFilters {
  search?: string
  active?: boolean
  categoryId?: string
  visibility?: string[]
  stockFilter?: "WITH_STOCK" | "WITHOUT_STOCK" | "NEGATIVE_STOCK"
}

export interface GetProductsResult {
  data: Product[]
  count: number
}

/**
 * Get products with filters and pagination
 */
export async function getProducts(params: GetProductsParams = {}): Promise<GetProductsResult> {
  const supabase = createClient()

  const {
    search,
    active,
    categoryId,
    visibility,
    stockFilter,
    page = 1,
    pageSize = 20,
  } = params

  let query = supabase
    .from("products")
    .select(
      `
      *,
      category:categories(id, name)
    `,
      { count: "exact" }
    )

  // Search filter
  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
  }

  // Status filter
  if (active !== undefined) {
    query = query.eq("active", active)
  }

  // Category filter
  if (categoryId) {
    query = query.eq("category_id", categoryId)
  }

  // Visibility filter
  if (visibility && visibility.length > 0) {
    query = query.in("visibility", visibility)
  }

  // Stock filter
  if (stockFilter === "WITH_STOCK") {
    query = query.gt("stock_quantity", 0)
  } else if (stockFilter === "WITHOUT_STOCK") {
    query = query.eq("stock_quantity", 0)
  } else if (stockFilter === "NEGATIVE_STOCK") {
    query = query.lt("stock_quantity", 0)
  }

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await query
    .range(from, to)
    .order("created_at", { ascending: false })

  if (error) throw error

  return {
    data: data || [],
    count: count || 0,
  }
}

/**
 * Get product by ID with relations
 */
export async function getProductById(id: string): Promise<Product> {
  const supabase = createClient()

  const { data, error } = await supabase
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

  if (error) throw error
  return data
}

/**
 * Create a new product with stock and history
 */
export async function createProduct(data: {
  product: ProductInsert
  stockByLocation: Array<{ location_id: string; quantity: number }>
  userId: string
}): Promise<Product> {
  const supabase = createClient()

  // Calculate total stock for product record
  const totalStock = data.stockByLocation.reduce((sum, s) => sum + s.quantity, 0)

  // 1. Create product
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({ ...data.product, stock_quantity: totalStock })
    .select()
    .single()

  if (productError) throw productError

  // 2. Create stock records
  if (data.stockByLocation.length > 0) {
    const stockRecords = data.stockByLocation.map((s) => ({
      product_id: product.id,
      location_id: s.location_id,
      quantity: s.quantity,
    }))

    const { error: stockError } = await supabase.from("stock").insert(stockRecords)
    if (stockError) throw stockError
  }

  // 3. Create initial price history
  const { error: historyError } = await supabase.from("price_history").insert({
    product_id: product.id,
    cost: data.product.cost,
    price: data.product.price,
    margin_percentage: data.product.margin_percentage,
    tax_rate: data.product.tax_rate,
    reason: "Creación inicial del producto",
    created_by: data.userId,
  })
  if (historyError) throw historyError

  // 4. Create initial stock movements for locations with quantity > 0
  const stockMovements = data.stockByLocation
    .filter((s) => s.quantity > 0)
    .map((s) => ({
      product_id: product.id,
      location_to_id: s.location_id,
      quantity: s.quantity,
      reason: "Stock inicial del producto",
      reference_type: "INITIAL",
      created_by: data.userId,
    }))

  if (stockMovements.length > 0) {
    const { error: movementError } = await supabase
      .from("stock_movements")
      .insert(stockMovements)
    if (movementError) throw movementError
  }

  return product
}

/**
 * Update a product with stock and history tracking
 */
export async function updateProduct(
  id: string,
  data: {
    product: ProductUpdate
    stockByLocation?: Array<{ location_id: string; quantity: number }>
    userId: string
  }
): Promise<Product> {
  const supabase = createClient()

  // Get current product for comparison
  const { data: currentProduct, error: fetchError } = await supabase
    .from("products")
    .select("cost, price, margin_percentage, tax_rate")
    .eq("id", id)
    .single()

  if (fetchError) throw fetchError

  // Calculate new total stock if provided
  let updateData = { ...data.product }
  if (data.stockByLocation) {
    const totalStock = data.stockByLocation.reduce((sum, s) => sum + s.quantity, 0)
    updateData = { ...updateData, stock_quantity: totalStock }
  }

  // 1. Update product
  const { data: product, error: updateError } = await supabase
    .from("products")
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (updateError) throw updateError

  // 2. If price changed, create price history
  const priceChanged =
    currentProduct &&
    (currentProduct.cost !== data.product.cost ||
      currentProduct.price !== data.product.price ||
      currentProduct.margin_percentage !== data.product.margin_percentage)

  if (priceChanged) {
    await supabase.from("price_history").insert({
      product_id: id,
      cost: data.product.cost ?? currentProduct.cost,
      price: data.product.price ?? currentProduct.price,
      margin_percentage: data.product.margin_percentage ?? currentProduct.margin_percentage,
      tax_rate: data.product.tax_rate ?? currentProduct.tax_rate,
      reason: "Actualización manual",
      created_by: data.userId,
    })
  }

  // 3. If stock changed, update stock and create movements
  if (data.stockByLocation) {
    for (const stockItem of data.stockByLocation) {
      // Get current stock for this location
      const { data: currentStock } = await supabase
        .from("stock")
        .select("quantity")
        .eq("product_id", id)
        .eq("location_id", stockItem.location_id)
        .single()

      const currentQty = currentStock?.quantity ?? 0

      if (currentQty !== stockItem.quantity) {
        const diff = stockItem.quantity - currentQty

        // Upsert stock record
        await supabase.from("stock").upsert(
          {
            product_id: id,
            location_id: stockItem.location_id,
            quantity: stockItem.quantity,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "product_id,location_id" }
        )

        // Create movement record
        await supabase.from("stock_movements").insert({
          product_id: id,
          [diff > 0 ? "location_to_id" : "location_from_id"]: stockItem.location_id,
          quantity: Math.abs(diff),
          reason: "Ajuste manual",
          reference_type: "ADJUSTMENT",
          created_by: data.userId,
        })
      }
    }
  }

  return product
}

/**
 * Archive a product (soft delete)
 */
export async function archiveProduct(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from("products")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw error
}

/**
 * Activate a product
 */
export async function activateProduct(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from("products")
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw error
}

/**
 * Get price history for a product
 */
export async function getPriceHistory(productId: string): Promise<PriceHistory[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("price_history")
    .select(`
      *,
      user:users(name)
    `)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get stock movements for a product
 */
export async function getStockMovements(productId: string): Promise<StockMovement[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("stock_movements")
    .select(`
      *,
      location_from:locations!stock_movements_location_from_id_fkey(id, name),
      location_to:locations!stock_movements_location_to_id_fkey(id, name),
      user:users(name)
    `)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Upload product image to Supabase Storage
 */
export async function uploadProductImage(file: File): Promise<string> {
  const supabase = createClient()

  const fileExt = file.name.split(".").pop()
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  const filePath = fileName

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from("product-images").getPublicUrl(filePath)

  return data.publicUrl
}

/**
 * Delete product image from Supabase Storage
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  const supabase = createClient()

  // Extract file path from URL
  const urlParts = imageUrl.split("/")
  const filePath = urlParts[urlParts.length - 1]

  const { error } = await supabase.storage.from("product-images").remove([filePath])

  if (error) throw error
}

/**
 * Check if SKU is unique
 */
export async function isSkuUnique(sku: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient()

  let query = supabase.from("products").select("id").eq("sku", sku)

  if (excludeId) {
    query = query.neq("id", excludeId)
  }

  const { data, error } = await query.limit(1)

  if (error) throw error
  return !data || data.length === 0
}

/**
 * Check if barcode is unique
 */
export async function isBarcodeUnique(
  barcode: string,
  excludeId?: string
): Promise<boolean> {
  const supabase = createClient()

  let query = supabase.from("products").select("id").eq("barcode", barcode)

  if (excludeId) {
    query = query.neq("id", excludeId)
  }

  const { data, error } = await query.limit(1)

  if (error) throw error
  return !data || data.length === 0
}

/**
 * Update product stock from stock management dialog
 */
export async function updateProductStock(
  productId: string,
  data: {
    stockByLocation: Array<{ location_id: string; quantity: number }>
    userId: string
  }
): Promise<void> {
  const supabase = createClient()

  for (const stockItem of data.stockByLocation) {
    // Get current stock for this location
    const { data: currentStock } = await supabase
      .from("stock")
      .select("quantity")
      .eq("product_id", productId)
      .eq("location_id", stockItem.location_id)
      .single()

    const currentQty = currentStock?.quantity ?? 0

    if (currentQty !== stockItem.quantity) {
      const diff = stockItem.quantity - currentQty

      // Upsert stock record
      await supabase.from("stock").upsert(
        {
          product_id: productId,
          location_id: stockItem.location_id,
          quantity: stockItem.quantity,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id,location_id" }
      )

      // Create movement record
      await supabase.from("stock_movements").insert({
        product_id: productId,
        [diff > 0 ? "location_to_id" : "location_from_id"]: stockItem.location_id,
        quantity: Math.abs(diff),
        reason: "Ajuste manual desde gestión de stock",
        reference_type: "ADJUSTMENT",
        created_by: data.userId,
      })
    }
  }

  // Update total stock in products table
  const totalStock = data.stockByLocation.reduce((sum, s) => sum + s.quantity, 0)
  await supabase
    .from("products")
    .update({ stock_quantity: totalStock, updated_at: new Date().toISOString() })
    .eq("id", productId)
}

/**
 * Delete a product permanently or archive if it has references
 */
export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient()

  // Check if product has sales references
  const { data: movements } = await supabase
    .from("stock_movements")
    .select("id")
    .eq("product_id", id)
    .eq("reference_type", "SALE")
    .limit(1)

  if (movements && movements.length > 0) {
    // Product has references, archive instead of delete
    await supabase
      .from("products")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", id)

    throw new Error("El producto tiene referencias y fue archivado")
  }

  // Delete related records first
  await supabase.from("stock_movements").delete().eq("product_id", id)
  await supabase.from("stock").delete().eq("product_id", id)
  await supabase.from("price_history").delete().eq("product_id", id)

  // Delete product
  const { error } = await supabase.from("products").delete().eq("id", id)

  if (error) throw error
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Get all product IDs matching filters (for "Select all" functionality)
 */
export async function getAllProductIds(filters: BulkFilters): Promise<string[]> {
  const supabase = createClient()

  let query = supabase.from("products").select("id")

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
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

/**
 * Bulk update prices
 */
export async function bulkUpdatePrices(params: {
  productIds?: string[]
  filters?: BulkFilters
  operation: "increase" | "decrease"
  type: "percentage" | "fixed"
  value: number
  userId: string
}): Promise<number> {
  const supabase = createClient()

  // Get products to update
  let productIds = params.productIds
  if (!productIds && params.filters) {
    productIds = await getAllProductIds(params.filters)
  }

  if (!productIds || productIds.length === 0) {
    return 0
  }

  // Get current prices
  const { data: products, error: fetchError } = await supabase
    .from("products")
    .select("id, price, cost, margin_percentage, tax_rate")
    .in("id", productIds)

  if (fetchError) throw fetchError

  // Calculate and update new prices
  let updatedCount = 0
  for (const product of products || []) {
    let newPrice = product.price

    if (params.type === "percentage") {
      const multiplier =
        params.operation === "increase"
          ? 1 + params.value / 100
          : 1 - params.value / 100
      newPrice = product.price * multiplier
    } else {
      newPrice =
        params.operation === "increase"
          ? product.price + params.value
          : product.price - params.value
    }

    newPrice = Math.max(0, newPrice)

    // Update product
    const { error: updateError } = await supabase
      .from("products")
      .update({ price: newPrice, updated_at: new Date().toISOString() })
      .eq("id", product.id)

    if (updateError) throw updateError

    // Create price history
    await supabase.from("price_history").insert({
      product_id: product.id,
      cost: product.cost,
      price: newPrice,
      margin_percentage: product.margin_percentage,
      tax_rate: product.tax_rate,
      reason: `Actualización masiva: ${params.operation === "increase" ? "Aumento" : "Disminución"} ${params.value}${params.type === "percentage" ? "%" : "$"}`,
      created_by: params.userId,
    })

    updatedCount++
  }

  return updatedCount
}

/**
 * Bulk update stock
 */
export async function bulkUpdateStock(params: {
  productIds?: string[]
  filters?: BulkFilters
  locationId: string
  operation: "replace" | "increase"
  quantity: number
  reason?: string
  userId: string
}): Promise<number> {
  const supabase = createClient()

  // Get products to update
  let productIds = params.productIds
  if (!productIds && params.filters) {
    productIds = await getAllProductIds(params.filters)
  }

  if (!productIds || productIds.length === 0) {
    return 0
  }

  let updatedCount = 0
  for (const productId of productIds) {
    // Get current stock for this location
    const { data: currentStock } = await supabase
      .from("stock")
      .select("quantity")
      .eq("product_id", productId)
      .eq("location_id", params.locationId)
      .single()

    const currentQty = currentStock?.quantity ?? 0
    const newQty =
      params.operation === "replace"
        ? params.quantity
        : currentQty + params.quantity

    if (currentQty !== newQty) {
      const diff = newQty - currentQty

      // Upsert stock record
      await supabase.from("stock").upsert(
        {
          product_id: productId,
          location_id: params.locationId,
          quantity: newQty,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id,location_id" }
      )

      // Create movement record
      await supabase.from("stock_movements").insert({
        product_id: productId,
        [diff > 0 ? "location_to_id" : "location_from_id"]: params.locationId,
        quantity: Math.abs(diff),
        reason: params.reason || "Actualización masiva de stock",
        reference_type: "ADJUSTMENT",
        created_by: params.userId,
      })

      // Update total stock in product
      const { data: allStock } = await supabase
        .from("stock")
        .select("quantity")
        .eq("product_id", productId)

      const totalStock = allStock?.reduce((sum, s) => sum + s.quantity, 0) ?? 0

      await supabase
        .from("products")
        .update({ stock_quantity: totalStock, updated_at: new Date().toISOString() })
        .eq("id", productId)

      updatedCount++
    }
  }

  return updatedCount
}

/**
 * Bulk assign category
 */
export async function bulkAssignCategory(params: {
  productIds?: string[]
  filters?: BulkFilters
  categoryId: string | null
}): Promise<number> {
  const supabase = createClient()

  // Get products to update
  let productIds = params.productIds
  if (!productIds && params.filters) {
    productIds = await getAllProductIds(params.filters)
  }

  if (!productIds || productIds.length === 0) {
    return 0
  }

  const { error } = await supabase
    .from("products")
    .update({ category_id: params.categoryId, updated_at: new Date().toISOString() })
    .in("id", productIds)

  if (error) throw error

  return productIds.length
}

/**
 * Get product status counts (active vs inactive) for bulk operations
 */
export async function getProductStatusCounts(params: {
  productIds?: string[]
  filters?: BulkFilters
}): Promise<{ active: number; inactive: number }> {
  const supabase = createClient()

  // Get products to count
  let productIds = params.productIds
  if (!productIds && params.filters) {
    productIds = await getAllProductIds(params.filters)
  }

  if (!productIds || productIds.length === 0) {
    return { active: 0, inactive: 0 }
  }

  const { data, error } = await supabase
    .from("products")
    .select("active")
    .in("id", productIds)

  if (error) throw error

  const active = data?.filter((p) => p.active).length ?? 0
  const inactive = data?.filter((p) => !p.active).length ?? 0

  return { active, inactive }
}

/**
 * Bulk archive/activate products
 * Only updates products that actually need to change state
 */
export async function bulkArchive(params: {
  productIds?: string[]
  filters?: BulkFilters
  archive: boolean
}): Promise<number> {
  const supabase = createClient()

  // Get products to update
  let productIds = params.productIds
  if (!productIds && params.filters) {
    productIds = await getAllProductIds(params.filters)
  }

  if (!productIds || productIds.length === 0) {
    return 0
  }

  // Only update products that are in the opposite state
  // archive: true -> only update active products (active = true)
  // archive: false -> only update inactive products (active = false)
  const { data, error } = await supabase
    .from("products")
    .update({ active: !params.archive, updated_at: new Date().toISOString() })
    .in("id", productIds)
    .eq("active", params.archive) // Only update products currently in the opposite state
    .select("id")

  if (error) throw error

  return data?.length ?? 0
}

/**
 * Check which products have references (for bulk delete preview)
 */
export async function checkProductsWithReferences(productIds: string[]): Promise<{
  canDelete: string[]
  hasReferences: string[]
}> {
  const supabase = createClient()

  const canDelete: string[] = []
  const hasReferences: string[] = []

  for (const id of productIds) {
    const { data: movements } = await supabase
      .from("stock_movements")
      .select("id")
      .eq("product_id", id)
      .eq("reference_type", "SALE")
      .limit(1)

    if (movements && movements.length > 0) {
      hasReferences.push(id)
    } else {
      canDelete.push(id)
    }
  }

  return { canDelete, hasReferences }
}

/**
 * Bulk delete products (archives those with references)
 */
export async function bulkDelete(params: {
  productIds?: string[]
  filters?: BulkFilters
}): Promise<{ deleted: number; archived: number }> {
  const supabase = createClient()

  // Get products to delete
  let productIds = params.productIds
  if (!productIds && params.filters) {
    productIds = await getAllProductIds(params.filters)
  }

  if (!productIds || productIds.length === 0) {
    return { deleted: 0, archived: 0 }
  }

  // Check which products have references
  const { canDelete, hasReferences } = await checkProductsWithReferences(productIds)

  // Archive products with references
  if (hasReferences.length > 0) {
    await supabase
      .from("products")
      .update({ active: false, updated_at: new Date().toISOString() })
      .in("id", hasReferences)
  }

  // Delete products without references
  for (const id of canDelete) {
    await supabase.from("stock_movements").delete().eq("product_id", id)
    await supabase.from("stock").delete().eq("product_id", id)
    await supabase.from("price_history").delete().eq("product_id", id)
    await supabase.from("products").delete().eq("id", id)
  }

  return {
    deleted: canDelete.length,
    archived: hasReferences.length,
  }
}
