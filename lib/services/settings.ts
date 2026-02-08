import { getOrganizationId } from "../auth/get-organization";
import { createClient } from "../supabase/client";
import { Json } from "../supabase/database.types";
import { PriceRoundingType } from "../utils/currency";

// lib/services/settings.ts
export async function getPriceRoundingSetting(): Promise<PriceRoundingType> {
  const supabase = createClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "price_rounding")
    .single();

  const value = data?.value as Record<string, unknown> | null;
  return ((value?.type as string) || "none") as PriceRoundingType;
}

// ─── Types ─────────────────────────────────────────────

export interface GeneralPreferences {
  stock_behavior: "warn" | "allow" | "block";
  skip_payment: boolean;
  allow_price_change: boolean;
  show_company_on_vouchers: boolean;
}

export interface TicketPreferences {
  enabled: boolean;
  auto_print: boolean;
  show_customer: boolean;
  show_seller: boolean;
  show_company: boolean;
  width: "80mm" | "57mm";
  footer_message: string;
  qz_enabled: boolean;
}

export const DEFAULT_GENERAL_PREFERENCES: GeneralPreferences = {
  stock_behavior: "warn",
  skip_payment: false,
  allow_price_change: false,
  show_company_on_vouchers: true,
};

export const DEFAULT_TICKET_PREFERENCES: TicketPreferences = {
  enabled: false,
  auto_print: false,
  show_customer: true,
  show_seller: true,
  show_company: true,
  width: "80mm",
  footer_message: "¡Gracias por su compra!",
  qz_enabled: false,
};

// ─── Helpers ───────────────────────────────────────────

/* async function getOrganizationId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!data?.organization_id) throw new Error("No organization");

  return data.organization_id;
} */

// ─── Get Setting ───────────────────────────────────────

export async function getSetting<T>(key: string, defaults: T): Promise<T> {
  const supabase = await createClient();
  const organizationId = await getOrganizationId();

  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .eq("organization_id", organizationId)
    .single();

  if (error || !data) {
    return defaults;
  }

  return { ...defaults, ...(data.value as Partial<T>) };
}

// ─── Set Setting ───────────────────────────────────────

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const supabase = await createClient();
  const organizationId = await getOrganizationId();

  const { error } = await supabase.from("settings").upsert(
    {
      key,
      value: value as unknown as Json,
      organization_id: organizationId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key,organization_id" },
  );

  if (error) {
    console.error("Error saving setting:", error);
    throw new Error("Error al guardar configuración");
  }
}

// ─── Convenience functions ─────────────────────────────

export async function getGeneralPreferences(): Promise<GeneralPreferences> {
  return getSetting("preferences_general", DEFAULT_GENERAL_PREFERENCES);
}

export async function setGeneralPreferences(
  prefs: GeneralPreferences,
): Promise<void> {
  return setSetting("preferences_general", prefs);
}

export async function getTicketPreferences(): Promise<TicketPreferences> {
  return getSetting("preferences_ticket", DEFAULT_TICKET_PREFERENCES);
}

export async function setTicketPreferences(
  prefs: TicketPreferences,
): Promise<void> {
  return setSetting("preferences_ticket", prefs);
}

export async function getPriceRounding(): Promise<{ type: string }> {
  return getSetting("price_rounding", { type: "none" });
}

export async function setPriceRounding(value: { type: string }): Promise<void> {
  return setSetting("price_rounding", value);
}
