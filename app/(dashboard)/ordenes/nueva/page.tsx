import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { PurchaseOrderForm } from "@/components/ordenes/purchase-order-form";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedLocations } from "@/lib/services/locations-cached";

export default async function NuevaOrdenPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <NuevaOrdenContent />
    </Suspense>
  );
}

async function NuevaOrdenContent() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const locations = await getCachedLocations(organizationId);

  return <PurchaseOrderForm mode="create" initialLocations={locations} />;
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
