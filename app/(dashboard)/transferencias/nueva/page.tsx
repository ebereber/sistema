import { NuevaTransferenciaClient } from "@/components/transferencias/nueva-transferencia-client";
import { getLocations } from "@/lib/services/transfers";

export default async function NuevaTransferenciaPage() {
  const locations = await getLocations();

  return <NuevaTransferenciaClient locations={locations} />;
}
