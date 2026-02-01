import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

export type Category = Tables<"categories">;

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
  level?: number;
}

/**
 * Get all active categories with optional search filter
 */
export async function getCategories(search?: string): Promise<Category[]> {
  const supabase = createClient();

  let query = supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

  if (search && search.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get categories organized as a flat list with hierarchy info (for table display)
 */
export async function getCategoriesHierarchy(
  search?: string,
): Promise<CategoryWithChildren[]> {
  const categories = await getCategories(search);

  // If searching, return flat list without hierarchy
  if (search && search.trim()) {
    return categories.map((cat) => ({ ...cat, level: cat.parent_id ? 1 : 0 }));
  }

  // Build hierarchy
  const categoryMap = new Map<string, CategoryWithChildren>();
  const roots: CategoryWithChildren[] = [];

  // First pass: create map
  categories.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, children: [], level: 0 });
  });

  // Second pass: build tree
  categories.forEach((cat) => {
    const current = categoryMap.get(cat.id)!;
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      const parent = categoryMap.get(cat.parent_id)!;
      parent.children!.push(current);
    } else {
      roots.push(current);
    }
  });

  // Flatten tree with levels for display
  const result: CategoryWithChildren[] = [];

  function flatten(categories: CategoryWithChildren[], level: number) {
    categories.forEach((cat) => {
      result.push({ ...cat, level });
      if (cat.children && cat.children.length > 0) {
        flatten(cat.children, level + 1);
      }
    });
  }

  flatten(roots, 0);
  return result;
}

/**
 * Get a category by ID
 */
export async function getCategoryById(id: string): Promise<Category> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get subcategories of a parent category
 */
export async function getSubcategories(parentId: string): Promise<Category[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("parent_id", parentId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a category with optional subcategories
 */
export async function createCategory(data: {
  name: string;
  subcategories?: string[];
}): Promise<Category> {
  const supabase = createClient();

  // Create parent category
  const { data: parent, error: parentError } = await supabase
    .from("categories")
    .insert({ name: data.name })
    .select()
    .single();

  if (parentError) throw parentError;

  // Create subcategories if provided
  if (data.subcategories && data.subcategories.length > 0) {
    const subcategoryInserts = data.subcategories
      .filter((name) => name.trim())
      .map((name) => ({
        name: name.trim(),
        parent_id: parent.id,
      }));

    if (subcategoryInserts.length > 0) {
      const { error: subError } = await supabase
        .from("categories")
        .insert(subcategoryInserts);

      if (subError) throw subError;
    }
  }

  return parent;
}

/**
 * Update a category name
 */
export async function updateCategory(
  id: string,
  name: string,
): Promise<Category> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("categories")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Soft delete a category
 */
export async function deleteCategory(id: string): Promise<void> {
  const supabase = createClient();

  // Also deactivate child categories
  const { error: childError } = await supabase
    .from("categories")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("parent_id", id);

  if (childError) throw childError;

  const { error } = await supabase
    .from("categories")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Check if a category name already exists
 */
export async function categoryNameExists(
  name: string,
  excludeId?: string,
): Promise<boolean> {
  const supabase = createClient();

  let query = supabase
    .from("categories")
    .select("id")
    .eq("active", true)
    .ilike("name", name.trim());

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * Create a single subcategory under a parent
 */
export async function createSubcategory(
  parentId: string,
  name: string,
): Promise<Category> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: name.trim(), parent_id: parentId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a parent category and its subcategories
 * - Updates parent name
 * - Updates existing subcategory names
 * - Creates new subcategories
 * - Soft deletes removed subcategories
 */
export async function updateCategoryWithSubs(
  id: string,
  name: string,
  subcategories: { id?: string; name: string }[],
): Promise<void> {
  const supabase = createClient();

  // Update parent name
  const { error: parentError } = await supabase
    .from("categories")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (parentError) throw parentError;

  // Get current subcategories
  const { data: currentSubs } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", id)
    .eq("active", true);

  const currentIds = new Set((currentSubs || []).map((s) => s.id));
  const newIds = new Set(subcategories.filter((s) => s.id).map((s) => s.id!));

  // Soft delete removed subcategories
  const toDelete = [...currentIds].filter((cid) => !newIds.has(cid));
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("categories")
      .update({ active: false, updated_at: new Date().toISOString() })
      .in("id", toDelete);

    if (error) throw error;
  }

  // Update existing subcategories
  for (const sub of subcategories.filter((s) => s.id)) {
    const { error } = await supabase
      .from("categories")
      .update({ name: sub.name.trim(), updated_at: new Date().toISOString() })
      .eq("id", sub.id!);

    if (error) throw error;
  }

  // Create new subcategories
  const toCreate = subcategories
    .filter((s) => !s.id && s.name.trim())
    .map((s) => ({ name: s.name.trim(), parent_id: id }));

  if (toCreate.length > 0) {
    const { error } = await supabase.from("categories").insert(toCreate);
    if (error) throw error;
  }
}
