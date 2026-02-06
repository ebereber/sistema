import { redirect } from "next/navigation";
import { Suspense } from "react";

import { RolesPageClient } from "@/components/configuracion/roles-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedRoles } from "@/lib/services/roles-cached";

export default async function RolesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RolesContent />
    </Suspense>
  );
}

async function RolesContent() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const organizationId = await getOrganizationId();
  const roles = await getCachedRoles(organizationId);

  return <RolesPageClient initialRoles={roles} />;
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
      <Skeleton className="h-10 w-64" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
