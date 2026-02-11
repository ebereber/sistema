import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedAllTreasuryMovements } from "@/lib/services/treasury-cached";
import { getCachedActiveBankAccounts } from "@/lib/services/bank-accounts-cached";
import { getCachedActiveSafeBoxes } from "@/lib/services/safe-boxes-cached";
import { getCachedActiveCashRegisters } from "@/lib/services/shifts-cached";
import {
  MovimientosPageClient,
  type TreasuryAccountOption,
} from "@/components/tesoreria/movimientos-page-client";

export default async function MovimientosPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MovimientosContent />
    </Suspense>
  );
}

async function MovimientosContent() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const [movements, bankAccounts, safeBoxes, cashRegisters] =
    await Promise.all([
      getCachedAllTreasuryMovements(organizationId),
      getCachedActiveBankAccounts(organizationId),
      getCachedActiveSafeBoxes(organizationId),
      getCachedActiveCashRegisters(organizationId),
    ]);

  // Unify accounts for selectors
  const accounts: TreasuryAccountOption[] = [
    ...bankAccounts.map((a) => ({
      id: a.id,
      name: `${a.bank_name} - ${a.account_name}`,
      type: "bank_account" as const,
    })),
    ...safeBoxes.map((a) => ({
      id: a.id,
      name: a.name,
      type: "safe_box" as const,
    })),
    ...cashRegisters.map((a) => ({
      id: a.id,
      name: a.name,
      type: "cash_register" as const,
    })),
  ];

  return (
    <MovimientosPageClient movements={movements} accounts={accounts} />
  );
}

function PageSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-44" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
