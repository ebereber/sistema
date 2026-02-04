import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { NuevoPagoForm } from "@/components/pagos/nuevo-pago-form";

export default function NuevoPagoPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <NuevoPagoForm />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
