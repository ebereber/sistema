import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";

import { requirePermission } from "@/lib/auth/check-permission";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedTreasuryOverview } from "@/lib/services/treasury-cached";
import { TesoreriaPageClient } from "@/components/tesoreria/tesoreria-page-client";

export default async function TesoreriaPage() {
  await requirePermission("treasury:read");
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TesoreriaContent />
    </Suspense>
  );
}

async function TesoreriaContent() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const overview = await getCachedTreasuryOverview(organizationId);

  return <TesoreriaPageClient overview={overview} />;
}

function PageSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-6 w-48" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
