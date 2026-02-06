import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { PresupuestoDetalleClient } from "@/components/presupuestos/presupuesto-detalle-client";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedQuoteById } from "@/lib/services/quotes-cached";

export default async function PresupuestoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <PresupuestoDetalleContent id={id} />
    </Suspense>
  );
}

async function PresupuestoDetalleContent({ id }: { id: string }) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const quote = await getCachedQuoteById(organizationId, id);
  if (!quote) notFound();

  return <PresupuestoDetalleClient quote={quote} />;
}

function LoadingSkeleton() {
  return (
    <div className="flex h-full flex-1 flex-col space-y-6 p-6">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-64" />
      <div className="flex justify-end">
        <Skeleton className="h-32 w-72" />
      </div>
    </div>
  );
}
