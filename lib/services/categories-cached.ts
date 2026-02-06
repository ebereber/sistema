import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { cacheLife, cacheTag } from "next/cache";
import type { Category, CategoryWithChildren } from "./categories";

// lib/services/categories.ts
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

export async function getCachedCategoriesHierarchy(
  organizationId: string,
  search?: string,
): Promise<CategoryWithChildren[]> {
  "use cache";
  cacheTag("categories");
  cacheLife("minutes");

  let query = supabaseAdmin
    .from("categories")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const categories = (data || []) as Category[];

  // Build hierarchy in memory
  if (search?.trim()) {
    return categories.map((cat) => ({ ...cat, children: [], level: 0 }));
  }

  const parentCategories = categories.filter((c) => !c.parent_id);
  const childCategories = categories.filter((c) => c.parent_id);

  return parentCategories.map((parent) => ({
    ...parent,
    level: 0,
    children: childCategories
      .filter((child) => child.parent_id === parent.id)
      .map((child) => ({ ...child, level: 1 })),
  }));
}
