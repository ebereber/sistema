"use server";

import {
  setGeneralPreferences,
  setPriceRounding,
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
