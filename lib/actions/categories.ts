"use server"

import { revalidateTag } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function deleteCategoryAction(id: string): Promise<void> {
  // Soft delete children first
  const { error: childError } = await supabaseAdmin
    .from("categories")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("parent_id", id)

  if (childError) throw childError

  // Soft delete parent
  const { error } = await supabaseAdmin
    .from("categories")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw error

  revalidateTag("categories", "minutes")
}

export async function createCategoryAction(data: {
  name: string
  subcategories?: string[]
}): Promise<void> {
  const { data: parent, error } = await supabaseAdmin
    .from("categories")
    .insert({ name: data.name.trim() })
    .select()
    .single()

  if (error) throw error

  if (data.subcategories && data.subcategories.length > 0) {
    const subs = data.subcategories
      .filter((s) => s.trim())
      .map((name) => ({
        name: name.trim(),
        parent_id: parent.id,
      }))

    if (subs.length > 0) {
      const { error: subError } = await supabaseAdmin
        .from("categories")
        .insert(subs)

      if (subError) throw subError
    }
  }

  revalidateTag("categories", "minutes")
}

export async function updateCategoryAction(
  id: string,
  name: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("categories")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw error

  revalidateTag("categories", "minutes")
}

export async function updateCategoryWithSubsAction(
  id: string,
  name: string,
  subcategories: { id?: string; name: string }[]
): Promise<void> {
  // Update parent name
  const { error: parentError } = await supabaseAdmin
    .from("categories")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", id)

  if (parentError) throw parentError

  // Get current subcategories
  const { data: currentSubs } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("parent_id", id)
    .eq("active", true)

  const currentSubIds = new Set((currentSubs || []).map((s) => s.id))
  const newSubIds = new Set(
    subcategories.filter((s) => s.id).map((s) => s.id!)
  )

  // Soft-delete removed subs
  const removedIds = [...currentSubIds].filter((sid) => !newSubIds.has(sid))
  if (removedIds.length > 0) {
    const { error } = await supabaseAdmin
      .from("categories")
      .update({ active: false, updated_at: new Date().toISOString() })
      .in("id", removedIds)

    if (error) throw error
  }

  // Update existing subs
  for (const sub of subcategories) {
    if (sub.id) {
      const { error } = await supabaseAdmin
        .from("categories")
        .update({ name: sub.name.trim(), updated_at: new Date().toISOString() })
        .eq("id", sub.id)

      if (error) throw error
    }
  }

  // Create new subs
  const newSubs = subcategories
    .filter((s) => !s.id && s.name.trim())
    .map((s) => ({ name: s.name.trim(), parent_id: id }))

  if (newSubs.length > 0) {
    const { error } = await supabaseAdmin.from("categories").insert(newSubs)
    if (error) throw error
  }

  revalidateTag("categories", "minutes")
}

export async function createSubcategoryAction(
  parentId: string,
  name: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("categories")
    .insert({ name: name.trim(), parent_id: parentId })

  if (error) throw error

  revalidateTag("categories", "minutes")
}

export async function categoryNameExistsAction(
  name: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabaseAdmin
    .from("categories")
    .select("id")
    .eq("active", true)
    .ilike("name", name.trim())

  if (excludeId) {
    query = query.neq("id", excludeId)
  }

  const { data } = await query
  return (data || []).length > 0
}
