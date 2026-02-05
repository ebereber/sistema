import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ColaboradoresPageClient } from "@/components/configuracion/colaboradores-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerUser } from "@/lib/auth/get-server-user";
import {
  getCachedCollaborators,
  getCachedPendingInvitations,
} from "@/lib/services/collaborators-cached";
import { getCachedLocationsWithRegisters } from "@/lib/services/locations-cached";
import { getCachedRoles } from "@/lib/services/roles-cached";

export default async function ColaboradoresPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ColaboradoresContent />
    </Suspense>
  );
}

async function ColaboradoresContent() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const [collaborators, invitations, roles, locations] = await Promise.all([
    getCachedCollaborators(),
    getCachedPendingInvitations(),
    getCachedRoles(),
    getCachedLocationsWithRegisters(),
  ]);

  return (
    <ColaboradoresPageClient
      initialCollaborators={collaborators}
      initialInvitations={invitations}
      initialRoles={roles}
      locations={locations}
    />
  );
}

/* function PageSkeleton() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
} */

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-26" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
