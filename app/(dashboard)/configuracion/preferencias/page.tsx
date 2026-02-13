import { requirePermission } from "@/lib/auth/check-permission";
import { PreferenciasClient } from "@/components/configuracion/preferencias-client";
import {
  getGeneralPreferences,
  getPriceRounding,
  getTicketPreferences,
} from "@/lib/services/settings";

export default async function PreferenciasPage() {
  await requirePermission("settings:write");
  const [general, ticket, rounding] = await Promise.all([
    getGeneralPreferences(),
    getTicketPreferences(),
    getPriceRounding(),
  ]);

  return (
    <PreferenciasClient
      initialGeneral={general}
      initialTicket={ticket}
      initialRounding={rounding}
    />
  );
}
