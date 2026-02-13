import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Loader2 } from "lucide-react";

import { requirePermission } from "@/lib/auth/check-permission";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getFiscalConfig, getFiscalPointsOfSale } from "@/lib/services/fiscal";
import { getOrganization } from "@/lib/services/organization";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { getCachedPointsOfSale } from "@/lib/services/point-of-sale-cached";
import { ConfiguracionContent } from "./configuracion-content";

export default async function ConfiguracionPage() {
  await requirePermission("settings:write");
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

  const [organization, fiscalConfig, fiscalPointsOfSale, pointsOfSale, arcaCreds] =
    await Promise.all([
      getOrganization(organizationId),
      getFiscalConfig(organizationId),
      getFiscalPointsOfSale(organizationId),
      getCachedPointsOfSale(organizationId),
      supabaseAdmin
        .from("arca_credentials")
        .select("certificate, private_key")
        .eq("organization_id", organizationId)
        .maybeSingle()
        .then((r) => r.data),
    ]);

  return (
    <ConfiguracionContent
      organization={organization}
      fiscalConfig={fiscalConfig}
      fiscalPointsOfSale={fiscalPointsOfSale}
      pointsOfSale={pointsOfSale}
      hasArcaCredentials={!!(arcaCreds?.certificate && arcaCreds?.private_key)}
    />
  );
}
