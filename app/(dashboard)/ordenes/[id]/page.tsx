import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { OrdenDetalleClient } from "@/components/ordenes/orden-detalle-client";
import { requirePermission } from "@/lib/auth/check-permission";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedPurchaseOrderById } from "@/lib/services/purchase-orders-cached";

export default async function OrdenDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("orders:read");
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <OrdenDetalleContent id={id} />
    </Suspense>
  );
}

async function OrdenDetalleContent({ id }: { id: string }) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const order = await getCachedPurchaseOrderById(organizationId, id);
  if (!order) notFound();

  return <OrdenDetalleClient order={order} />;
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="col-span-2 space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
