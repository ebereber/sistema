import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Loader2 } from "lucide-react";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getFiscalConfig, getFiscalPointsOfSale } from "@/lib/services/fiscal";
import { getOrganization } from "@/lib/services/organization";

import { getCachedPointsOfSale } from "@/lib/services/point-of-sale-cached";
import { ConfiguracionContent } from "./configuracion-content";

export default function ConfiguracionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <ConfiguracionData />
    </Suspense>
  );
}

async function ConfiguracionData() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const [organization, fiscalConfig, fiscalPointsOfSale, pointsOfSale] =
    await Promise.all([
      getOrganization(organizationId),
      getFiscalConfig(organizationId),
      getFiscalPointsOfSale(organizationId),
      getCachedPointsOfSale(organizationId), // Para asegurar que tenemos los datos más recientes de los puntos de venta
    ]);

  return (
    <ConfiguracionContent
      organization={organization}
      fiscalConfig={fiscalConfig}
      fiscalPointsOfSale={fiscalPointsOfSale}
      pointsOfSale={pointsOfSale}
    />
  );
}
