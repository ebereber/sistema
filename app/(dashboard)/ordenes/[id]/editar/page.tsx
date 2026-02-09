import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { PurchaseOrderForm } from "@/components/ordenes/purchase-order-form";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedLocations } from "@/lib/services/locations-cached";
import { getCachedPurchaseOrderById } from "@/lib/services/purchase-orders-cached";

export default async function EditarOrdenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <EditarOrdenContent id={id} />
    </Suspense>
  );
}

async function EditarOrdenContent({ id }: { id: string }) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const [order, locations] = await Promise.all([
    getCachedPurchaseOrderById(organizationId, id),
    getCachedLocations(organizationId),
  ]);
  if (!order) notFound();

  if (order.status !== "draft" && order.status !== "confirmed") {
    redirect(`/ordenes/${id}`);
  }

  return <PurchaseOrderForm mode="edit" initialData={order} initialLocations={locations} />;
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
