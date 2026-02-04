import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { TurnoDetalleClient } from "@/components/turnos/turno-detalle-client";
import { getServerUser } from "@/lib/auth/get-server-user";
import {
  getCachedShiftActivities,
  getCachedShiftById,
  getCachedShiftSummary,
} from "@/lib/services/shifts-cached";

export default async function TurnoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <TurnoDetalleContent id={id} />
    </Suspense>
  );
}

async function TurnoDetalleContent({ id }: { id: string }) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const shift = await getCachedShiftById(id);
  if (!shift) notFound();

  const [summary, activities] = await Promise.all([
    getCachedShiftSummary(id),
    getCachedShiftActivities(id, shift),
  ]);

  return (
    <TurnoDetalleClient
      shift={shift}
      summary={summary}
      activities={activities}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid gap-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
