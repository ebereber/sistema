import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeRelation } from "@/lib/supabase/types";
import { cacheLife, cacheTag } from "next/cache";
import type { Category } from "./categories";
import type { BulkFilters, GetProductsParams, Product } from "./products";
import type { ProductForSale } from "./sales";

export type LocationForProducts = {
  id: string;
  name: string;
  is_main: boolean | null;
  active: boolean | null;
};

export async function getCachedProducts(
  organizationId: string,
  params: GetProductsParams = {},
): Promise<{
  data: Product[];
  count: number;
  totalPages: number;
}> {
  "use cache";
  cacheTag("products");
  cacheLife("minutes");

  const {
    search,
    active,
    categoryId,
    visibility,
    stockFilter,
    page = 1,
    pageSize = 20,
  } = params;

  let query = supabaseAdmin
    .from("products")
    .select(
      `
      *,
      category:categories(id, name)
    `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId);

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  }

  if (active !== undefined) {
    query = query.eq("active", active);
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (visibility && visibility.length > 0) {
    query = query.in("visibility", visibility);
  }

  if (stockFilter === "WITH_STOCK") {
    query = query.gt("stock_quantity", 0);
  } else if (stockFilter === "WITHOUT_STOCK") {
    query = query.eq("stock_quantity", 0);
  } else if (stockFilter === "NEGATIVE_STOCK") {
    query = query.lt("stock_quantity", 0);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .range(from, to)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return {
    data: (data || []) as unknown as Product[],
    count: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getCachedProductById(
  organizationId: string,
  id: string,
): Promise<Product | null> {
  "use cache";
  cacheTag("products", `product-${id}`);
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      `
      *,
      category:categories(id, name),
      supplier:suppliers(id, name),
      stock(
        id,
        location_id,
        quantity,
        location:locations(id, name, is_main)
      )
    `,
    )
    .eq("organization_id", organizationId)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as unknown as Product;
}

export async function getCachedCategories(
  organizationId: string,
): Promise<Category[]> {
  "use cache";
  cacheTag("categories");
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getCachedLocationsForProducts(
  organizationId: string,
): Promise<LocationForProducts[]> {
  "use cache";
  cacheTag("locations");
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("locations")
    .select("id, name, is_main, active")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("is_main", { ascending: false })
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function getCachedAllProductIds(
  organizationId: string,
  filters: BulkFilters,
): Promise<string[]> {
  "use cache";
  cacheTag("products");
  cacheLife("minutes");

  let query = supabaseAdmin
    .from("products")
    .select("id")
    .eq("organization_id", organizationId);

  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`,
    );
  }

  if (filters.active !== undefined) {
    query = query.eq("active", filters.active);
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters.visibility && filters.visibility.length > 0) {
    query = query.in("visibility", filters.visibility);
  }

  if (filters.stockFilter === "WITH_STOCK") {
    query = query.gt("stock_quantity", 0);
  } else if (filters.stockFilter === "WITHOUT_STOCK") {
    query = query.eq("stock_quantity", 0);
  } else if (filters.stockFilter === "NEGATIVE_STOCK") {
    query = query.lt("stock_quantity", 0);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data?.map((p) => p.id) || [];
}

export async function getCachedAllProductsForPOS(
  organizationId: string,
): Promise<ProductForSale[]> {
  "use cache";
  cacheTag("products");
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
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
    `,
    )
    .eq("organization_id", organizationId)
    .eq("active", true)
    .in("visibility", ["SALES_AND_PURCHASES", "SALES_ONLY"])
    .order("name", { ascending: true });

  if (error) throw error;

  return (data || []).map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    price: product.price,
    taxRate: product.tax_rate,
    stockQuantity: product.stock_quantity ?? 0,
    imageUrl: product.image_url,
    categoryId: product.category_id,
    categoryName: normalizeRelation(product.category)?.name || null,
  }));
}

export async function getCachedTopSellingProducts(
  organizationId: string,
  limit: number = 20,
): Promise<ProductForSale[]> {
  "use cache";
  cacheTag("sales", "products");
  cacheLife("hours");

  // Get recent sale items to determine top sellers
  // sale_items has no org_id, but we filter via joined product
  const { data, error } = await supabaseAdmin
    .from("sale_items")
    .select(
      `
      product_id,
      quantity,
      product:products(
        id,
        name,
        sku,
        barcode,
        price,
        tax_rate,
        stock_quantity,
        image_url,
        category_id,
        active,
        visibility,
        organization_id,
        category:categories(name)
      )
    `,
    )
    .not("product_id", "is", null)
    .limit(1000);

  if (error) throw error;

  // Group by product_id and sum quantities
  const counts = new Map<
    string,
    { count: number; product: (typeof data)[number]["product"] }
  >();
  for (const item of data || []) {
    if (!item.product_id || !item.product) continue;
    const product = Array.isArray(item.product)
      ? item.product[0]
      : item.product;
    if (!product || !product.active) continue;
    if ((product as any).organization_id !== organizationId) continue;
    if (
      product.visibility !== "SALES_AND_PURCHASES" &&
      product.visibility !== "SALES_ONLY"
    )
      continue;

    const existing = counts.get(item.product_id);
    if (existing) {
      existing.count += item.quantity;
    } else {
      counts.set(item.product_id, { count: item.quantity, product });
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((x) => {
      const p = x.product as Record<string, unknown>;
      const category = normalizeRelation(
        p.category as { name: string } | { name: string }[] | null,
      );
      return {
        id: p.id as string,
        name: p.name as string,
        sku: p.sku as string,
        barcode: p.barcode as string | null,
        price: p.price as number,
        taxRate: p.tax_rate as number,
        stockQuantity: (p.stock_quantity as number) ?? 0,
        imageUrl: p.image_url as string | null,
        categoryId: p.category_id as string | null,
        categoryName: category?.name || null,
      };
    });
}
