import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";

import { requirePermission } from "@/lib/auth/check-permission";
import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedBankAccounts } from "@/lib/services/bank-accounts-cached";
import { BancosPageClient } from "@/components/configuracion/bancos-page-client";

export default async function BancosPage() {
  await requirePermission("settings:write");
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BancosContent />
    </Suspense>
  );
}

async function BancosContent() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const accounts = await getCachedBankAccounts(organizationId);

  return <BancosPageClient initialAccounts={accounts} />;
}

function PageSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-end">
        <Skeleton className="h-9 w-52" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
