import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { getServerUser } from "@/lib/auth/get-server-user";
import {
  getCachedCustomerById,
  getCachedCustomerStats,
  getCachedCustomerRecentSales,
} from "@/lib/services/customers-cached";
import { ClienteDetalleClient } from "@/components/clientes/cliente-detalle-client";

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ClienteContent id={id} />
    </Suspense>
  );
}

async function ClienteContent({ id }: { id: string }) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const [customer, stats, recentSales] = await Promise.all([
    getCachedCustomerById(id),
    getCachedCustomerStats(id),
    getCachedCustomerRecentSales(id),
  ]);

  if (!customer) notFound();

  return (
    <ClienteDetalleClient
      customer={customer}
      stats={stats}
      recentSales={recentSales}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-48" />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
