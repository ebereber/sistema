import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { PagoDetalleClient } from "@/components/pagos/pago-detalle-client";
import { requirePermission } from "@/lib/auth/check-permission";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedSupplierPaymentById } from "@/lib/services/supplier-payments-cached";

export default async function PagoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("purchases:read");
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <PagoDetalleContent id={id} />
    </Suspense>
  );
}

async function PagoDetalleContent({ id }: { id: string }) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const payment = await getCachedSupplierPaymentById(organizationId, id);
  if (!payment) notFound();

  return <PagoDetalleClient payment={payment} />;
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
        <div className="col-span-2 space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </div>
  );
}
