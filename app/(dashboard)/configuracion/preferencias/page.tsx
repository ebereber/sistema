import { PreferenciasClient } from "@/components/configuracion/preferencias-client";
import {
  getGeneralPreferences,
  getPriceRounding,
  getTicketPreferences,
} from "@/lib/services/settings";

export default async function PreferenciasPage() {
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
