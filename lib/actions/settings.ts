"use server";

import { LabelSettings } from "@/components/productos/labels/types";
import {
  setGeneralPreferences,
  setPriceRounding,
  setSetting,
  setTicketPreferences,
  type GeneralPreferences,
  type TicketPreferences,
} from "@/lib/services/settings";
import { revalidateTag } from "next/cache";

export async function saveGeneralPreferencesAction(prefs: GeneralPreferences) {
  await setGeneralPreferences(prefs);
  revalidateTag("settings", "minutes");
}

export async function saveTicketPreferencesAction(prefs: TicketPreferences) {
  await setTicketPreferences(prefs);
  revalidateTag("settings", "minutes");
}

export async function savePriceRoundingAction(value: { type: string }) {
  await setPriceRounding(value);
  revalidateTag("settings", "minutes");
}

export async function saveLabelSettingsAction(settings: LabelSettings) {
  await setSetting("label_settings", settings);
  revalidateTag("settings", "minutes");
}
