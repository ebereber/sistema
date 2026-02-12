"use server";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";
import { type Category } from "../services/categories";

export async function deleteCategoryAction(id: string): Promise<void> {
  // Verificar productos asociados
  const { count } = await supabaseAdmin
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)
    .eq("active", true);

  if (count && count > 0) {
    throw new Error(
      `No se puede eliminar: tiene ${count} producto(s) asociado(s). Reasignalos primero.`,
    );
  }

  // Soft delete children first
  const { error: childError } = await supabaseAdmin
    .from("categories")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("parent_id", id);

  if (childError) throw childError;

  // Soft delete parent
  const { error } = await supabaseAdmin
    .from("categories")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("categories", "minutes");
}

export async function createCategoryAction(data: {
  name: string;
  subcategories?: string[];
}): Promise<Category> {
  const organizationId = await getOrganizationId();
  const trimmedName = data.name.trim();

  // Verificar si ya existe una categoría activa con ese nombre
  const { data: existing } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .ilike("name", trimmedName)
    .is("parent_id", null)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error("Ya existe una categoría con ese nombre");
  }

  const { data: parent, error } = await supabaseAdmin
    .from("categories")
    .insert({ name: trimmedName, organization_id: organizationId })
    .select()
    .single();

  if (error) throw error;
  if (!parent) throw new Error("Error al crear categoría");

  if (data.subcategories && data.subcategories.length > 0) {
    const subs = data.subcategories
      .filter((s) => s.trim())
      .map((name) => ({
        name: name.trim(),
        parent_id: parent.id,
        organization_id: organizationId,
      }));

    if (subs.length > 0) {
      const { error: subError } = await supabaseAdmin
        .from("categories")
        .insert(subs);

      if (subError) throw subError;
    }
  }

  revalidateTag("categories", "minutes");
  return parent;
}

export async function updateCategoryAction(
  id: string,
  name: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("categories")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  revalidateTag("categories", "minutes");
}

export async function updateCategoryWithSubsAction(
  id: string,
  name: string,
  subcategories: { id?: string; name: string }[],
): Promise<void> {
  const organizationId = await getOrganizationId();

  // Update parent name
  const { error: parentError } = await supabaseAdmin
    .from("categories")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (parentError) throw parentError;

  // Get current subcategories
  const { data: currentSubs } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("parent_id", id)
    .eq("active", true);

  const currentSubIds = new Set((currentSubs || []).map((s) => s.id));
  const newSubIds = new Set(
    subcategories.filter((s) => s.id).map((s) => s.id!),
  );

  // Soft-delete removed subs
  const removedIds = [...currentSubIds].filter((sid) => !newSubIds.has(sid));
  if (removedIds.length > 0) {
    const { error } = await supabaseAdmin
      .from("categories")
      .update({ active: false, updated_at: new Date().toISOString() })
      .in("id", removedIds);

    if (error) throw error;
  }

  // Update existing subs
  for (const sub of subcategories) {
    if (sub.id) {
      const { error } = await supabaseAdmin
        .from("categories")
        .update({ name: sub.name.trim(), updated_at: new Date().toISOString() })
        .eq("id", sub.id);

      if (error) throw error;
    }
  }

  const newSubs = subcategories.filter((s) => !s.id && s.name.trim());

  for (const sub of newSubs) {
    const trimmedName = sub.name.trim();

    // Verificar si ya existe
    const { data: existing } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .eq("parent_id", id)
      .ilike("name", trimmedName)
      .limit(1);

    if (existing && existing.length > 0) {
      continue; // Saltear duplicados silenciosamente o throw si preferís
    }

    const { error } = await supabaseAdmin.from("categories").insert({
      name: trimmedName,
      parent_id: id,
      organization_id: organizationId,
    });

    if (error) throw error;
  }

  revalidateTag("categories", "minutes");
}

export async function createSubcategoryAction(
  parentId: string,
  name: string,
): Promise<Category> {
  const organizationId = await getOrganizationId();
  const trimmedName = name.trim();

  // Verificar si ya existe
  const { data: existing } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .eq("parent_id", parentId)
    .ilike("name", trimmedName)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error("Ya existe una subcategoría con ese nombre");
  }

  const { data: subcategory, error } = await supabaseAdmin
    .from("categories")
    .insert({
      name: trimmedName,
      parent_id: parentId,
      organization_id: organizationId,
    })
    .select()
    .single();

  if (error) throw error;
  if (!subcategory) throw new Error("Error al crear subcategoría");

  revalidateTag("categories", "minutes");
  return subcategory;
}

export async function categoryNameExistsAction(
  name: string,
  excludeId?: string,
): Promise<boolean> {
  let query = supabaseAdmin
    .from("categories")
    .select("id")
    .eq("active", true)
    .ilike("name", name.trim());

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data } = await query;
  return (data || []).length > 0;
}
