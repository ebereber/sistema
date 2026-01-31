import type { Tables, TablesInsert, TablesUpdate, Enums } from "./database.types"

export type { Tables, TablesInsert, TablesUpdate, Enums }

export function normalizeRelation<T>(data: T | T[] | null | undefined): T | null {
  if (Array.isArray(data)) return data[0] ?? null
  return data ?? null
}

export function normalizeRelationArray<T>(data: T | T[] | null | undefined): T[] {
  if (Array.isArray(data)) return data
  if (data == null) return []
  return [data]
}
