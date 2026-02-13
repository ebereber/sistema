import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { CobranzaDetalleClient } from "@/components/cobranzas/cobranza-detalle-client";
import { requirePermission } from "@/lib/auth/check-permission";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedCustomerPaymentById } from "@/lib/services/customer-payments-cached";

export default async function CobranzaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("sales:read");
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CobranzaDetailContent id={id} />
    </Suspense>
  );
}

async function CobranzaDetailContent({ id }: { id: string }) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const payment = await getCachedCustomerPaymentById(organizationId, id);
  if (!payment) notFound();

  return <CobranzaDetalleClient payment={payment} />;
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
