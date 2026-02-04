import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { cacheLife, cacheTag } from "next/cache";
import type { GetQuotesFilters } from "./quotes";
import type { Tables } from "@/lib/supabase/types";

type Quote = Tables<"quotes">;

export async function getCachedQuotes(
  filters: GetQuotesFilters = {},
): Promise<{
  data: Quote[];
  count: number;
  totalPages: number;
}> {
  "use cache";
  cacheTag("quotes");
  cacheLife("minutes");

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("quotes")
    .select("*", { count: "exact" })
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.search) {
    query = query.or(
      `customer_name.ilike.%${filters.search}%,quote_number.ilike.%${filters.search}%`,
    );
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: data || [],
    count: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getCachedQuoteById(
  id: string,
): Promise<Quote | null> {
  "use cache";
  cacheTag("quotes", `quote-${id}`);
  cacheLife("minutes");

  const { data, error } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data;
}
