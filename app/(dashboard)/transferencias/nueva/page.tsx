import { NuevaTransferenciaClient } from "@/components/transferencias/nueva-transferencia-client";
import { getOrganizationId } from "@/lib/auth/get-organization";

import { getCachedLocations } from "@/lib/services/locations-cached";

export default async function NuevaTransferenciaPage() {
  const organizationId = await getOrganizationId();
  const locations = await getCachedLocations(organizationId);

  return <NuevaTransferenciaClient locations={locations} />;
}
